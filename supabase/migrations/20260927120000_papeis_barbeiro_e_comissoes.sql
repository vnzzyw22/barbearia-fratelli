-- ═══════════════════════════════════════════════════════════════════════════
-- FRATELLI BARBER CLUB — papéis (owner / barber), acesso do barbeiro e comissões
-- ═══════════════════════════════════════════════════════════════════════════
-- ADITIVA: não apaga dados nem tabelas. Uma transação (falhou, nada é aplicado).
-- Depende de 20260925120000 (admin_profiles, is_owner, commissions) e 20260926120000.
--
-- POR QUE ISTO É NECESSÁRIO ANTES DE CRIAR QUALQUER USUÁRIO barber:
-- as policies antigas de clientes, agendamentos, serviços, equipe, bloqueios, galeria,
-- configurações e transações são "qualquer usuário autenticado = admin". Um barbeiro
-- logado enxergaria e editaria tudo. Aqui elas passam a exigir is_owner().
-- O que o barbeiro vê vem SÓ de funções que descobrem quem ele é pelo login (auth.uid()),
-- nunca por um id enviado pelo cliente: não há parâmetro de barbeiro para adulterar.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Perfis: barbeiro exige profissional; um profissional tem no máximo um login
-- ───────────────────────────────────────────────────────────────────────────
alter table public.admin_profiles add constraint admin_profiles_barber_has_staff
  check (role <> 'barber' or staff_id is not null);
create unique index admin_profiles_one_login_per_staff on public.admin_profiles (staff_id)
  where role = 'barber';

create policy admin_profiles_owner_read on public.admin_profiles
  for select to authenticated using (public.is_owner());

create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select staff_id from public.admin_profiles
  where user_id = (select auth.uid()) and role = 'barber';
$$;

create or replace function public.fin_require_barber()
returns uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v uuid := public.current_staff_id();
begin
  if v is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return v;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Policies antigas: de "qualquer autenticado" para "só o dono"
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists business_settings_admin_update on public.business_settings;
create policy business_settings_admin_update on public.business_settings
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists services_admin_all on public.services;
create policy services_admin_all on public.services
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists clients_admin_all on public.clients;
create policy clients_admin_all on public.clients
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists appointments_admin_all on public.appointments;
create policy appointments_admin_all on public.appointments
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists blocked_slots_admin_all on public.blocked_slots;
create policy blocked_slots_admin_all on public.blocked_slots
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists gallery_photos_admin_all on public.gallery_photos;
create policy gallery_photos_admin_all on public.gallery_photos
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists transactions_admin_all on public.transactions;
create policy transactions_admin_all on public.transactions
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists staff_admin_all on public.staff;
create policy staff_admin_all on public.staff
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists gallery_storage_admin_insert on storage.objects;
drop policy if exists gallery_storage_admin_update on storage.objects;
drop policy if exists gallery_storage_admin_delete on storage.objects;
drop policy if exists staff_storage_admin_insert on storage.objects;
drop policy if exists staff_storage_admin_update on storage.objects;
drop policy if exists staff_storage_admin_delete on storage.objects;
create policy gallery_storage_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_owner());
create policy gallery_storage_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'gallery' and public.is_owner());
create policy gallery_storage_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and public.is_owner());
create policy staff_storage_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'staff' and public.is_owner());
create policy staff_storage_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'staff' and public.is_owner());
create policy staff_storage_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'staff' and public.is_owner());

-- O site público lê serviços/equipe/galeria como "anon". Um barbeiro LOGADO navegando no site
-- é "authenticated" e deixaria de ver esses dados públicos: estas policies mantêm o site igual.
create policy services_authenticated_public_read on public.services
  for select to authenticated using (active = true);
create policy staff_authenticated_public_read on public.staff
  for select to authenticated using (active = true);
create policy gallery_photos_authenticated_public_read on public.gallery_photos
  for select to authenticated using (published = true);
create policy clients_authenticated_public_insert on public.clients
  for insert to authenticated with check (true);
