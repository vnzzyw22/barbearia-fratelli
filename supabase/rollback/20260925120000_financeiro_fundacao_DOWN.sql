-- ROLLBACK da fundação financeira. NÃO é migração: só rode se precisar desfazer.
-- Trava de segurança: recusa desfazer se já existir qualquer dado financeiro
-- (apagar dinheiro registrado seria destrutivo). Com dados, exporte antes e
-- só então troque `false` por `true` na linha "confirmo_apagar_dados".
begin;

do $$
declare
  confirmo_apagar_dados constant boolean := false;
  v_tem_dados boolean;
begin
  select exists (select 1 from public.payments)
      or exists (select 1 from public.financial_entries)
      or exists (select 1 from public.cash_movements)
      or exists (select 1 from public.cash_registers)
    into v_tem_dados;
  if v_tem_dados and not confirmo_apagar_dados then
    raise exception 'rollback_recusado: existem dados financeiros. Exporte-os e confirme explicitamente.';
  end if;
end $$;

drop function if exists
  public.report_by_client(date, date), public.report_by_method(date, date), public.report_by_staff(date, date),
  public.report_by_service(date, date), public.cash_flow(date, date), public.finance_summary(date, date),
  public.generate_recurring_expenses(date), public.pay_expense(uuid, text, timestamptz),
  public.add_cash_movement(text, integer, text, text, text), public.close_cash_register(integer, text),
  public.open_cash_register(integer), public.refund_payment(uuid, text), public.record_payment(uuid, text, integer, text),
  public.complete_appointment(uuid, jsonb, boolean, text), public.appointment_financial_state(uuid),
  public.fin_require_owner() cascade;
drop function if exists public.fin_insert_payment cascade;

drop view if exists public.v_accounts_payable, public.v_accounts_receivable, public.v_appointment_balances;

drop trigger if exists appointments_guard on public.appointments;
drop trigger if exists appointments_create_item on public.appointments;
drop trigger if exists audit on public.appointments;

drop table if exists public.audit_logs, public.cash_movements, public.financial_entries, public.commissions,
  public.recurring_expenses, public.commission_rules, public.payments, public.cash_registers,
  public.appointment_items cascade;

drop function if exists public.appointments_guard(), public.appointments_create_item(), public.appointment_items_guard(),
  public.financial_entries_guard(), public.audit_row(), public.forbid_change() cascade;

alter table public.appointments drop constraint appointments_status_check;
-- se existirem atendimentos nos estados novos, volte-os antes (senão o check falha e o rollback aborta, sem estragar nada)
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'cancelled'));
alter table public.appointments drop column if exists completed_at, drop column if exists cancelled_at,
  drop column if exists cancel_reason, drop column if exists discount_cents;

alter table public.services drop column if exists financial_category_id;
drop table if exists public.payment_methods, public.financial_categories cascade;

drop function if exists public.is_owner() cascade;
drop table if exists public.admin_profiles cascade;

commit;
