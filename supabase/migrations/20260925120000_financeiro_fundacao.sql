-- ═══════════════════════════════════════════════════════════════════════════
-- FRATELLI BARBER CLUB — fundação do sistema financeiro integrado ao atendimento
-- ═══════════════════════════════════════════════════════════════════════════
-- ADITIVA: não apaga nem reescreve dados existentes. Tudo em uma transação
-- (se algo falhar, nada é aplicado). Dinheiro em CENTAVOS (integer).
-- Fuso de negócio: America/Sao_Paulo.
--
-- Fluxo:  appointment ─► appointment_items (preço congelado)
--         ─► complete_appointment() ─► payments ─► financial_entries (receita)
--                                              └─► cash_movements (caixa)
--                                   └─► commissions ─► financial_entries (custo)
-- Regras de integridade ficam no BANCO (constraints, triggers, funções atômicas).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Administração: owner (barber previsto para o futuro)
-- ───────────────────────────────────────────────────────────────────────────
create table public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'barber')),
  staff_id uuid references public.staff (id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- Bootstrap: quem já tem login hoje (o cadastro público está desligado) vira owner.
insert into public.admin_profiles (user_id, role, display_name)
select id, 'owner', email from auth.users
on conflict (user_id) do nothing;

alter table public.admin_profiles enable row level security;
create policy admin_profiles_self_read on public.admin_profiles
  for select to authenticated using (user_id = (select auth.uid()));

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Categorias financeiras e formas de pagamento (administráveis, sem código)
-- ───────────────────────────────────────────────────────────────────────────
create table public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  is_fixed boolean not null default false,          -- despesa fixa × variável
  system_key text unique,                           -- usado pelas funções (não renomear)
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, name)
);

insert into public.financial_categories (kind, name, is_fixed, system_key, display_order) values
  ('income',  'Cortes',       false, 'income_cortes',  1),
  ('income',  'Barbas',       false, 'income_barbas',  2),
  ('income',  'Combos',       false, 'income_combos',  3),
  ('income',  'Produtos',     false, 'income_produtos',4),
  ('income',  'Outros',       false, 'income_other',   5),
  ('expense', 'Aluguel',      true,  null,             1),
  ('expense', 'Energia',      true,  null,             2),
  ('expense', 'Água',         true,  null,             3),
  ('expense', 'Internet',     true,  null,             4),
  ('expense', 'Salários',     true,  null,             5),
  ('expense', 'Impostos',     true,  null,             6),
  ('expense', 'Produtos',     false, null,             7),
  ('expense', 'Equipamentos', false, null,             8),
  ('expense', 'Manutenção',   false, null,             9),
  ('expense', 'Marketing',    false, null,            10),
  ('expense', 'Comissões',    false, 'expense_commissions', 11),
  ('expense', 'Taxas',        false, 'expense_fees',  12),
  ('expense', 'Outros',       false, 'expense_other', 13);

create table public.payment_methods (
  code text primary key,
  name text not null,
  fee_bps integer not null default 0 check (fee_bps between 0 and 10000),  -- taxa em pontos-base (100 = 1%)
  settlement_days integer not null default 0 check (settlement_days >= 0),
  active boolean not null default true,
  display_order integer not null default 0
);
-- Taxas iniciam em ZERO: nenhuma taxa é inventada; o dono configura.
insert into public.payment_methods (code, name, display_order) values
  ('pix', 'Pix', 1), ('cash', 'Dinheiro', 2), ('debit', 'Débito', 3), ('credit', 'Crédito', 4), ('other', 'Outro', 5);

-- serviço → categoria de receita (editável; mapeamento inicial só por nome)
alter table public.services
  add column financial_category_id uuid references public.financial_categories (id) on delete set null;

update public.services set financial_category_id = (select id from public.financial_categories where system_key = 'income_combos')
  where financial_category_id is null and name ilike '%corte%' and name ilike '%barba%';
update public.services set financial_category_id = (select id from public.financial_categories where system_key = 'income_cortes')
  where financial_category_id is null and name ilike '%corte%';
update public.services set financial_category_id = (select id from public.financial_categories where system_key = 'income_barbas')
  where financial_category_id is null and name ilike '%barba%';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Atendimento: novos estados + itens com preço congelado
-- ───────────────────────────────────────────────────────────────────────────
alter table public.appointments drop constraint appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));

alter table public.appointments
  add column completed_at timestamptz,
  add column cancelled_at timestamptz,
  add column cancel_reason text,
  -- v1 não aplica desconto; a coluna existe para não travar a evolução (relaxar o check depois).
  add column discount_cents integer not null default 0 check (discount_cents = 0);

create table public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete restrict,
  service_id uuid references public.services (id) on delete restrict,
  staff_id uuid references public.staff (id) on delete restrict,   -- profissional do item (pode diferir do atendimento)
  description text not null,                                       -- nome congelado
  unit_price_cents integer not null check (unit_price_cents >= 0), -- preço congelado
  quantity integer not null default 1 check (quantity > 0),
  total_cents integer generated always as (unit_price_cents * quantity) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointment_items_appointment_idx on public.appointment_items (appointment_id);
create trigger set_updated_at before update on public.appointment_items
  for each row execute function public.set_updated_at();

-- Todo agendamento nasce com 1 item (o serviço reservado, com o preço DAQUELE momento).
-- O fluxo público de agendamento não muda: o item é criado pelo banco.
create or replace function public.appointments_create_item()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare s public.services;
begin
  select * into s from public.services where id = new.service_id;
  insert into public.appointment_items (appointment_id, service_id, staff_id, description, unit_price_cents, quantity)
  values (new.id, new.service_id, new.staff_id, s.name, round(s.price * 100)::integer, 1);
  return new;
