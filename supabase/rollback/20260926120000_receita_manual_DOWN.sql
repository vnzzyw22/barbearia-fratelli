-- ROLLBACK da etapa 2 (receita manual / resultado de caixa). NÃO é migração: só rode se precisar desfazer.
-- Recusa desfazer se já existir receita manual (pendente, recebida ou cancelada): apagar isso seria
-- destrutivo. Com dados, exporte antes e só então troque `false` por `true` em "confirmo_apagar_dados"
-- (a receita manual e seus pagamentos são REMOVIDOS junto).
begin;

do $$
declare
  confirmo_apagar_dados constant boolean := false;
begin
  if exists (select 1 from public.financial_entries where kind = 'income' and appointment_item_id is null
             and (status in ('pending', 'received') or idempotency_key is not null))
     or exists (select 1 from public.payments where income_entry_id is not null) then
    if not confirmo_apagar_dados then
      raise exception 'rollback_recusado: existe receita manual. Exporte-a e confirme explicitamente.';
    end if;
  end if;
end $$;

drop policy if exists entries_owner_update_manual_income on public.financial_entries;
drop function if exists public.list_financial_entries(text, date, date, uuid, text, text, uuid);
drop function if exists public.report_by_category(date, date, text);
drop function if exists public.create_manual_income(uuid, text, integer, date, date, text, text, text);
drop function if exists public.receive_income(uuid, text);
drop function if exists public.finance_summary(date, date);
drop view if exists public.v_accounts_receivable_manual;
drop function if exists public.fin_insert_payment(uuid, uuid, text, integer, text, date, text, uuid);

-- ── definições da fundação, restauradas ───────────────────────────────────
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

-- receitas manuais e seus pagamentos saem (só com confirmo_apagar_dados = true acima)
alter table public.financial_entries disable trigger forbid_delete;
alter table public.payments disable trigger forbid_delete;
alter table public.cash_movements disable trigger forbid_delete;
delete from public.cash_movements where payment_id in (select id from public.payments where income_entry_id is not null);
delete from public.payments where income_entry_id is not null;
delete from public.financial_entries where kind = 'income' and appointment_item_id is null and status in ('pending', 'received', 'cancelled')
  and (idempotency_key is not null or appointment_id is null and status in ('pending', 'received'));
alter table public.financial_entries enable trigger forbid_delete;
alter table public.payments enable trigger forbid_delete;
alter table public.cash_movements enable trigger forbid_delete;

drop index if exists public.payments_one_receipt_per_income;
alter table public.payments drop column income_entry_id;
drop index if exists public.financial_entries_idempotency_key_uidx;
alter table public.financial_entries drop column idempotency_key;
alter table public.financial_entries drop constraint financial_entries_manual_income_shape;
alter table public.financial_entries drop constraint financial_entries_paid_has_date;
alter table public.financial_entries add constraint financial_entries_paid_has_date check (status <> 'paid' or paid_at is not null);
alter table public.financial_entries drop constraint financial_entries_status_by_kind;
alter table public.financial_entries add constraint financial_entries_status_by_kind check (
  (kind = 'income'  and status in ('recognized', 'cancelled')) or
  (kind = 'expense' and status in ('pending', 'paid', 'cancelled'))
);

revoke all on function
  public.fin_insert_payment(uuid, uuid, text, integer, text, date, text), public.refund_payment(uuid, text),
  public.finance_summary(date, date) from public, anon, authenticated;
grant execute on function public.refund_payment(uuid, text), public.finance_summary(date, date) to authenticated;

commit;
