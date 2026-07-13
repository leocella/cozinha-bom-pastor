-- =====================================================================
-- Migration: 0006_rua_numero.sql
-- Adiciona campos de endereço (rua e número) na ficha do acolhido.
-- Campos opcionais, aplicáveis a qualquer tipo de cadastro.
-- =====================================================================

alter table public.acolhidos add column if not exists rua text;
alter table public.acolhidos add column if not exists numero text;

-- Recria a view para incluir as novas colunas
drop view if exists public.vw_acolhidos;
create view public.vw_acolhidos
with (security_invoker = on) as
select
  a.*,
  (select max(p.data) from public.presencas p where p.acolhido_id = a.id) as ultima_presenca,
  (select count(*)::int from public.presencas p where p.acolhido_id = a.id) as total_presencas
from public.acolhidos a;