end;
$$;
create trigger appointments_create_item after insert on public.appointments
  for each row execute function public.appointments_create_item();

-- backfill dos agendamentos que já existem
insert into public.appointment_items (appointment_id, service_id, staff_id, description, unit_price_cents, quantity)
select a.id, a.service_id, a.staff_id, s.name, round(s.price * 100)::integer, 1
from public.appointments a
join public.services s on s.id = a.service_id
where not exists (select 1 from public.appointment_items i where i.appointment_id = a.id);

-- Itens de atendimento concluído são imutáveis.
create or replace function public.appointment_items_guard()
returns trigger
language plpgsql
as $$
declare v_status text;
begin
  select status into v_status from public.appointments where id = coalesce(new.appointment_id, old.appointment_id);
  if v_status = 'completed' then
    raise exception 'completed_appointment_items_are_immutable' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger appointment_items_guard before insert or update or delete on public.appointment_items
  for each row execute function public.appointment_items_guard();

-- Guarda do atendimento: "concluído" só via complete_appointment(); concluído é imutável;
-- não se cancela/marca falta de atendimento que já tem pagamento (use estorno).
-- (a checagem de pagamentos existe abaixo, depois da criação de public.payments)

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Caixa (turno) e formas de recebimento
-- ───────────────────────────────────────────────────────────────────────────
create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  opened_by uuid,
  opening_balance_cents integer not null default 0 check (opening_balance_cents >= 0),
  closed_at timestamptz,
  closed_by uuid,
  expected_cash_cents integer,
  counted_cash_cents integer check (counted_cash_cents >= 0),
  difference_cents integer,
  notes text,
  constraint cash_registers_closed_complete check (
    status = 'open' or (closed_at is not null and counted_cash_cents is not null and expected_cash_cents is not null)
  )
);
-- no máximo UM caixa aberto por vez
create unique index cash_registers_one_open on public.cash_registers ((true)) where status = 'open';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete restrict,
  client_id uuid references public.clients (id) on delete restrict,
  kind text not null default 'payment' check (kind in ('payment', 'refund')),
  reversal_of uuid references public.payments (id) on delete restrict,   -- refund aponta o pagamento original
  method text not null references public.payment_methods (code),
  amount_cents integer not null check (amount_cents > 0),                -- bruto
  fee_cents integer not null default 0 check (fee_cents >= 0 and fee_cents <= amount_cents),
  net_cents integer generated always as (amount_cents - fee_cents) stored, -- líquido
  paid_at timestamptz not null default now(),
  cash_register_id uuid references public.cash_registers (id) on delete restrict,
  idempotency_key text,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint payments_refund_has_origin check ((kind = 'refund') = (reversal_of is not null)),
  constraint payments_refund_has_reason check (kind = 'payment' or length(trim(coalesce(reason, ''))) > 0)
);
create unique index payments_idempotency_key_uidx on public.payments (idempotency_key) where idempotency_key is not null;
create unique index payments_one_refund_per_payment on public.payments (reversal_of) where kind = 'refund';
create index payments_appointment_idx on public.payments (appointment_id);
create index payments_paid_at_idx on public.payments (paid_at);

-- guardas do atendimento (agora que payments existe)
create or replace function public.appointments_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status = 'completed' and old.status is distinct from 'completed'
       and coalesce(current_setting('app.finance_op', true), '') <> 'complete' then
      raise exception 'complete_appointment_required' using errcode = 'P0001';
    end if;

    if old.status = 'completed' then
      if new.status <> 'completed'
         or new.client_id <> old.client_id or new.service_id <> old.service_id
         or new.staff_id <> old.staff_id
         or new.starts_at <> old.starts_at or new.ends_at <> old.ends_at then
        raise exception 'completed_appointment_is_immutable' using errcode = 'P0001';
      end if;
    end if;

    if new.status in ('cancelled', 'no_show') and old.status is distinct from new.status
       and exists (select 1 from public.payments p where p.appointment_id = old.id) then
      raise exception 'appointment_has_payments' using errcode = 'P0001';
    end if;

    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;
  end if;
  return new;
end;
$$;
create trigger appointments_guard before update on public.appointments
  for each row execute function public.appointments_guard();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Lançamentos (competência) — receitas e despesas
-- ───────────────────────────────────────────────────────────────────────────
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff (id) on delete cascade,      -- null = qualquer profissional
  service_id uuid references public.services (id) on delete cascade, -- null = qualquer serviço
  rate_bps integer not null check (rate_bps between 0 and 10000),    -- 4000 = 40%
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- Nenhuma regra é criada aqui: o percentual é decisão do dono.
create unique index commission_rules_scope_uidx on public.commission_rules
  (coalesce(staff_id, '00000000-0000-0000-0000-000000000000'), coalesce(service_id, '00000000-0000-0000-0000-000000000000'))
  where active;

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category_id uuid not null references public.financial_categories (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  day_of_month integer not null check (day_of_month between 1 and 28),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  appointment_item_id uuid not null unique references public.appointment_items (id) on delete restrict,
  staff_id uuid not null references public.staff (id) on delete restrict,
  base_cents integer not null check (base_cents >= 0),
  rate_bps integer not null check (rate_bps between 0 and 10000),   -- regra congelada
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  entry_id uuid,                                                     -- lançamento de custo (FK abaixo)
  created_at timestamptz not null default now()
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  category_id uuid not null references public.financial_categories (id) on delete restrict,
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  competence_date date not null,                 -- data do serviço / do fato gerador
  due_on date,                                   -- vencimento (despesas)
  status text not null,
  paid_at timestamptz,
  payment_method text references public.payment_methods (code),
  -- rastreabilidade da origem
  appointment_id uuid references public.appointments (id) on delete restrict,
  appointment_item_id uuid references public.appointment_items (id) on delete restrict,
  commission_id uuid references public.commissions (id) on delete restrict,
  recurring_expense_id uuid references public.recurring_expenses (id) on delete restrict,
  recurring_month date,
  client_id uuid references public.clients (id) on delete restrict,
  staff_id uuid references public.staff (id) on delete restrict,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_entries_status_by_kind check (
    (kind = 'income'  and status in ('recognized', 'cancelled')) or
    (kind = 'expense' and status in ('pending', 'paid', 'cancelled'))
  ),
  constraint financial_entries_paid_has_date check (status <> 'paid' or paid_at is not null),
  constraint financial_entries_recurring_pair check ((recurring_expense_id is null) = (recurring_month is null))
);
create trigger set_updated_at before update on public.financial_entries
  for each row execute function public.set_updated_at();
