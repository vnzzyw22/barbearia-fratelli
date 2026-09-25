-- Correcao de acentuacao: a migracao 20260925120000 foi colada no SQL Editor via `clip` (Windows),
-- que converteu UTF-8 (ex.: "Agua" com acento virou lixo). Este arquivo e ASCII puro (usa chr()).
-- Idempotente.
begin;

update public.financial_categories set name = chr(193) || 'gua'                       where kind = 'expense' and display_order = 3  and system_key is null;
update public.financial_categories set name = 'Sal' || chr(225) || 'rios'             where kind = 'expense' and display_order = 5  and system_key is null;
update public.financial_categories set name = 'Manuten' || chr(231) || chr(227) || 'o' where kind = 'expense' and display_order = 9  and system_key is null;
update public.financial_categories set name = 'Comiss' || chr(245) || 'es'            where system_key = 'expense_commissions';

update public.payment_methods set name = 'D' || chr(233) || 'bito'  where code = 'debit';
update public.payment_methods set name = 'Cr' || chr(233) || 'dito' where code = 'credit';

-- Texto "Comissao - ..." dentro de complete_appointment (descricao do custo de comissao).
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.complete_appointment(uuid, jsonb, boolean, text)'::regprocedure) into v_def;
  v_def := regexp_replace(v_def, '''Comiss[^'']*'' \|\|', quote_literal('Comiss' || chr(227) || 'o ' || chr(8212) || ' ') || ' ||');
  execute v_def;
end $$;

commit;

select display_order, name from public.financial_categories where kind = 'expense' order by display_order;
