-- Fase 4 — bucket público pro upload de fotos da galeria pelo painel.
-- Público (leitura sem autenticação, mesmo padrão de gallery_photos_public_read),
-- mas insert/update/delete só pra admin autenticado.

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy gallery_storage_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'gallery');

create policy gallery_storage_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery');

create policy gallery_storage_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery');

create policy gallery_storage_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery');