alter table public.commissions
  add constraint commissions_entry_fk foreign key (entry_id) references public.financial_entries (id) on delete restrict;

-- NÃO DUPLICA: uma receita por item; um custo por comissão; uma despesa recorrente por mês.
create unique index financial_entries_one_income_per_item on public.financial_entries (appointment_item_id)
  where kind = 'income' and appointment_item_id is not null and status <> 'cancelled';
create unique index financial_entries_one_entry_per_commission on public.financial_entries (commission_id)
  where commission_id is not null and status <> 'cancelled';
create unique index financial_entries_one_per_recurring_month on public.financial_entries (recurring_expense_id, recurring_month)
  where recurring_expense_id is not null;
create index financial_entries_competence_idx on public.financial_entries (competence_date);
create index financial_entries_status_idx on public.financial_entries (kind, status);

-- Movimentos de CAIXA (entrada/saída efetiva de dinheiro), separados da competência.
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid references public.cash_registers (id) on delete restrict,
  direction text not null check (direction in ('in', 'out')),
  amount_cents integer not null check (amount_cents > 0),
  method text not null references public.payment_methods (code),
  occurred_at timestamptz not null default now(),
  source text not null check (source in ('payment', 'refund', 'expense', 'manual', 'adjustment')),
  payment_id uuid unique references public.payments (id) on delete restrict,   -- 1 movimento por pagamento
  entry_id uuid references public.financial_entries (id) on delete restrict,
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  -- dinheiro em espécie só existe dentro de um caixa aberto
  constraint cash_movements_cash_needs_register check (method <> 'cash' or cash_register_id is not null),
  constraint cash_movements_manual_needs_description check (source not in ('manual', 'adjustment') or length(trim(coalesce(description, ''))) > 0)
);
create unique index cash_movements_one_per_expense on public.cash_movements (entry_id) where source = 'expense';
create index cash_movements_occurred_idx on public.cash_movements (occurred_at);
create index cash_movements_register_idx on public.cash_movements (cash_register_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Auditoria (somente acréscimo) e proteção contra apagar/alterar histórico
-- ───────────────────────────────────────────────────────────────────────────
create table public.audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_email text,
  action text not null,               -- INSERT | UPDATE | DELETE
  entity text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index audit_logs_at_idx on public.audit_logs (at desc);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_email text;
begin
  select email into v_email from auth.users where id = (select auth.uid());
  insert into public.audit_logs (actor, actor_email, action, entity, entity_id, old_data, new_data)
  values (
    (select auth.uid()), v_email, tg_op, tg_table_name, v_row ->> coalesce(tg_argv[0], 'id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.forbid_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'financial_history_is_immutable: use cancelamento, estorno ou ajuste (tabela %)', tg_table_name
    using errcode = 'P0001';
end;
$$;

-- registros financeiros nunca são apagados; pagamentos e movimentos nunca são editados;
-- a própria auditoria é somente de acréscimo.
create trigger forbid_delete before delete on public.payments for each row execute function public.forbid_change();
create trigger forbid_update before update on public.payments for each row execute function public.forbid_change();
create trigger forbid_delete before delete on public.financial_entries for each row execute function public.forbid_change();
create trigger forbid_delete before delete on public.cash_movements for each row execute function public.forbid_change();
create trigger forbid_update before update on public.cash_movements for each row execute function public.forbid_change();
create trigger forbid_delete before delete on public.cash_registers for each row execute function public.forbid_change();
create trigger forbid_delete before delete on public.commissions for each row execute function public.forbid_change();
create trigger forbid_update before update on public.audit_logs for each row execute function public.forbid_change();
create trigger forbid_delete before delete on public.audit_logs for each row execute function public.forbid_change();

-- lançamentos: guardas de valor/estado (edição só de despesa pendente; pago é definitivo)
create or replace function public.financial_entries_guard()
returns trigger
language plpgsql
as $$
declare v_op text := coalesce(current_setting('app.finance_op', true), '');
        v_cat_kind text;
begin
  select kind into v_cat_kind from public.financial_categories where id = new.category_id;
  if v_cat_kind is distinct from new.kind then
    raise exception 'category_kind_mismatch' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    -- lançamento "pago" só nasce dentro das funções financeiras (que geram o movimento de caixa)
    if new.status = 'paid' and v_op not in ('complete', 'payment', 'pay') then
      raise exception 'paid_entry_requires_finance_function' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if old.status = 'cancelled' then
    raise exception 'cancelled_entry_is_immutable' using errcode = 'P0001';
  end if;
  if old.status = 'paid' and (new.status <> 'paid' or new.amount_cents <> old.amount_cents
       or new.paid_at is distinct from old.paid_at or new.payment_method is distinct from old.payment_method) then
    raise exception 'paid_entry_is_immutable' using errcode = 'P0001';
  end if;
  if old.kind = 'income' and new.amount_cents <> old.amount_cents then
    raise exception 'income_amount_is_immutable' using errcode = 'P0001';
  end if;
  if new.status = 'paid' and old.status <> 'paid' and v_op <> 'pay' then
    raise exception 'paid_entry_requires_finance_function' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger financial_entries_guard before insert or update on public.financial_entries
  for each row execute function public.financial_entries_guard();

-- auditoria automática
create trigger audit after insert or update or delete on public.appointment_items for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.payments for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.financial_entries for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.cash_registers for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.cash_movements for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.commissions for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.commission_rules for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.recurring_expenses for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.payment_methods for each row execute function public.audit_row('code');
create trigger audit after insert or update or delete on public.financial_categories for each row execute function public.audit_row();
create trigger audit after update or delete on public.appointments for each row execute function public.audit_row();

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Visões (contas a receber/pagar são ESTADO derivado, não tabelas duplicadas)
-- ───────────────────────────────────────────────────────────────────────────
create view public.v_appointment_balances with (security_invoker = true) as
select
  a.id as appointment_id, a.client_id, a.staff_id, a.status,
  (a.starts_at at time zone 'America/Sao_Paulo')::date as service_date,
  coalesce(i.total, 0)::integer as total_cents,
  coalesce(p.paid, 0)::integer as paid_cents,
  (coalesce(i.total, 0) - coalesce(p.paid, 0))::integer as outstanding_cents
from public.appointments a
left join lateral (select sum(total_cents) as total from public.appointment_items where appointment_id = a.id) i on true
left join lateral (
  select sum(case when kind = 'payment' then amount_cents else -amount_cents end) as paid
  from public.payments where appointment_id = a.id
) p on true;

create view public.v_accounts_receivable with (security_invoker = true) as
select b.appointment_id, b.client_id, c.name as client_name, b.service_date,
       b.total_cents, b.paid_cents, b.outstanding_cents
from public.v_appointment_balances b
join public.clients c on c.id = b.client_id
where b.status = 'completed' and b.outstanding_cents > 0;

create view public.v_accounts_payable with (security_invoker = true) as
select e.id, e.description, e.amount_cents, e.due_on, e.competence_date, e.category_id, c.name as category_name,
       (e.due_on is not null and e.due_on < (now() at time zone 'America/Sao_Paulo')::date) as overdue
from public.financial_entries e
join public.financial_categories c on c.id = e.category_id
where e.kind = 'expense' and e.status = 'pending';

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Funções (atômicas, só para o owner)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fin_require_owner()
returns void
language plpgsql
stable
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.appointment_financial_state(p_appointment_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'appointment_id', b.appointment_id, 'status', b.status,
    'total_cents', b.total_cents, 'paid_cents', b.paid_cents, 'outstanding_cents', b.outstanding_cents
  ) from public.v_appointment_balances b where b.appointment_id = p_appointment_id;
$$;

-- registra 1 pagamento + seu movimento de caixa (+ custo da taxa, se houver). Uso interno.
create or replace function public.fin_insert_payment(
  p_appointment_id uuid, p_client_id uuid, p_method text, p_amount_cents integer,
  p_key text, p_competence date, p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pm public.payment_methods;
  v_reg uuid;
  v_fee integer;
  v_pid uuid;
  v_fee_cat uuid;
begin
  select * into v_pm from public.payment_methods where code = p_method and active;
  if not found then raise exception 'invalid_payment_method' using errcode = 'P0001'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;

  select id into v_reg from public.cash_registers where status = 'open';
  if p_method = 'cash' and v_reg is null then raise exception 'cash_register_required' using errcode = 'P0001'; end if;

  v_fee := round(p_amount_cents::numeric * v_pm.fee_bps / 10000)::integer;

  insert into public.payments (appointment_id, client_id, kind, method, amount_cents, fee_cents, cash_register_id, idempotency_key, created_by)
  values (p_appointment_id, p_client_id, 'payment', p_method, p_amount_cents, v_fee, v_reg, p_key, (select auth.uid()))
  returning id into v_pid;

  -- o que entra no caixa é o LÍQUIDO
  insert into public.cash_movements (cash_register_id, direction, amount_cents, method, source, payment_id, description, created_by)
  values (v_reg, 'in', p_amount_cents - v_fee, p_method, 'payment', v_pid, p_description, (select auth.uid()));

  if v_fee > 0 then
    select id into v_fee_cat from public.financial_categories where system_key = 'expense_fees';
    insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status, paid_at, payment_method,
                                          appointment_id, client_id, created_by)
    values ('expense', v_fee_cat, 'Taxa ' || v_pm.name, v_fee, p_competence, 'paid', now(), p_method, p_appointment_id, p_client_id, (select auth.uid()));
  end if;
  return v_pid;
end;
$$;

create or replace function public.complete_appointment(
  p_appointment_id uuid,
  p_payments jsonb default '[]'::jsonb,       -- [{"method":"pix","amount_cents":5000}, ...]
  p_allow_partial boolean default false,      -- true: o que faltar vira conta a receber
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.appointments;
  v_total integer;
  v_paid integer := 0;
  v_pay jsonb;
  v_idx integer := 0;
  v_amount integer;
  v_local_date date;
  v_item record;
  v_cat uuid;
  v_entry uuid;
  v_rule public.commission_rules;
  v_comm_amount integer;
  v_comm uuid;
  v_comm_cat uuid;
  v_uid uuid := (select auth.uid());
begin
  perform public.fin_require_owner();

  select * into a from public.appointments where id = p_appointment_id for update;   -- serializa retries e duplo clique
  if not found then raise exception 'appointment_not_found' using errcode = 'P0001'; end if;

  if a.status = 'completed' then
    -- retry com a mesma chave: devolve o resultado sem duplicar nada
    if p_idempotency_key is not null and exists (
         select 1 from public.payments where appointment_id = a.id and idempotency_key like p_idempotency_key || ':%') then
      return public.appointment_financial_state(a.id) || jsonb_build_object('idempotent', true);
    end if;
    raise exception 'already_completed' using errcode = 'P0001';
  end if;
  if a.status not in ('pending', 'confirmed', 'in_progress') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  select coalesce(sum(total_cents), 0) into v_total from public.appointment_items where appointment_id = a.id;
  if v_total <= 0 then raise exception 'no_items' using errcode = 'P0001'; end if;

  if jsonb_typeof(p_payments) is distinct from 'array' then raise exception 'invalid_payments' using errcode = 'P0001'; end if;
  for v_pay in select value from jsonb_array_elements(p_payments) loop
    if coalesce(v_pay ->> 'amount_cents', '') !~ '^[0-9]+$' then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
    v_paid := v_paid + (v_pay ->> 'amount_cents')::integer;
  end loop;
  if v_paid > v_total then raise exception 'overpayment' using errcode = 'P0001'; end if;
  if v_paid < v_total and not p_allow_partial then raise exception 'payment_mismatch' using errcode = 'P0001'; end if;
  if v_paid = 0 and not p_allow_partial then raise exception 'payment_mismatch' using errcode = 'P0001'; end if;

  v_local_date := (a.starts_at at time zone 'America/Sao_Paulo')::date;
  perform set_config('app.finance_op', 'complete', true);

  -- RECEITA: uma por item (rastreável até o atendimento)
  select id into v_comm_cat from public.financial_categories where system_key = 'expense_commissions';
  for v_item in
    select i.*, s.financial_category_id as svc_cat
    from public.appointment_items i left join public.services s on s.id = i.service_id
    where i.appointment_id = a.id order by i.created_at, i.id
  loop
    v_cat := coalesce(v_item.svc_cat, (select id from public.financial_categories where system_key = 'income_other'));
    insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status,
                                          appointment_id, appointment_item_id, client_id, staff_id, created_by)
    values ('income', v_cat, v_item.description || case when v_item.quantity > 1 then ' x' || v_item.quantity else '' end,
            v_item.total_cents, v_local_date, 'recognized', a.id, v_item.id, a.client_id, coalesce(v_item.staff_id, a.staff_id), v_uid);

    -- COMISSÃO (só se o dono configurou uma regra): custo reconhecido, a pagar
    select r.* into v_rule from public.commission_rules r
    where r.active
      and (r.staff_id is null or r.staff_id = coalesce(v_item.staff_id, a.staff_id))
      and (r.service_id is null or r.service_id = v_item.service_id)
    order by (r.staff_id is not null and r.service_id is not null) desc, (r.staff_id is not null) desc, (r.service_id is not null) desc
    limit 1;
    if found and v_rule.rate_bps > 0 then
      v_comm_amount := round(v_item.total_cents::numeric * v_rule.rate_bps / 10000)::integer;
      if v_comm_amount > 0 then
        insert into public.commissions (appointment_item_id, staff_id, base_cents, rate_bps, amount_cents)
        values (v_item.id, coalesce(v_item.staff_id, a.staff_id), v_item.total_cents, v_rule.rate_bps, v_comm_amount)
        returning id into v_comm;
        insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status,
                                              appointment_id, commission_id, staff_id, created_by)
        values ('expense', v_comm_cat, 'Comissão — ' || v_item.description, v_comm_amount, v_local_date, 'pending',
                a.id, v_comm, coalesce(v_item.staff_id, a.staff_id), v_uid)
        returning id into v_entry;
        update public.commissions set entry_id = v_entry where id = v_comm;
      end if;
    end if;
  end loop;

  -- PAGAMENTOS + CAIXA
  for v_pay in select value from jsonb_array_elements(p_payments) loop
    v_idx := v_idx + 1;
    perform public.fin_insert_payment(
      a.id, a.client_id, v_pay ->> 'method', (v_pay ->> 'amount_cents')::integer,
      case when p_idempotency_key is null then null else p_idempotency_key || ':' || v_idx end,
      v_local_date, 'Atendimento ' || left(a.id::text, 8));
  end loop;

  update public.appointments set status = 'completed', completed_at = now() where id = a.id;
  perform set_config('app.finance_op', '', true);
  return public.appointment_financial_state(a.id);
end;
$$;

create or replace function public.record_payment(
  p_appointment_id uuid, p_method text, p_amount_cents integer, p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare a public.appointments; v_out integer;
begin
  perform public.fin_require_owner();
  select * into a from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'appointment_not_found' using errcode = 'P0001'; end if;
  if a.status <> 'completed' then raise exception 'appointment_not_completed' using errcode = 'P0001'; end if;

  if p_idempotency_key is not null and exists (select 1 from public.payments where idempotency_key = p_idempotency_key) then
    return public.appointment_financial_state(a.id) || jsonb_build_object('idempotent', true);
  end if;

  select outstanding_cents into v_out from public.v_appointment_balances where appointment_id = a.id;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if p_amount_cents > v_out then raise exception 'overpayment' using errcode = 'P0001'; end if;

  perform set_config('app.finance_op', 'payment', true);
  perform public.fin_insert_payment(a.id, a.client_id, p_method, p_amount_cents, p_idempotency_key,
                                    (a.starts_at at time zone 'America/Sao_Paulo')::date, 'Recebimento ' || left(a.id::text, 8));
  perform set_config('app.finance_op', '', true);
  return public.appointment_financial_state(a.id);
end;
$$;

create or replace function public.refund_payment(p_payment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare p public.payments; v_reg uuid; v_rid uuid;
begin
  perform public.fin_require_owner();
  select * into p from public.payments where id = p_payment_id for update;
  if not found or p.kind <> 'payment' then raise exception 'payment_not_found' using errcode = 'P0001'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'reason_required' using errcode = 'P0001'; end if;

  select id into v_reg from public.cash_registers where status = 'open';
  if p.method = 'cash' and v_reg is null then raise exception 'cash_register_required' using errcode = 'P0001'; end if;

  insert into public.payments (appointment_id, client_id, kind, reversal_of, method, amount_cents, fee_cents, cash_register_id, reason, created_by)
  values (p.appointment_id, p.client_id, 'refund', p.id, p.method, p.amount_cents, 0, v_reg, p_reason, (select auth.uid()))
  returning id into v_rid;      -- (índice único: 1 estorno por pagamento)

  insert into public.cash_movements (cash_register_id, direction, amount_cents, method, source, payment_id, description, created_by)
  values (v_reg, 'out', p.amount_cents, p.method, 'refund', v_rid, 'Estorno: ' || p_reason, (select auth.uid()));
  return jsonb_build_object('refund_id', v_rid);
end;
$$;

create or replace function public.open_cash_register(p_opening_balance_cents integer default 0)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  perform public.fin_require_owner();
  if p_opening_balance_cents is null or p_opening_balance_cents < 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if exists (select 1 from public.cash_registers where status = 'open') then raise exception 'cash_register_already_open' using errcode = 'P0001'; end if;
  insert into public.cash_registers (opened_by, opening_balance_cents) values ((select auth.uid()), p_opening_balance_cents) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.close_cash_register(p_counted_cents integer, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare r public.cash_registers; v_in integer; v_out integer; v_exp integer;
begin
  perform public.fin_require_owner();
  select * into r from public.cash_registers where status = 'open' for update;
  if not found then raise exception 'no_open_cash_register' using errcode = 'P0001'; end if;
  if p_counted_cents is null or p_counted_cents < 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;

  select coalesce(sum(amount_cents) filter (where direction = 'in'), 0), coalesce(sum(amount_cents) filter (where direction = 'out'), 0)
    into v_in, v_out from public.cash_movements where cash_register_id = r.id and method = 'cash';
  v_exp := r.opening_balance_cents + v_in - v_out;

  update public.cash_registers
     set status = 'closed', closed_at = now(), closed_by = (select auth.uid()),
         expected_cash_cents = v_exp, counted_cash_cents = p_counted_cents,
         difference_cents = p_counted_cents - v_exp, notes = p_notes
   where id = r.id;
  return jsonb_build_object('cash_register_id', r.id, 'opening_cents', r.opening_balance_cents, 'cash_in_cents', v_in,
                            'cash_out_cents', v_out, 'expected_cents', v_exp, 'counted_cents', p_counted_cents,
                            'difference_cents', p_counted_cents - v_exp);
end;
$$;

-- entrada/saída manual de caixa e ajustes (sempre com descrição; nunca apaga histórico)
create or replace function public.add_cash_movement(
  p_direction text, p_amount_cents integer, p_description text,
  p_method text default 'cash', p_source text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_reg uuid; v_id uuid;
begin
  perform public.fin_require_owner();
  if p_direction not in ('in', 'out') then raise exception 'invalid_direction' using errcode = 'P0001'; end if;
  if p_source not in ('manual', 'adjustment') then raise exception 'invalid_source' using errcode = 'P0001'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  select id into v_reg from public.cash_registers where status = 'open';
  if p_method = 'cash' and v_reg is null then raise exception 'cash_register_required' using errcode = 'P0001'; end if;
  insert into public.cash_movements (cash_register_id, direction, amount_cents, method, source, description, created_by)
  values (v_reg, p_direction, p_amount_cents, p_method, p_source, p_description, (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

-- paga uma despesa (só aqui o caixa reduz); mesma chamada duas vezes NÃO duplica
create or replace function public.pay_expense(p_entry_id uuid, p_method text, p_paid_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare e public.financial_entries; v_reg uuid;
begin
  perform public.fin_require_owner();
  select * into e from public.financial_entries where id = p_entry_id for update;
  if not found or e.kind <> 'expense' then raise exception 'expense_not_found' using errcode = 'P0001'; end if;
  if e.status = 'paid' then raise exception 'already_paid' using errcode = 'P0001'; end if;
  if e.status = 'cancelled' then raise exception 'entry_cancelled' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.payment_methods where code = p_method and active) then raise exception 'invalid_payment_method' using errcode = 'P0001'; end if;

  select id into v_reg from public.cash_registers where status = 'open';
  if p_method = 'cash' and v_reg is null then raise exception 'cash_register_required' using errcode = 'P0001'; end if;

  perform set_config('app.finance_op', 'pay', true);
  update public.financial_entries set status = 'paid', paid_at = coalesce(p_paid_at, now()), payment_method = p_method where id = e.id;
  insert into public.cash_movements (cash_register_id, direction, amount_cents, method, source, entry_id, description, created_by)
  values (v_reg, 'out', e.amount_cents, p_method, 'expense', e.id, e.description, (select auth.uid()));
  if e.commission_id is not null then update public.commissions set status = 'paid' where id = e.commission_id; end if;
  perform set_config('app.finance_op', '', true);
  return jsonb_build_object('entry_id', e.id, 'paid_cents', e.amount_cents);
end;
$$;

-- despesas recorrentes: geração idempotente (1 por modelo por mês)
create or replace function public.generate_recurring_expenses(p_month date default (now() at time zone 'America/Sao_Paulo')::date)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_first date := date_trunc('month', p_month)::date; v_n integer;
begin
  perform public.fin_require_owner();
  insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, due_on, status,
                                        recurring_expense_id, recurring_month, created_by)
  select 'expense', r.category_id, r.description, r.amount_cents, v_first, (v_first + (r.day_of_month - 1)), 'pending',
         r.id, v_first, (select auth.uid())
  from public.recurring_expenses r
  where r.active and r.starts_on < (v_first + interval '1 month')::date
    and (r.ends_on is null or r.ends_on >= v_first)
  on conflict (recurring_expense_id, recurring_month) where recurring_expense_id is not null do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Consultas de dashboard e relatórios (invoker: a RLS de owner se aplica)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.finance_summary(p_from date, p_to date)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'revenue_cents',   coalesce((select sum(amount_cents) from public.financial_entries
                                  where kind = 'income' and status <> 'cancelled' and competence_date between p_from and p_to), 0),
    'expenses_cents',  coalesce((select sum(amount_cents) from public.financial_entries
                                  where kind = 'expense' and status <> 'cancelled' and competence_date between p_from and p_to), 0),
    'result_cents',    coalesce((select sum(case when kind = 'income' then amount_cents else -amount_cents end) from public.financial_entries
                                  where status <> 'cancelled' and competence_date between p_from and p_to), 0),
    'cash_in_cents',   coalesce((select sum(amount_cents) from public.cash_movements
                                  where direction = 'in' and (occurred_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'cash_out_cents',  coalesce((select sum(amount_cents) from public.cash_movements
                                  where direction = 'out' and (occurred_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'receivable_cents', coalesce((select sum(outstanding_cents) from public.v_accounts_receivable), 0),
    'payable_cents',   coalesce((select sum(amount_cents) from public.v_accounts_payable), 0),
    'overdue_payable_cents', coalesce((select sum(amount_cents) from public.v_accounts_payable where overdue), 0),
    'appointments_completed', (select count(*) from public.appointments where status = 'completed'
                                and (starts_at at time zone 'America/Sao_Paulo')::date between p_from and p_to),
    'appointments_no_show', (select count(*) from public.appointments where status = 'no_show'
                                and (starts_at at time zone 'America/Sao_Paulo')::date between p_from and p_to),
    'appointments_cancelled', (select count(*) from public.appointments where status = 'cancelled'
                                and (starts_at at time zone 'America/Sao_Paulo')::date between p_from and p_to)
  );
$$;

create or replace function public.cash_flow(p_from date, p_to date)
returns jsonb
language sql
stable
as $$
  with mv as (
    select (occurred_at at time zone 'America/Sao_Paulo')::date as d, direction, amount_cents from public.cash_movements
  )
  select jsonb_build_object(
    'opening_cents', coalesce((select sum(case when direction = 'in' then amount_cents else -amount_cents end) from mv where d < p_from), 0),
    'in_cents',      coalesce((select sum(amount_cents) from mv where direction = 'in'  and d between p_from and p_to), 0),
    'out_cents',     coalesce((select sum(amount_cents) from mv where direction = 'out' and d between p_from and p_to), 0),
    'closing_cents', coalesce((select sum(case when direction = 'in' then amount_cents else -amount_cents end) from mv where d <= p_to), 0),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'in_cents', i, 'out_cents', o) order by d)
               from (select d, sum(amount_cents) filter (where direction = 'in') as i, sum(amount_cents) filter (where direction = 'out') as o
                     from mv where d between p_from and p_to group by d) x), '[]'::jsonb)
  );
$$;

create or replace function public.report_by_service(p_from date, p_to date)
returns table (service_name text, quantity bigint, revenue_cents bigint, avg_ticket_cents bigint)
language sql
stable
as $$
  select i.description, sum(i.quantity)::bigint, sum(e.amount_cents)::bigint,
         (sum(e.amount_cents) / nullif(sum(i.quantity), 0))::bigint
  from public.financial_entries e
  join public.appointment_items i on i.id = e.appointment_item_id
  where e.kind = 'income' and e.status <> 'cancelled' and e.competence_date between p_from and p_to
  group by i.description
  order by 2 desc, 3 desc;
$$;

create or replace function public.report_by_staff(p_from date, p_to date)
returns table (staff_id uuid, staff_name text, appointments bigint, revenue_cents bigint, commission_cents bigint, avg_ticket_cents bigint)
language sql
stable
as $$
  select e.staff_id, st.name, count(distinct e.appointment_id)::bigint, sum(e.amount_cents)::bigint,
         coalesce((select sum(c.amount_cents) from public.commissions c
                    join public.appointment_items ci on ci.id = c.appointment_item_id
                    join public.financial_entries ce on ce.appointment_item_id = ci.id and ce.kind = 'income'
                   where c.staff_id = e.staff_id and c.status <> 'cancelled'
                     and ce.competence_date between p_from and p_to), 0)::bigint,
         (sum(e.amount_cents) / nullif(count(distinct e.appointment_id), 0))::bigint
  from public.financial_entries e
  left join public.staff st on st.id = e.staff_id
  where e.kind = 'income' and e.status <> 'cancelled' and e.competence_date between p_from and p_to
  group by e.staff_id, st.name
  order by 4 desc;
$$;

create or replace function public.report_by_method(p_from date, p_to date)
returns table (method text, payments bigint, gross_cents bigint, fee_cents bigint, net_cents bigint, refunded_cents bigint)
language sql
stable
as $$
  select p.method,
         count(*) filter (where p.kind = 'payment')::bigint,
         coalesce(sum(p.amount_cents) filter (where p.kind = 'payment'), 0)::bigint,
         coalesce(sum(p.fee_cents) filter (where p.kind = 'payment'), 0)::bigint,
         coalesce(sum(p.net_cents) filter (where p.kind = 'payment'), 0)::bigint,
         coalesce(sum(p.amount_cents) filter (where p.kind = 'refund'), 0)::bigint
  from public.payments p
  where (p.paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
  group by p.method
  order by 3 desc;
$$;

create or replace function public.report_by_client(p_from date, p_to date)
returns table (client_id uuid, client_name text, visits bigint, revenue_cents bigint, avg_ticket_cents bigint, last_visit date, is_returning boolean)
language sql
stable
as $$
  select e.client_id, c.name, count(distinct e.appointment_id)::bigint, sum(e.amount_cents)::bigint,
         (sum(e.amount_cents) / nullif(count(distinct e.appointment_id), 0))::bigint, max(e.competence_date),
         (count(distinct e.appointment_id) > 1 or exists (
            select 1 from public.financial_entries x where x.client_id = e.client_id and x.kind = 'income'
              and x.status <> 'cancelled' and x.competence_date < p_from))
  from public.financial_entries e
  join public.clients c on c.id = e.client_id
  where e.kind = 'income' and e.status <> 'cancelled' and e.competence_date between p_from and p_to
  group by e.client_id, c.name
  order by 4 desc;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. RLS — nada disto é acessível a anônimos; só o owner lê/escreve
-- ───────────────────────────────────────────────────────────────────────────
alter table public.financial_categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.appointment_items enable row level security;
alter table public.cash_registers enable row level security;
alter table public.payments enable row level security;
alter table public.commission_rules enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.commissions enable row level security;
alter table public.financial_entries enable row level security;
alter table public.cash_movements enable row level security;
alter table public.audit_logs enable row level security;

-- configuração (owner lê e edita)
create policy fin_categories_owner_read   on public.financial_categories for select to authenticated using (public.is_owner());
create policy fin_categories_owner_insert on public.financial_categories for insert to authenticated with check (public.is_owner());
create policy fin_categories_owner_update on public.financial_categories for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy pay_methods_owner_read      on public.payment_methods for select to authenticated using (public.is_owner());
create policy pay_methods_owner_update    on public.payment_methods for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy commission_rules_owner_all  on public.commission_rules for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy recurring_owner_all         on public.recurring_expenses for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- itens do atendimento: owner edita enquanto o atendimento não foi concluído (o gatilho garante)
create policy appointment_items_owner_all on public.appointment_items for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- lançamentos: owner lê tudo; só CRIA/EDITA despesa manual (receita nasce só do atendimento)
create policy entries_owner_read   on public.financial_entries for select to authenticated using (public.is_owner());
create policy entries_owner_insert on public.financial_entries for insert to authenticated
  with check (public.is_owner() and kind = 'expense' and status = 'pending' and appointment_id is null and commission_id is null);
create policy entries_owner_update on public.financial_entries for update to authenticated
  using (public.is_owner() and kind = 'expense') with check (public.is_owner() and kind = 'expense');

-- livro-razão: somente leitura direta; escrita apenas pelas funções acima
create policy cash_registers_owner_read  on public.cash_registers for select to authenticated using (public.is_owner());
create policy payments_owner_read        on public.payments for select to authenticated using (public.is_owner());
create policy cash_movements_owner_read  on public.cash_movements for select to authenticated using (public.is_owner());
create policy commissions_owner_read     on public.commissions for select to authenticated using (public.is_owner());
create policy audit_logs_owner_read      on public.audit_logs for select to authenticated using (public.is_owner());

-- ───────────────────────────────────────────────────────────────────────────
-- 10. Permissões de execução: só usuários logados; a função ainda exige owner
-- ───────────────────────────────────────────────────────────────────────────
revoke all on function
  public.is_owner(), public.fin_require_owner(), public.appointment_financial_state(uuid),
  public.fin_insert_payment(uuid, uuid, text, integer, text, date, text),
  public.complete_appointment(uuid, jsonb, boolean, text), public.record_payment(uuid, text, integer, text),
  public.refund_payment(uuid, text), public.open_cash_register(integer), public.close_cash_register(integer, text),
  public.add_cash_movement(text, integer, text, text, text), public.pay_expense(uuid, text, timestamptz),
  public.generate_recurring_expenses(date), public.finance_summary(date, date), public.cash_flow(date, date),
  public.report_by_service(date, date), public.report_by_staff(date, date), public.report_by_method(date, date),
  public.report_by_client(date, date), public.audit_row(), public.forbid_change(), public.financial_entries_guard(),
  public.appointments_guard(), public.appointments_create_item(), public.appointment_items_guard()
  from public, anon, authenticated;

grant execute on function
  public.is_owner(), public.fin_require_owner(), public.appointment_financial_state(uuid),
  public.complete_appointment(uuid, jsonb, boolean, text), public.record_payment(uuid, text, integer, text),
  public.refund_payment(uuid, text), public.open_cash_register(integer), public.close_cash_register(integer, text),
  public.add_cash_movement(text, integer, text, text, text), public.pay_expense(uuid, text, timestamptz),
  public.generate_recurring_expenses(date), public.finance_summary(date, date), public.cash_flow(date, date),
  public.report_by_service(date, date), public.report_by_staff(date, date), public.report_by_method(date, date),
  public.report_by_client(date, date)
  to authenticated;

commit;
