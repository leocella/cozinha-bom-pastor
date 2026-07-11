-- =====================================================================
-- Migration: 0002_admin_access.sql
-- Concede acesso total (admin) para o usuário especificado
-- UUID: b9f2499f-8cf8-48af-a8ad-9151baaa58d2
-- =====================================================================

-- Políticas para acesso irrestrito na tabela acolhidos
create policy "acolhidos_admin_all" on public.acolhidos
  for all using (auth.uid() = 'b9f2499f-8cf8-48af-a8ad-9151baaa58d2'::uuid)
  with check (auth.uid() = 'b9f2499f-8cf8-48af-a8ad-9151baaa58d2'::uuid);

-- Políticas para acesso irrestrito na tabela presencas
create policy "presencas_admin_all" on public.presencas
  for all using (auth.uid() = 'b9f2499f-8cf8-48af-a8ad-9151baaa58d2'::uuid)
  with check (auth.uid() = 'b9f2499f-8cf8-48af-a8ad-9151baaa58d2'::uuid);
