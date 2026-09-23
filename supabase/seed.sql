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
