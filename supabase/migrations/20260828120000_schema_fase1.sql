-- Fase 1 — schema inicial (herdado do template Lkas Locs, agora usado pelo
-- Tesouras Club Barbearia).
-- Modelo "template clonado por cliente": esta base atende UM profissional/negócio
-- por deployment, por isso não há coluna business_id nas tabelas. Dados da marca
-- ficam isolados em business_settings (linha única) em vez de hardcoded no código.

-- gen_random_uuid() é built-in desde o Postgres 13, sem precisar de extensão.

-- ---------------------------------------------------------------------------
-- Função utilitária: mantém updated_at em dia em qualquer UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- business_settings — linha única com os dados da marca (nunca hardcoded).
-- ---------------------------------------------------------------------------
create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  instagram text,
  address text,
  business_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Garante que só existe 1 linha: todo insert precisa usar este mesmo id fixo.
  constraint business_settings_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

create trigger set_updated_at
before update on public.business_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- services — preço e duração 100% editáveis pelo painel, nunca hardcoded no front.
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  display_order integer not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create index services_active_idx on public.services (active, display_order);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create index clients_whatsapp_idx on public.clients (whatsapp);

-- ---------------------------------------------------------------------------
-- appointments — histórico e total gasto do cliente são derivados desta tabela.
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_range check (ends_at > starts_at)
);

create trigger set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create index appointments_client_idx on public.appointments (client_id);
create index appointments_service_idx on public.appointments (service_id);
create index appointments_starts_at_idx on public.appointments (starts_at);

-- Prevenção real de conflito de horário no banco (não só na aplicação).
-- Cancelados não contam para o conflito. Só 1 profissional por deployment,
-- então não precisa de coluna extra na constraint (nem da extensão btree_gist,
-- que só seria necessária para combinar um filtro de igualdade dentro do
-- mesmo índice GiST, ex.: várias agendas por profissional).
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
  where (status <> 'cancelled');

-- ---------------------------------------------------------------------------
-- blocked_slots — bloqueios manuais de agenda pelo proprietário.
-- ---------------------------------------------------------------------------
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint blocked_slots_valid_range check (ends_at > starts_at)
);

create index blocked_slots_starts_at_idx on public.blocked_slots (starts_at);

alter table public.blocked_slots
  add constraint blocked_slots_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&);

-- ---------------------------------------------------------------------------
-- gallery_photos
-- ---------------------------------------------------------------------------
create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  category text,
  published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on public.gallery_photos
for each row execute function public.set_updated_at();

create index gallery_photos_published_idx on public.gallery_photos (published, display_order);

-- ---------------------------------------------------------------------------
-- transactions — financeiro simples (entradas/saídas), não um sistema contábil.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric(10, 2) not null check (amount > 0),
  description text,
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index transactions_occurred_at_idx on public.transactions (occurred_at);

-- ---------------------------------------------------------------------------
-- RLS — leitura pública só para o que é conteúdo do site público; tudo que é
-- administrativo (agenda, clientes, financeiro, galeria não publicada, etc.)
-- exige autenticação. Como há apenas 1 profissional, qualquer usuário
-- autenticado é tratado como admin (sem tabela de papéis por enquanto).
-- ---------------------------------------------------------------------------
alter table public.business_settings enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.transactions enable row level security;

-- business_settings: leitura pública total (nome, whatsapp, instagram,
-- endereço e horários não são sensíveis); só admin atualiza.
create policy business_settings_public_read
  on public.business_settings for select
  to public
  using (true);

create policy business_settings_admin_update
  on public.business_settings for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- services: público só vê ativos; admin vê e gerencia tudo.
create policy services_public_read
  on public.services for select
  to anon
  using (active = true);

create policy services_admin_all
  on public.services for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- clients: qualquer um pode se cadastrar ao agendar (fluxo público de
-- agendamento), mas ninguém de fora consegue listar/editar clientes.
create policy clients_public_insert
  on public.clients for insert
  to anon
  with check (true);

create policy clients_admin_all
  on public.clients for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- appointments: cliente cria o próprio agendamento (sempre como "pending"),
-- mas não pode ler, alterar ou cancelar agendamentos — só o admin.
create policy appointments_public_insert
  on public.appointments for insert
  to anon
  with check (status = 'pending');

create policy appointments_admin_all
  on public.appointments for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- blocked_slots: uso exclusivamente administrativo.
create policy blocked_slots_admin_all
  on public.blocked_slots for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- gallery_photos: público só vê publicadas; admin vê e gerencia tudo.
create policy gallery_photos_public_read
  on public.gallery_photos for select
  to anon
  using (published = true);

create policy gallery_photos_admin_all
  on public.gallery_photos for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- transactions: financeiro é 100% privado, sem nenhum acesso público.
create policy transactions_admin_all
  on public.transactions for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
