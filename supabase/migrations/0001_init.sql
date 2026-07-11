-- =====================================================================
-- Cozinha Comunitária — schema inicial
-- Cadastro de acolhidos (pessoas em situação de rua) + registro de presença
-- Rode este arquivo no SQL Editor do seu Supabase (uma vez).
-- =====================================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Tabela: acolhidos ----------
create table if not exists public.acolhidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  como_chamar text,                 -- apelido / como gosta de ser chamado(a)
  foto_path text,                   -- caminho do objeto no bucket "fotos"
  idade_aproximada int,
  data_nascimento date,
  documento text,                   -- pode não ter; nunca obrigatório
  cidade_origem text,
  contato_referencia text,          -- familiar/pessoa de referência + telefone
  restricoes_alimentares text,
  observacoes text,                 -- anotações gerais / encaminhamentos (CRAS, CAPS...)
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists acolhidos_created_by_idx on public.acolhidos(created_by);
create index if not exists acolhidos_nome_idx on public.acolhidos(lower(nome));

-- ---------- Tabela: presencas ----------
create table if not exists public.presencas (
  id uuid primary key default gen_random_uuid(),
  acolhido_id uuid not null references public.acolhidos(id) on delete cascade,
  data date not null default current_date,
  refeicao text check (refeicao in ('cafe','almoco','janta','outro')),
  observacao text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists presencas_acolhido_idx on public.presencas(acolhido_id);
create index if not exists presencas_data_idx on public.presencas(data);
create index if not exists presencas_created_by_idx on public.presencas(created_by);

-- Evita marcar a mesma pessoa duas vezes no mesmo dia por engano.
-- (Se quiser permitir várias refeições/dia, remova este índice.)
create unique index if not exists presencas_um_por_dia
  on public.presencas(acolhido_id, data);

-- ---------- RLS ----------
alter table public.acolhidos enable row level security;
alter table public.presencas enable row level security;

-- Acolhidos: cada usuário só enxerga/gerencia os próprios registros
drop policy if exists "acolhidos_select_own" on public.acolhidos;
create policy "acolhidos_select_own" on public.acolhidos
  for select using (auth.uid() = created_by);

drop policy if exists "acolhidos_insert_own" on public.acolhidos;
create policy "acolhidos_insert_own" on public.acolhidos
  for insert with check (auth.uid() = created_by);

drop policy if exists "acolhidos_update_own" on public.acolhidos;
create policy "acolhidos_update_own" on public.acolhidos
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "acolhidos_delete_own" on public.acolhidos;
create policy "acolhidos_delete_own" on public.acolhidos
  for delete using (auth.uid() = created_by);

-- Presenças: idem
drop policy if exists "presencas_select_own" on public.presencas;
create policy "presencas_select_own" on public.presencas
  for select using (auth.uid() = created_by);

drop policy if exists "presencas_insert_own" on public.presencas;
create policy "presencas_insert_own" on public.presencas
  for insert with check (auth.uid() = created_by);

drop policy if exists "presencas_update_own" on public.presencas;
create policy "presencas_update_own" on public.presencas
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "presencas_delete_own" on public.presencas;
create policy "presencas_delete_own" on public.presencas
  for delete using (auth.uid() = created_by);

-- ---------- View: acolhidos + resumo (respeita RLS via security_invoker) ----------
create or replace view public.vw_acolhidos
with (security_invoker = on) as
select
  a.*,
  (select max(p.data) from public.presencas p where p.acolhido_id = a.id) as ultima_presenca,
  (select count(*)::int from public.presencas p where p.acolhido_id = a.id) as total_presencas
from public.acolhidos a;

-- ---------- Storage: bucket privado de fotos ----------
-- insert into storage.buckets (id, name, public)
-- values ('fotos', 'fotos', false)
-- on conflict (id) do nothing;

-- Cada usuário só acessa objetos dentro da "pasta" com o próprio uid.
-- Caminho esperado: {auth.uid()}/{uuid}.jpg
-- drop policy if exists "fotos_select_own" on storage.objects;
-- create policy "fotos_select_own" on storage.objects
--   for select to authenticated
--   using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- drop policy if exists "fotos_insert_own" on storage.objects;
-- create policy "fotos_insert_own" on storage.objects
--   for insert to authenticated
--   with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- drop policy if exists "fotos_update_own" on storage.objects;
-- create policy "fotos_update_own" on storage.objects
--   for update to authenticated
--   using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- drop policy if exists "fotos_delete_own" on storage.objects;
-- create policy "fotos_delete_own" on storage.objects
--   for delete to authenticated
--   using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
