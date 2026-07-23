-- =====================================================================
-- Migration: 0007_ajustes_filhos_pensao_renda.sql
-- Novas colunas nos cadastros:
-- - filhos_detalhes (jsonb): lista de filhos com nome e idade
-- - paga_pensao (boolean): indica se paga pensão alimentícia (Rua)
-- - renda_familiar (numeric 10,2): valor da renda familiar em R$ (Família)
-- =====================================================================

alter table public.acolhidos add column if not exists filhos_detalhes jsonb default '[]'::jsonb;
alter table public.acolhidos add column if not exists paga_pensao boolean;
alter table public.acolhidos add column if not exists renda_familiar numeric(10,2);

-- Recria a view vw_acolhidos para incluir as novas colunas
drop view if exists public.vw_acolhidos;
create view public.vw_acolhidos
with (security_invoker = on) as
select
  a.*,
  (select max(p.data) from public.presencas p where p.acolhido_id = a.id) as ultima_presenca,
  (select count(*)::int from public.presencas p where p.acolhido_id = a.id) as total_presencas
from public.acolhidos a;
