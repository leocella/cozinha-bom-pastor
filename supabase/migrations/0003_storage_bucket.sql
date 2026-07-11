-- =====================================================================
-- Migration: 0003_storage_bucket.sql
-- Cria o bucket "fotos" e políticas RLS para os operadores e para o Admin
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

-- Cada usuário só acessa objetos dentro da "pasta" com o próprio uid.
-- Caminho esperado: {auth.uid()}/{uuid}.jpg
create policy "fotos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- Permissão de Administrador no Storage
-- UUID: b9f2499f-8cf8-48af-a8ad-9151baaa58d2
-- =====================================================================
create policy "fotos_admin_all" on storage.objects
  for all using (
    bucket_id = 'fotos' and auth.uid() = 'b9f2499f-8cf8-48af-a8ad-9151baaa58d2'::uuid
  ) with check (
    bucket_id = 'fotos' and auth.uid() = 'b9f2499f-8cf8-48af-a8ad-9151baaa58d2'::uuid
  );
