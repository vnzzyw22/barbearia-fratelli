-- Fase 3 — expõe só os intervalos ocupados (sem dados do cliente) pro site
-- público calcular horários disponíveis. appointments/blocked_slots não têm
-- policy de SELECT pra anon (só admin lê), e propositalmente continuam assim:
-- em vez de afrouxar RLS nas tabelas, a view roda com os privilégios do dono
-- (security_invoker = false, default do Postgres), então ignora a RLS das
-- tabelas de origem só pra este recorte de colunas — nome do cliente, serviço
-- e motivo do bloqueio nunca ficam visíveis por aqui.
create view public.busy_slots as
select starts_at, ends_at from public.appointments where status <> 'cancelled'
union all
select starts_at, ends_at from public.blocked_slots;

grant select on public.busy_slots to anon, authenticated;
