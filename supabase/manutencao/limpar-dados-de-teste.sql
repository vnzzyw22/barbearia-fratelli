-- LIMPEZA DOS DADOS DE TESTE (financeiro + agendamentos de teste).
-- Remove SOMENTE o que os testes automáticos criaram:
--   * clientes / agendamentos com nome ou observação começando em "TESTE AUTOMATICO";
--   * tudo que aponta para esses agendamentos (itens, pagamentos, receitas, comissões);
--   * despesas com descrição "TESTE AUTOMATICO%" e movimentos manuais de caixa "TESTE%";
--   * caixas que ficarem sem nenhum movimento;
--   * o rastro na auditoria dessas linhas.
-- O histórico financeiro é protegido por gatilhos (por design), então este script desliga os
-- gatilhos só nesta sessão (session_replication_role = replica) e apaga na ordem certa das
-- dependências. Rode UMA vez, no SQL Editor. Tudo roda em UM comando (bloco DO): se algo falhar, nada é apagado.
do $limpeza$
begin
perform set_config('session_replication_role', 'replica', true);

create temp table t_appts on commit drop as
  select id from public.appointments where notes like 'TESTE AUTOMATICO%'
  union
  select a.id from public.appointments a join public.clients c on c.id = a.client_id where c.name like 'TESTE AUTOMATICO%';

create temp table t_items on commit drop as
  select id from public.appointment_items where appointment_id in (select id from t_appts);

create temp table t_payments on commit drop as
  select id from public.payments where appointment_id in (select id from t_appts);

create temp table t_entries on commit drop as
  select id from public.financial_entries
   where appointment_id in (select id from t_appts) or description like 'TESTE AUTOMATICO%';

create temp table t_moves on commit drop as
  select id from public.cash_movements
   where payment_id in (select id from t_payments)
      or entry_id in (select id from t_entries)
      or (source in ('manual', 'adjustment') and description like 'TESTE%');

create temp table t_commissions on commit drop as
  select id from public.commissions where appointment_item_id in (select id from t_items);

delete from public.cash_movements     where id in (select id from t_moves);
delete from public.payments           where kind = 'refund' and (id in (select id from t_payments) or reversal_of in (select id from t_payments));
delete from public.payments           where id in (select id from t_payments);
update public.commissions set entry_id = null where id in (select id from t_commissions);
delete from public.financial_entries  where id in (select id from t_entries) or commission_id in (select id from t_commissions);
delete from public.commissions        where id in (select id from t_commissions);
delete from public.appointment_items where id in (select id from t_items);
delete from public.appointments       where id in (select id from t_appts);
delete from public.clients c
 where c.name like 'TESTE AUTOMATICO%'
   and not exists (select 1 from public.appointments a where a.client_id = c.id);

-- caixas de teste que ficaram vazios (nenhum movimento restante)
delete from public.cash_registers r
 where not exists (select 1 from public.cash_movements m where m.cash_register_id = r.id)
   and not exists (select 1 from public.payments p where p.cash_register_id = r.id);

-- rastro de auditoria das linhas removidas
delete from public.audit_logs
 where (entity = 'appointments'      and entity_id in (select id::text from t_appts))
    or (entity = 'appointment_items' and entity_id in (select id::text from t_items))
    or (entity = 'payments'          and entity_id in (select id::text from t_payments))
    or (entity = 'financial_entries' and entity_id in (select id::text from t_entries))
    or (entity = 'cash_movements'    and entity_id in (select id::text from t_moves))
    or (entity = 'commissions'       and entity_id in (select id::text from t_commissions))
    or (entity = 'cash_registers'    and entity_id not in (select id::text from public.cash_registers));
end
$limpeza$;

-- conferência (deve mostrar zeros nos testes)
select
  (select count(*) from public.appointments where notes like 'TESTE AUTOMATICO%')          as agendamentos_teste,
  (select count(*) from public.clients where name like 'TESTE AUTOMATICO%')                 as clientes_teste,
  (select count(*) from public.financial_entries where description like 'TESTE AUTOMATICO%') as despesas_teste,
  (select count(*) from public.payments)                                                    as pagamentos_restantes,
  (select count(*) from public.cash_movements)                                              as movimentos_restantes,
  (select count(*) from public.cash_registers)                                              as caixas_restantes;