create policy appointments_authenticated_public_insert on public.appointments
  for insert to authenticated with check (status = 'pending');

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Vincular login ↔ profissional (o dono cria o usuário no Supabase Auth e vincula aqui)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.link_barber(p_staff_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid; v_role text;
begin
  perform public.fin_require_owner();
  if not exists (select 1 from public.staff where id = p_staff_id) then
    raise exception 'staff_not_found' using errcode = 'P0001';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if v_user is null then raise exception 'user_not_found' using errcode = 'P0001'; end if;
  select role into v_role from public.admin_profiles where user_id = v_user;
  if v_role = 'owner' then raise exception 'user_is_owner' using errcode = 'P0001'; end if;
  if exists (select 1 from public.admin_profiles where role = 'barber' and staff_id = p_staff_id and user_id <> v_user) then
    raise exception 'staff_already_linked' using errcode = 'P0001';
  end if;
  insert into public.admin_profiles (user_id, role, staff_id, display_name)
  values (v_user, 'barber', p_staff_id, lower(trim(p_email)))
  on conflict (user_id) do update set role = 'barber', staff_id = excluded.staff_id;
  return jsonb_build_object('user_id', v_user, 'staff_id', p_staff_id);
end;
$$;

create or replace function public.unlink_barber(p_staff_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_n integer;
begin
  perform public.fin_require_owner();
  delete from public.admin_profiles where role = 'barber' and staff_id = p_staff_id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function public.list_staff_access()
returns table (staff_id uuid, staff_name text, user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.fin_require_owner();
  return query
    select s.id, s.name, p.user_id, u.email::text
    from public.staff s
    left join public.admin_profiles p on p.staff_id = s.id and p.role = 'barber'
    left join auth.users u on u.id = p.user_id
    order by s.name;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Comissões: leitura (uso interno) e relatório do dono
--    A comissão já nasce na conclusão do atendimento (complete_appointment), 1 por item
--    (unique appointment_item_id), com o percentual CONGELADO. Aqui só se lê.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fin_commission_rows(p_from date, p_to date, p_staff uuid)
returns table (
  commission_id uuid, competence_date date, staff_id uuid, staff_name text, description text, client_name text,
  base_cents integer, rate_bps integer, amount_cents integer, status text, entry_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, ie.competence_date, c.staff_id, st.name, i.description, cl.name,
         c.base_cents, c.rate_bps, c.amount_cents, c.status, c.entry_id
  from public.commissions c
  join public.appointment_items i on i.id = c.appointment_item_id
  join public.financial_entries ie on ie.appointment_item_id = i.id and ie.kind = 'income' and ie.status <> 'cancelled'
  left join public.staff st on st.id = c.staff_id
  left join public.appointments a on a.id = i.appointment_id
  left join public.clients cl on cl.id = a.client_id
  where c.status <> 'cancelled'
    and ie.competence_date between p_from and p_to
    and (p_staff is null or c.staff_id = p_staff)
  order by ie.competence_date desc, c.created_at desc;
$$;

create or replace function public.list_commissions(p_from date, p_to date, p_staff uuid default null)
returns table (
  commission_id uuid, competence_date date, staff_id uuid, staff_name text, description text, client_name text,
  base_cents integer, rate_bps integer, amount_cents integer, status text, entry_id uuid
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.fin_require_owner();
  return query select * from public.fin_commission_rows(p_from, p_to, p_staff);
end;
$$;

create or replace function public.commission_report(p_from date, p_to date)
returns table (
  staff_id uuid, staff_name text, appointments bigint, revenue_cents bigint,
  commission_cents bigint, pending_cents bigint, paid_cents bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.fin_require_owner();
  return query
    with rev as (
      select e.staff_id, count(distinct e.appointment_id) as appts, sum(e.amount_cents) as revenue
      from public.financial_entries e
      where e.kind = 'income' and e.status <> 'cancelled' and e.appointment_item_id is not null
        and e.competence_date between p_from and p_to
      group by e.staff_id
    ), com as (
      select r.staff_id, sum(r.amount_cents) as total,
             sum(r.amount_cents) filter (where r.status = 'pending') as pending,
             sum(r.amount_cents) filter (where r.status = 'paid') as paid
      from public.fin_commission_rows(p_from, p_to, null) r
      group by r.staff_id
    )
    select s.id, s.name, coalesce(rev.appts, 0)::bigint, coalesce(rev.revenue, 0)::bigint,
           coalesce(com.total, 0)::bigint, coalesce(com.pending, 0)::bigint, coalesce(com.paid, 0)::bigint
    from public.staff s
    left join rev on rev.staff_id = s.id
    left join com on com.staff_id = s.id
    where s.active or rev.revenue > 0
    order by coalesce(rev.revenue, 0) desc, s.name;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Visão do barbeiro: o profissional vem do LOGIN; nenhuma função recebe id de barbeiro
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.barber_me()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v uuid := public.fin_require_barber();
begin
  return (select jsonb_build_object('staff_id', s.id, 'name', s.name) from public.staff s where s.id = v);
end;
$$;

-- Agenda própria. Do cliente, só o primeiro nome (o barbeiro não precisa do cadastro completo).
create or replace function public.barber_agenda(p_from date, p_to date)
returns table (
  appointment_id uuid, starts_at timestamptz, ends_at timestamptz, status text, service_name text, client_first_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v uuid := public.fin_require_barber();
begin
  return query
    select a.id, a.starts_at, a.ends_at, a.status, sv.name, split_part(c.name, ' ', 1)
    from public.appointments a
    left join public.services sv on sv.id = a.service_id
    left join public.clients c on c.id = a.client_id
    where a.staff_id = v
      and (a.starts_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
    order by a.starts_at;
end;
$$;

create or replace function public.barber_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v uuid := public.fin_require_barber();
begin
  return jsonb_build_object(
    'appointments', coalesce((select count(distinct e.appointment_id) from public.financial_entries e
                               where e.kind = 'income' and e.status <> 'cancelled' and e.appointment_item_id is not null
                                 and e.staff_id = v and e.competence_date between p_from and p_to), 0),
    'revenue_cents', coalesce((select sum(e.amount_cents) from public.financial_entries e
                                where e.kind = 'income' and e.status <> 'cancelled' and e.appointment_item_id is not null
                                  and e.staff_id = v and e.competence_date between p_from and p_to), 0),
    'commission_cents', coalesce((select sum(r.amount_cents) from public.fin_commission_rows(p_from, p_to, v) r), 0),
    'pending_cents', coalesce((select sum(r.amount_cents) from public.fin_commission_rows(p_from, p_to, v) r where r.status = 'pending'), 0),
    'paid_cents', coalesce((select sum(r.amount_cents) from public.fin_commission_rows(p_from, p_to, v) r where r.status = 'paid'), 0)
  );
end;
$$;

create or replace function public.barber_commissions(p_from date, p_to date)
returns table (
  competence_date date, description text, client_first_name text,
  base_cents integer, rate_bps integer, amount_cents integer, status text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v uuid := public.fin_require_barber();
begin
  return query
    select r.competence_date, r.description, split_part(r.client_name, ' ', 1),
           r.base_cents, r.rate_bps, r.amount_cents, r.status
    from public.fin_commission_rows(p_from, p_to, v) r;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Permissões de execução
-- ───────────────────────────────────────────────────────────────────────────
revoke all on function
  public.current_staff_id(), public.fin_require_barber(), public.fin_commission_rows(date, date, uuid),
  public.link_barber(uuid, text), public.unlink_barber(uuid), public.list_staff_access(),
  public.list_commissions(date, date, uuid), public.commission_report(date, date),
  public.barber_me(), public.barber_agenda(date, date), public.barber_summary(date, date),
  public.barber_commissions(date, date)
  from public, anon, authenticated;

grant execute on function
  public.link_barber(uuid, text), public.unlink_barber(uuid), public.list_staff_access(),
  public.list_commissions(date, date, uuid), public.commission_report(date, date),
  public.barber_me(), public.barber_agenda(date, date), public.barber_summary(date, date),
  public.barber_commissions(date, date)
  to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Trava de segurança: se sobrou QUALQUER policy "autenticado = admin" nas tabelas do painel
--    (nome diferente do esperado, por exemplo), a migração inteira é desfeita em vez de deixar o buraco.
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare v_left text;
begin
  select string_agg(schemaname || '.' || tablename || ':' || policyname, ', ') into v_left
  from pg_policies
  where ((schemaname = 'public' and tablename in ('business_settings', 'services', 'clients', 'appointments',
                                                  'blocked_slots', 'gallery_photos', 'transactions', 'staff'))
      or (schemaname = 'storage' and tablename = 'objects'))
    and 'authenticated' = any (roles)
    and (coalesce(qual, '') ~* 'uid\(\).*is not null' or coalesce(with_check, '') ~* 'uid\(\).*is not null');
  if v_left is not null then
    raise exception 'policy_antiga_ainda_existe: %', v_left;
  end if;
end $$;

commit;
