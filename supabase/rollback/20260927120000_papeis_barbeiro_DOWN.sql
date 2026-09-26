-- ROLLBACK dos papéis/barbeiro e comissões (leitura). NÃO é migração: só rode se precisar desfazer.
-- ATENÇÃO: desfazer RESTAURA as policies antigas "qualquer usuário autenticado é admin". Por isso o script
-- recusa se existir login de barbeiro vinculado (ele viraria administrador). Desvincule-os antes
-- (ou confirme abaixo, o que apaga os perfis de barbeiro). Comissões e regras (dados) NÃO são tocadas.
begin;

do $$
declare
  confirmo_apagar_perfis_de_barbeiro constant boolean := false;
begin
  if exists (select 1 from public.admin_profiles where role = 'barber') then
    if not confirmo_apagar_perfis_de_barbeiro then
      raise exception 'rollback_recusado: existe login de barbeiro. Sem a nova RLS ele viraria admin. Desvincule ou confirme.';
    end if;
    delete from public.admin_profiles where role = 'barber';
  end if;
end $$;

drop function if exists public.barber_commissions(date, date);
drop function if exists public.barber_summary(date, date);
drop function if exists public.barber_agenda(date, date);
drop function if exists public.barber_me();
drop function if exists public.commission_report(date, date);
drop function if exists public.list_commissions(date, date, uuid);
drop function if exists public.fin_commission_rows(date, date, uuid);
drop function if exists public.list_staff_access();
drop function if exists public.unlink_barber(uuid);
drop function if exists public.link_barber(uuid, text);
drop function if exists public.fin_require_barber();
drop function if exists public.current_staff_id();

drop policy if exists appointments_authenticated_public_insert on public.appointments;
drop policy if exists clients_authenticated_public_insert on public.clients;
drop policy if exists gallery_photos_authenticated_public_read on public.gallery_photos;
drop policy if exists staff_authenticated_public_read on public.staff;
drop policy if exists services_authenticated_public_read on public.services;

-- policies antigas restauradas (qualquer autenticado)
drop policy business_settings_admin_update on public.business_settings;
create policy business_settings_admin_update on public.business_settings for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy services_admin_all on public.services;
create policy services_admin_all on public.services for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy clients_admin_all on public.clients;
create policy clients_admin_all on public.clients for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy appointments_admin_all on public.appointments;
create policy appointments_admin_all on public.appointments for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy blocked_slots_admin_all on public.blocked_slots;
create policy blocked_slots_admin_all on public.blocked_slots for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy gallery_photos_admin_all on public.gallery_photos;
create policy gallery_photos_admin_all on public.gallery_photos for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy transactions_admin_all on public.transactions;
create policy transactions_admin_all on public.transactions for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy staff_admin_all on public.staff;
create policy staff_admin_all on public.staff for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy gallery_storage_admin_insert on storage.objects;
drop policy gallery_storage_admin_update on storage.objects;
drop policy gallery_storage_admin_delete on storage.objects;
drop policy staff_storage_admin_insert on storage.objects;
drop policy staff_storage_admin_update on storage.objects;
drop policy staff_storage_admin_delete on storage.objects;
create policy gallery_storage_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'gallery');
create policy gallery_storage_admin_update on storage.objects for update to authenticated using (bucket_id = 'gallery');
create policy gallery_storage_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'gallery');
create policy staff_storage_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'staff');
create policy staff_storage_admin_update on storage.objects for update to authenticated using (bucket_id = 'staff');
create policy staff_storage_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'staff');

drop policy if exists admin_profiles_owner_read on public.admin_profiles;
drop index if exists public.admin_profiles_one_login_per_staff;
alter table public.admin_profiles drop constraint if exists admin_profiles_barber_has_staff;

commit;
