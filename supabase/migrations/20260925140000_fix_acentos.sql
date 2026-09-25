-- Correção de acentuação: a migração 20260925120000 foi colada no SQL Editor via área de transferência
-- do Windows (`clip`), que converteu o UTF-8 (ex.: "Água" virou "├ügua"). Este arquivo é ASCII puro
-- (usa escapes Unicode U&'...') para não sofrer o mesmo problema. É idempotente.
begin;

update public.financial_categories set name = U&'\00C1gua'        where kind = 'expense' and display_order = 3  and system_key is null;
update public.financial_categories set name = U&'Sal\00E1rios'    where kind = 'expense' and display_order = 5  and system_key is null;
update public.financial_categories set name = U&'Manuten\00E7\00E3o' where kind = 'expense' and display_order = 9 and system_key is null;
update public.financial_categories set name = U&'Comiss\00F5es'   where system_key = 'expense_commissions';

update public.payment_methods set name = U&'D\00E9bito'  where code = 'debit';
update public.payment_methods set name = U&'Cr\00E9dito' where code = 'credit';

-- Texto "Comissão — ..." dentro de complete_appointment (descrição do custo de comissão).
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.complete_appointment(uuid, jsonb, boolean, text)'::regprocedure) into v_def;
  v_def := regexp_replace(v_def, '''Comiss[^'']*'' \|\|', quote_literal(U&'Comiss\00E3o \2014 ') || ' ||');
  execute v_def;
end $$;

commit;
