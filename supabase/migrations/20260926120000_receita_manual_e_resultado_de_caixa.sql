-- ═══════════════════════════════════════════════════════════════════════════
-- FRATELLI BARBER CLUB — financeiro, etapa 2
--   • receita MANUAL (venda de produto, outras receitas): a receber → recebida
--   • resultado de CAIXA (recebido − pago) ao lado do resultado por competência
--   • relatório por categoria e listagem de lançamentos com filtros no banco
-- ADITIVA: não apaga nem reescreve dados. Uma transação (falhou, nada é aplicado).
-- Dinheiro em CENTAVOS. Regras de integridade no BANCO (constraint, gatilho, função atômica).
-- Depende de 20260925120000_financeiro_fundacao.sql.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Lançamento de receita: novos estados e chave de idempotência
-- ───────────────────────────────────────────────────────────────────────────
-- income: recognized (nasce do atendimento) | pending (manual, a receber) | received (manual, recebida) | cancelled
alter table public.financial_entries drop constraint financial_entries_status_by_kind;
alter table public.financial_entries add constraint financial_entries_status_by_kind check (
  (kind = 'income'  and status in ('recognized', 'pending', 'received', 'cancelled')) or
  (kind = 'expense' and status in ('pending', 'paid', 'cancelled'))
);

alter table public.financial_entries drop constraint financial_entries_paid_has_date;
alter table public.financial_entries add constraint financial_entries_paid_has_date
  check (status not in ('paid', 'received') or paid_at is not null);

-- pending/received de receita só existe para receita MANUAL (a do atendimento é 'recognized')
alter table public.financial_entries add constraint financial_entries_manual_income_shape
  check (kind <> 'income' or status not in ('pending', 'received') or (appointment_id is null and appointment_item_id is null));

-- duplo clique / repetição do mesmo envio não cria segunda receita manual
alter table public.financial_entries add column idempotency_key text;
create unique index financial_entries_idempotency_key_uidx on public.financial_entries (idempotency_key)
  where idempotency_key is not null;

-- o recebimento de uma receita manual é um pagamento SEM atendimento; guarda a origem
alter table public.payments add column income_entry_id uuid references public.financial_entries (id) on delete restrict;
create unique index payments_one_receipt_per_income on public.payments (income_entry_id)
  where income_entry_id is not null and kind = 'payment';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Guarda dos lançamentos (substitui a da fundação: acrescenta received/receive/refund)
-- ───────────────────────────────────────────────────────────────────────────
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
    -- "pago"/"recebido" só nascem dentro das funções financeiras (que geram o movimento de caixa)
    if new.status = 'paid' and v_op not in ('complete', 'payment', 'pay', 'receive') then
      raise exception 'paid_entry_requires_finance_function' using errcode = 'P0001';
    end if;
    if new.status = 'received' then
      raise exception 'received_entry_requires_finance_function' using errcode = 'P0001';
    end if;
    -- receita manual só nasce por create_manual_income()
    if new.kind = 'income' and new.status = 'pending' and v_op <> 'manual_income' then
      raise exception 'manual_income_requires_finance_function' using errcode = 'P0001';
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
  if old.status = 'received' then
    -- recebida é definitiva; a única saída é o ESTORNO (refund_payment), que a cancela
    if not (new.status = 'cancelled' and v_op = 'refund'
            and new.amount_cents = old.amount_cents and new.paid_at is not distinct from old.paid_at
            and new.payment_method is not distinct from old.payment_method)
       and (new.status <> 'received' or new.amount_cents <> old.amount_cents
            or new.paid_at is distinct from old.paid_at or new.payment_method is distinct from old.payment_method) then
      raise exception 'received_entry_is_immutable' using errcode = 'P0001';
    end if;
  end if;
  if old.kind = 'income' and new.amount_cents <> old.amount_cents then
    raise exception 'income_amount_is_immutable' using errcode = 'P0001';
  end if;
  if new.status = 'paid' and old.status <> 'paid' and v_op <> 'pay' then
    raise exception 'paid_entry_requires_finance_function' using errcode = 'P0001';
  end if;
  if new.status = 'received' and old.status <> 'received' and v_op <> 'receive' then
    raise exception 'received_entry_requires_finance_function' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Pagamento interno: passa a aceitar a receita manual de origem
--    (troca de assinatura: 7 → 8 argumentos; complete_appointment/record_payment seguem chamando com 7)
-- ───────────────────────────────────────────────────────────────────────────
drop function public.fin_insert_payment(uuid, uuid, text, integer, text, date, text);

