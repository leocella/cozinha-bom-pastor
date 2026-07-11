-- =====================================================================
-- Migration: 0005_admin_evandro.sql
-- Concede acesso total (admin) ao usuário evandroribeiro2407@hotmail.com
-- UUID: e1b733b4-4553-4a4f-a921-e77df72f569c
-- (mesmo padrão do 0002_admin_access.sql, aditivo)
-- =====================================================================

drop policy if exists "acolhidos_admin_evandro" on public.acolhidos;
create policy "acolhidos_admin_evandro" on public.acolhidos
  for all using (auth.uid() = 'e1b733b4-4553-4a4f-a921-e77df72f569c'::uuid)
  with check (auth.uid() = 'e1b733b4-4553-4a4f-a921-e77df72f569c'::uuid);

drop policy if exists "presencas_admin_evandro" on public.presencas;
create policy "presencas_admin_evandro" on public.presencas
  for all using (auth.uid() = 'e1b733b4-4553-4a4f-a921-e77df72f569c'::uuid)
  with check (auth.uid() = 'e1b733b4-4553-4a4f-a921-e77df72f569c'::uuid);
