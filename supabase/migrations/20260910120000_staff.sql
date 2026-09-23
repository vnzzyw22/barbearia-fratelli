-- Suporte a equipe de barbeiros (herdado do template, ver CLAUDE.md) — a
-- Fialho confirmou ter mais de um profissional atendendo (ver ANEXO seção
-- 1), então esta migration se aplica igual aqui. Quebra a suposição "1
-- profissional por deployment" documentada na Fase 1 — vários barbeiros
-- atendem em paralelo, cada um com a própria agenda.

create extension if not exists btree_gist;

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  photo_url text,
  instagram text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.staff
for each row execute function public.set_updated_at();

create index staff_active_idx on public.staff (active, display_order);

-- appointments: staff_id obrigatório — todo agendamento é com um
-- profissional específico (o fluxo público de agendamento passa a exigir
-- essa escolha, ver src/app/agendar). Tabela ainda vazia neste projeto,
-- por isso dá pra adicionar NOT NULL direto sem precisar de um default.
alter table public.appointments
  add column staff_id uuid not null references public.staff (id) on delete restrict;

-- blocked_slots: staff_id opcional — null significa "loja inteira fechada"
-- (bloqueia todos os profissionais); preenchido bloqueia só aquele
-- barbeiro (ex.: folga, férias).
alter table public.blocked_slots
  add column staff_id uuid references public.staff (id) on delete restrict;

-- Substitui as constraints de conflito de horário (antes: 1 agenda única
-- pro negócio inteiro) por uma constraint por profissional — dois
-- agendamentos agora podem coexistir no mesmo horário desde que sejam com
-- profissionais diferentes. Precisa do btree_gist pra combinar a igualdade
-- de staff_id com o índice GiST do intervalo (nota já deixada na Fase 1
-- explicando por que não era necessário até agora).
alter table public.appointments drop constraint appointments_no_overlap;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (staff_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status <> 'cancelled');

alter table public.blocked_slots drop constraint blocked_slots_no_overlap;
alter table public.blocked_slots
  add constraint blocked_slots_no_overlap
  exclude using gist (staff_id with =, tstzrange(starts_at, ends_at, '[)') with &&);

-- busy_slots (Fase 3) precisa expor staff_id pro site público filtrar
-- disponibilidade por profissional + considerar bloqueios da loja inteira
-- (staff_id null) pra qualquer barbeiro. Recriada do zero (só 2 colunas
-- antes, mudando a assinatura) — sem dado de cliente/serviço/motivo
-- exposto, mesma garantia de privacidade de antes.
drop view public.busy_slots;
create view public.busy_slots as
select staff_id, starts_at, ends_at from public.appointments where status <> 'cancelled'
union all
select staff_id, starts_at, ends_at from public.blocked_slots;

grant select on public.busy_slots to anon, authenticated;

-- RLS: público só vê profissionais ativos; admin vê e gerencia tudo (mesmo
-- padrão de services/gallery_photos).
alter table public.staff enable row level security;

create policy staff_public_read
  on public.staff for select
  to anon
  using (active = true);

create policy staff_admin_all
  on public.staff for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- Storage: bucket próprio pra fotos da equipe (separado do "gallery" pra
-- manter os dois contextos organizados), mesmo padrão de permissões do
-- bucket "gallery" (leitura pública, escrita só admin).
insert into storage.buckets (id, name, public)
values ('staff', 'staff', true)
on conflict (id) do nothing;

create policy staff_storage_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'staff');

create policy staff_storage_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'staff');

create policy staff_storage_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'staff');

create policy staff_storage_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'staff');

-- Seed da equipe real está em supabase/seed.sql (recebida em 2026-09-15) —
-- não duplicar aqui. Esta migration só cria a estrutura (tabela/RLS/bucket).
