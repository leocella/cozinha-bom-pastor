-- =====================================================================
-- Migration: 0004_tipos_cadastro.sql
-- Suporte a dois tipos de ficha: 'rua' (existente) e 'familia' (novo).
-- Todos os campos novos são opcionais; apenas 'tipo' é obrigatório
-- (com default 'rua', que também classifica os cadastros já existentes).
-- =====================================================================

alter table public.acolhidos
  add column if not exists tipo text not null default 'rua'
    check (tipo in ('rua','familia'));

-- Campos comuns aos dois tipos
alter table public.acolhidos add column if not exists artigo text;            -- passagem policial / artigo
alter table public.acolhidos add column if not exists tem_bo boolean;         -- há Boletim de Ocorrência?
alter table public.acolhidos add column if not exists autoriza_imagem boolean;
alter table public.acolhidos add column if not exists data_cadastro date default current_date;

-- Campos da ficha de família / idoso
alter table public.acolhidos add column if not exists bairro text;
alter table public.acolhidos add column if not exists cidade text;
alter table public.acolhidos add column if not exists paga_aluguel boolean;
alter table public.acolhidos add column if not exists valor_aluguel numeric(10,2);
alter table public.acolhidos add column if not exists casa_propria boolean;
alter table public.acolhidos add column if not exists filhos int;
alter table public.acolhidos add column if not exists beneficio text;
alter table public.acolhidos add column if not exists responsavel_legal text;
alter table public.acolhidos add column if not exists motivos text[];

create index if not exists acolhidos_tipo_idx on public.acolhidos(tipo);

-- A view congela a lista de colunas na criação, então precisa ser recriada
-- para expor as colunas novas (ex.: tipo). Como as novas colunas entram antes
-- de ultima_presenca/total_presencas, "create or replace" falha (42P16) por
-- reordenação — por isso dropamos e recriamos.
drop view if exists public.vw_acolhidos;
create view public.vw_acolhidos
with (security_invoker = on) as
select
  a.*,
  (select max(p.data) from public.presencas p where p.acolhido_id = a.id) as ultima_presenca,
  (select count(*)::int from public.presencas p where p.acolhido_id = a.id) as total_presencas
from public.acolhidos a;