create or replace function public.fin_insert_payment(
  p_appointment_id uuid, p_client_id uuid, p_method text, p_amount_cents integer,
  p_key text, p_competence date, p_description text, p_income_entry_id uuid default null
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

  insert into public.payments (appointment_id, client_id, kind, method, amount_cents, fee_cents, cash_register_id,
                               idempotency_key, income_entry_id, created_by)
  values (p_appointment_id, p_client_id, 'payment', p_method, p_amount_cents, v_fee, v_reg,
          p_key, p_income_entry_id, (select auth.uid()))
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

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Receita manual: criar (a receber ou já recebida) e receber
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.receive_income(p_entry_id uuid, p_method text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare e public.financial_entries;
begin
  perform public.fin_require_owner();
  select * into e from public.financial_entries where id = p_entry_id for update;   -- serializa duplo clique
  if not found or e.kind <> 'income' or e.appointment_id is not null or e.appointment_item_id is not null then
    raise exception 'income_not_found' using errcode = 'P0001';
  end if;
  if e.status = 'received' then raise exception 'already_received' using errcode = 'P0001'; end if;
  if e.status = 'cancelled' then raise exception 'entry_cancelled' using errcode = 'P0001'; end if;

  perform set_config('app.finance_op', 'receive', true);
  -- chave 'income:<id>' + índice único: mesmo que a trava falhe, nunca há dois recebimentos
  perform public.fin_insert_payment(null, null, p_method, e.amount_cents, 'income:' || e.id, e.competence_date, e.description, e.id);
  update public.financial_entries set status = 'received', paid_at = now(), payment_method = p_method where id = e.id;
  perform set_config('app.finance_op', '', true);
  return jsonb_build_object('entry_id', e.id, 'received_cents', e.amount_cents);
end;
$$;

create or replace function public.create_manual_income(
  p_category_id uuid, p_description text, p_amount_cents integer, p_competence date,
  p_due_on date default null, p_notes text default null,
  p_method text default null,                -- informado: já nasce recebida
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid; v_active boolean; v_kind text;
begin
  perform public.fin_require_owner();
  if length(trim(coalesce(p_description, ''))) = 0 then raise exception 'description_required' using errcode = 'P0001'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if p_competence is null then raise exception 'invalid_date' using errcode = 'P0001'; end if;
  select active, kind into v_active, v_kind from public.financial_categories where id = p_category_id;
  if v_active is null or not v_active or v_kind <> 'income' then raise exception 'invalid_category' using errcode = 'P0001'; end if;

  if p_idempotency_key is not null then
    select id into v_id from public.financial_entries where idempotency_key = p_idempotency_key;
    if found then return jsonb_build_object('entry_id', v_id, 'idempotent', true); end if;
  end if;

  perform set_config('app.finance_op', 'manual_income', true);
  insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, due_on, status,
                                        notes, idempotency_key, created_by)
  values ('income', p_category_id, trim(p_description), p_amount_cents, p_competence, p_due_on, 'pending',
          nullif(trim(coalesce(p_notes, '')), ''), p_idempotency_key, (select auth.uid()))
  returning id into v_id;
  perform set_config('app.finance_op', '', true);

  if p_method is not null then perform public.receive_income(v_id, p_method); end if;
  return jsonb_build_object('entry_id', v_id, 'received', p_method is not null);
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Estorno: receita manual estornada é cancelada (sai da receita e o caixa devolve)
-- ───────────────────────────────────────────────────────────────────────────
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

  if p.income_entry_id is not null then
    perform set_config('app.finance_op', 'refund', true);
    update public.financial_entries set status = 'cancelled' where id = p.income_entry_id and status = 'received';
    perform set_config('app.finance_op', '', true);
  end if;
  return jsonb_build_object('refund_id', v_rid);
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Visão de receitas manuais a receber e resumo (agora com o resultado de CAIXA)
-- ───────────────────────────────────────────────────────────────────────────
create view public.v_accounts_receivable_manual with (security_invoker = true) as
select e.id, e.description, e.amount_cents, e.due_on, e.competence_date, e.category_id, c.name as category_name,
       (e.due_on is not null and e.due_on < (now() at time zone 'America/Sao_Paulo')::date) as overdue
from public.financial_entries e
join public.financial_categories c on c.id = e.category_id
where e.kind = 'income' and e.status = 'pending' and e.appointment_item_id is null;

-- Resultado de caixa = RECEBIDO − PAGO no período (por data efetiva). Resultado por competência continua
-- em result_cents. Recebido = pagamentos − estornos (bruto); as taxas e comissões entram como despesa PAGA.
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
    'received_cents',  coalesce((select sum(case when kind = 'payment' then amount_cents else -amount_cents end) from public.payments
                                  where (paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'paid_cents',      coalesce((select sum(amount_cents) from public.financial_entries
                                  where kind = 'expense' and status = 'paid'
                                    and (paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'cash_result_cents', coalesce((select sum(case when kind = 'payment' then amount_cents else -amount_cents end) from public.payments
                                  where (paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0)
                       - coalesce((select sum(amount_cents) from public.financial_entries
                                  where kind = 'expense' and status = 'paid'
                                    and (paid_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'cash_in_cents',   coalesce((select sum(amount_cents) from public.cash_movements
                                  where direction = 'in' and (occurred_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'cash_out_cents',  coalesce((select sum(amount_cents) from public.cash_movements
                                  where direction = 'out' and (occurred_at at time zone 'America/Sao_Paulo')::date between p_from and p_to), 0),
    'receivable_cents', coalesce((select sum(outstanding_cents) from public.v_accounts_receivable), 0)
                      + coalesce((select sum(amount_cents) from public.v_accounts_receivable_manual), 0),
    'receivable_overdue_cents', coalesce((select sum(amount_cents) from public.v_accounts_receivable_manual where overdue), 0),
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

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Relatório por categoria e filtro por forma de pagamento
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.report_by_category(p_from date, p_to date, p_kind text)
returns table (category_id uuid, category_name text, entries bigint, total_cents bigint)
language sql
stable
as $$
  select c.id, c.name, count(*)::bigint, sum(e.amount_cents)::bigint
  from public.financial_entries e
  join public.financial_categories c on c.id = e.category_id
  where e.kind = p_kind and e.status <> 'cancelled' and e.competence_date between p_from and p_to
  group by c.id, c.name
  order by 4 desc;
$$;

-- Relatório de profissionais: só receita de ATENDIMENTO (receita manual não tem barbeiro; não vira "sem profissional").
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
  where e.kind = 'income' and e.status <> 'cancelled' and e.appointment_item_id is not null
    and e.competence_date between p_from and p_to
  group by e.staff_id, st.name
  order by 4 desc;
$$;

-- Lista de lançamentos com TODOS os filtros no banco (categoria, situação, forma de pagamento, profissional).
-- Forma de pagamento: despesa/receita manual pela própria forma; receita de atendimento pelos pagamentos dele.
create or replace function public.list_financial_entries(
  p_kind text, p_from date, p_to date,
  p_category uuid default null, p_status text default null, p_method text default null, p_staff uuid default null
)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.competence_date desc, x.created_at desc), '[]'::jsonb)
  from (
    select e.id, e.kind, e.description, e.amount_cents, e.competence_date, e.due_on, e.status, e.paid_at, e.payment_method,
           e.appointment_id, e.commission_id, e.recurring_expense_id, e.notes, e.created_at,
           case when c.id is null then null else jsonb_build_object('name', c.name) end as category,
           case when cl.id is null then null else jsonb_build_object('name', cl.name) end as client,
           case when st.id is null then null else jsonb_build_object('name', st.name) end as staff
    from public.financial_entries e
    left join public.financial_categories c on c.id = e.category_id
    left join public.clients cl on cl.id = e.client_id
    left join public.staff st on st.id = e.staff_id
    where e.kind = p_kind and e.competence_date between p_from and p_to
      and (p_category is null or e.category_id = p_category)
      and (p_status is null or e.status = p_status)
      and (p_staff is null or e.staff_id = p_staff)
      and (p_method is null or e.payment_method = p_method
           or (e.kind = 'income' and e.appointment_id is not null and exists (
                 select 1 from public.payments p
                 where p.appointment_id = e.appointment_id and p.kind = 'payment' and p.method = p_method)))
  ) x;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. RLS e permissões (nada novo aberto a anônimo; escrita de receita só pelas funções)
-- ───────────────────────────────────────────────────────────────────────────
-- Receita manual PENDENTE pode ser cancelada/editada pelo dono (não a recebida, não a de atendimento).
create policy entries_owner_update_manual_income on public.financial_entries for update to authenticated
  using (public.is_owner() and kind = 'income' and appointment_id is null and appointment_item_id is null and status = 'pending')
  with check (public.is_owner() and kind = 'income' and appointment_id is null and appointment_item_id is null
              and status in ('pending', 'cancelled'));

revoke all on function
  public.fin_insert_payment(uuid, uuid, text, integer, text, date, text, uuid),
  public.receive_income(uuid, text), public.create_manual_income(uuid, text, integer, date, date, text, text, text),
  public.refund_payment(uuid, text), public.finance_summary(date, date),
  public.report_by_category(date, date, text),
  public.list_financial_entries(text, date, date, uuid, text, text, uuid), public.financial_entries_guard()
  from public, anon, authenticated;

grant execute on function
  public.receive_income(uuid, text), public.create_manual_income(uuid, text, integer, date, date, text, text, text),
  public.refund_payment(uuid, text), public.finance_summary(date, date),
  public.report_by_category(date, date, text),
  public.list_financial_entries(text, date, date, uuid, text, text, uuid)
  to authenticated;

commit;
