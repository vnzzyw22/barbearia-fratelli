-- ═══════════════════════════════════════════════════════════════════════
-- FRATELLI BARBER CLUB — reaproveita o projeto Supabase que era da Fialho
-- ═══════════════════════════════════════════════════════════════════════
-- ⚠️  ESTE SCRIPT APAGA TODOS OS DADOS do projeto (agendamentos, clientes,
--     serviços, equipe, galeria, financeiro, configurações) e recarrega os
--     da Fratelli. A ESTRUTURA (tabelas, RLS, buckets) NÃO muda.
--     Rode uma vez, no SQL Editor do Supabase, com o projeto certo aberto.
--
-- 🔒 DESATIVADO DE PROPÓSITO. O banco pgoleccfvulckagvmgbr é o de PRODUÇÃO da
--    Fialho (barbearia-fialho.vercel.app) e tem dados reais. Este script NÃO
--    deve rodar nele. Só remova o bloco "TRAVA" abaixo depois de:
--      1) confirmar que o projeto aberto é o do Fratelli (ou que a Fialho
--         concordou em ceder o banco);
--      2) ter feito e guardado um backup;
--      3) confirmar que não há dado real a preservar.
-- ═══════════════════════════════════════════════════════════════════════

-- === TRAVA (remova este bloco para liberar o script) =====================
do $$
begin
  raise exception 'Script destrutivo desativado. Leia o cabeçalho antes de remover esta trava.';
end
$$;
-- === FIM DA TRAVA ========================================================

begin;

truncate table
  public.appointments,
  public.blocked_slots,
  public.transactions,
  public.clients,
  public.gallery_photos,
  public.staff,
  public.services,
  public.business_settings
restart identity cascade;

-- ── dados da Fratelli (mesmo conteúdo de supabase/seed.sql) ──
-- Fratelli Barber Club.
-- Endereço, Instagram e telefones lidos da placa da fachada; WhatsApp (final 1432) e cidade confirmados pelo cliente.
-- Horário de funcionamento HERDADO da base do projeto (confirmar com a Fratelli).
insert into public.business_settings (id, name, whatsapp, instagram, address, business_hours)
values (
  '00000000-0000-0000-0000-000000000001',
  'Fratelli Barber Club',
  '5544999161432',
  'fratellibarberclub',
  'Av. das Grevíleas, 148 — Maringá, PR',
  '{
    "mon": {"open": "09:00", "close": "19:30"},
    "tue": {"open": "09:00", "close": "19:30"},
    "wed": {"open": "09:00", "close": "19:30"},
    "thu": {"open": "09:00", "close": "19:30"},
    "fri": {"open": "09:00", "close": "19:30"},
    "sat": {"open": "08:00", "close": "14:00"},
    "sun": {"closed": true}
  }'::jsonb
);

-- SERVIÇOS E PREÇOS DE EXEMPLO (genéricos) — substituir pelos reais da Fratelli.
insert into public.services (name, description, price, duration_minutes, display_order) values
  ('Corte',                 null,           50.00,  40, 1),
  ('Barba',                 null,           40.00,  30, 2),
  ('Corte e Barba',         null,           85.00,  70, 3),
  ('Sobrancelha',           null,           20.00,  15, 4),
  ('Pezinho e acabamento',  null,           15.00,  15, 5),
  ('Hidratação capilar',    null,           45.00,  30, 6),
  ('Selagem',               null,          120.00,  90, 7),
  ('Coloração',             'A partir de',  60.00,  45, 8);

-- PLACEHOLDER: trocar pelos barbeiros reais da Fratelli (painel /admin/equipe).
insert into public.staff (name, role, photo_url, display_order) values
  ('Barbeiro 01', 'Barbeiro', null, 1),
  ('Barbeiro 02', 'Barbeiro', null, 2),
  ('Barbeiro 03', 'Barbeiro', null, 3);

-- Galeria: sem fotos reais da Fratelli ainda (enviar pelo painel /admin/galeria).


commit;

-- ── Admin antigo (Fialho) ──
-- O painel libera QUALQUER usuário autenticado. Remova o login antigo para a
-- dona da Fialho não entrar no painel da Fratelli:
delete from auth.users where email = 'fialho@gmail.com';

-- ── Verificação (deve mostrar 1 / 8 / 3 / 0) ──
select
  (select count(*) from public.business_settings) as configuracoes,
  (select count(*) from public.services)          as servicos,
  (select count(*) from public.staff)             as equipe,
  (select count(*) from public.appointments)      as agendamentos;
