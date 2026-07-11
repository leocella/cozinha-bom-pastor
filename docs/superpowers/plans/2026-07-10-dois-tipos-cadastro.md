# Dois Tipos de Cadastro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suportar dois tipos de ficha (morador de rua e família/idoso) numa única tabela `acolhidos`, com formulário, listagem, detalhe e export adaptados por tipo, sem tocar no registro de presenças.

**Architecture:** Uma tabela `acolhidos` ganha uma coluna discriminadora `tipo` e várias colunas opcionais. O formulário client-side mostra/esconde blocos de campos conforme o tipo. Listagem filtra por tipo via abas client-side. Export CSV ganha um parâmetro `?publico=` para filtrar por tipo. `presencas`, RLS, auth e storage ficam intactos.

**Tech Stack:** Next.js 14 (App Router, Server Actions), Supabase (Postgres + RLS), TypeScript, Tailwind, lucide-react.

## Global Constraints

- **Sem framework de testes** neste projeto (não há Jest/Vitest). Verificação de cada task = `npm run build` (typecheck do TS + build Next) **deve passar**, `npm run lint` sem erros novos, e uma checagem manual descrita na task. Não adicionar dependências de teste.
- Só `nome` e `tipo` são obrigatórios; **todo o resto é opcional/nulável**.
- Booleanos são tri-estado: `true` (Sim), `false` (Não), `null` (não informado). No form são `<select>` com `""`/`sim`/`nao`.
- `motivos` é `text[]`; opções fixas: `Desemprego`, `Baixa renda`, `Idoso(a) sem renda`, `Doença na família`.
- Manter no export: **BOM UTF-8** (`﻿`) e separador **`;`**.
- Diretório de trabalho: `cozinha-comunitaria/` (o projeto Next fica aqui, não na raiz).
- Seguir o padrão visual existente: classes `card`, `field`, `label`, `btn-brand`, `btn-ghost`, `rounded-xl2`, `bg-brand-soft`, `text-brand`, `text-muted`, `text-danger`.
- Spec de referência: `docs/superpowers/specs/2026-07-10-dois-tipos-cadastro-design.md`.

## Pré-requisito: git

O diretório `cozinha-comunitaria/` **não é um repositório git**. Antes da Task 1, inicialize para permitir commits:

```bash
cd cozinha-comunitaria
git init
git add -A
git commit -m "chore: baseline antes dos dois tipos de cadastro"
```

Se o usuário preferir não versionar, pule todos os passos "Commit".

## File Structure

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/migrations/0004_tipos_cadastro.sql` | Colunas novas + índice de tipo (rodado manualmente no SQL Editor do Supabase) |
| `src/lib/types.ts` | `Tipo`, `TIPOS`, `MOTIVOS`, helpers `labelTipo`/`simNao`/`formatarBRL`, campos novos em `Acolhido` |
| `src/lib/actions/acolhidos.ts` | Ler campos novos do FormData (helpers `bool`/`numDec`/`arr`/`tipoDe`) |
| `src/components/FormAcolhido.tsx` | Seletor de tipo + blocos de campos condicionais |
| `src/app/(app)/acolhidos/novo/page.tsx` | Ler `?tipo=` para pré-selecionar |
| `src/components/BuscaAcolhidos.tsx` | Abas de filtro por tipo + etiqueta no card |
| `src/app/(app)/inicio/page.tsx` | Passar `tipo` para a lista |
| `src/app/(app)/acolhidos/[id]/page.tsx` | Exibir campos por tipo + badge |
| `src/app/api/export/route.ts` | `?publico=rua\|familia` + colunas novas |
| `src/app/(app)/relatorios/page.tsx` | Links de export por público |

Ordem das tasks respeita dependências: banco+tipos primeiro (base), depois actions, form, listagem, detalhe, export.

---

### Task 1: Migração de banco + tipos TypeScript

Banco e tipos mudam juntos (os tipos TS precisam refletir o schema). O SQL é rodado manualmente no Supabase; o TS é verificado pelo build.

**Files:**
- Create: `supabase/migrations/0004_tipos_cadastro.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `type Tipo = "rua" | "familia"`; `TIPOS`; `MOTIVOS: string[]`; `labelTipo(t: string | null): string`; `simNao(b: boolean | null): string | null`; `formatarBRL(v: number | null): string | null`; campos novos em `Acolhido` (`tipo: Tipo`, `artigo/beneficio/responsavel_legal/bairro/cidade: string | null`, `tem_bo/autoriza_imagem/paga_aluguel/casa_propria: boolean | null`, `valor_aluguel/filhos: number | null`, `data_cadastro: string | null`, `motivos: string[] | null`).

- [ ] **Step 1: Criar a migração SQL**

Create `supabase/migrations/0004_tipos_cadastro.sql`:

```sql
-- =====================================================================
-- Migration: 0004_tipos_cadastro.sql
-- Suporte a dois tipos de ficha: 'rua' (existente) e 'familia' (novo).
-- Todos os campos novos são opcionais; apenas 'tipo' é obrigatório
-- (com default 'rua', que também classifica os cadastros já existentes).
-- Rode no SQL Editor do Supabase.
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
```

- [x] **Step 2: Aplicar a migração via CLI (npx)** — FEITO (2026-07-10)

O projeto está linkado (`.temp/linked-project.json` → ref `lougwvpqbniogfncgtum`) e a CLI autentica sem senha (credenciais em cache). O histórico remoto já rastreava `0001–0003`, então o push aplicou só o `0004`:

```bash
cd cozinha-comunitaria
npx supabase migration list --linked          # confere estado (read-only)
printf 'Y\n' | npx supabase db push --linked  # aplica só 0004
```

Verificação: `npx supabase migration list --linked` mostra `0004 | 0004 | 0004` (aplicado no remoto).

- [ ] **Step 3: Adicionar tipos e helpers em `types.ts`**

Em `src/lib/types.ts`, logo após o bloco de `REFEICOES`/`labelRefeicao`, adicione:

```ts
export type Tipo = "rua" | "familia";

export const TIPOS: { value: Tipo; label: string }[] = [
  { value: "rua", label: "Morador de rua" },
  { value: "familia", label: "Família / Idoso" },
];

export function labelTipo(t: string | null): string {
  return TIPOS.find((x) => x.value === t)?.label ?? "—";
}

export const MOTIVOS: string[] = [
  "Desemprego",
  "Baixa renda",
  "Idoso(a) sem renda",
  "Doença na família",
];

export function simNao(b: boolean | null): string | null {
  if (b == null) return null;
  return b ? "Sim" : "Não";
}

export function formatarBRL(v: number | null): string | null {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
```

- [ ] **Step 4: Estender o type `Acolhido`**

Em `src/lib/types.ts`, substitua o type `Acolhido` inteiro por:

```ts
export type Acolhido = {
  id: string;
  nome: string;
  como_chamar: string | null;
  foto_path: string | null;
  idade_aproximada: number | null;
  data_nascimento: string | null;
  documento: string | null;
  cidade_origem: string | null;
  contato_referencia: string | null;
  restricoes_alimentares: string | null;
  observacoes: string | null;
  status: "ativo" | "inativo";
  created_by: string;
  created_at: string;
  // tipo + campos novos
  tipo: Tipo;
  artigo: string | null;
  tem_bo: boolean | null;
  autoriza_imagem: boolean | null;
  data_cadastro: string | null;
  bairro: string | null;
  cidade: string | null;
  paga_aluguel: boolean | null;
  valor_aluguel: number | null;
  casa_propria: boolean | null;
  filhos: number | null;
  beneficio: string | null;
  responsavel_legal: string | null;
  motivos: string[] | null;
};
```

(`AcolhidoResumo` continua estendendo `Acolhido`, então herda os campos novos automaticamente.)

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros de TypeScript. (Nada consome os campos novos ainda, então só validamos que os tipos compilam.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0004_tipos_cadastro.sql src/lib/types.ts
git commit -m "feat: schema e tipos para dois tipos de cadastro"
```

---

### Task 2: Server Actions leem os campos novos

**Files:**
- Modify: `src/lib/actions/acolhidos.ts`

**Interfaces:**
- Consumes: helpers `str`/`num` já existentes no arquivo.
- Produces: `montarPayload(formData)` retorna objeto com todos os campos novos, incluindo `tipo`. Nomes de campo do FormData que o form da Task 3 deve usar: `tipo`, `artigo`, `tem_bo`, `autoriza_imagem`, `data_cadastro`, `bairro`, `cidade`, `paga_aluguel`, `valor_aluguel`, `casa_propria`, `filhos`, `beneficio`, `responsavel_legal`, `motivos` (múltiplo).

- [ ] **Step 1: Adicionar helpers de parsing**

Em `src/lib/actions/acolhidos.ts`, logo após a função `num(...)`, adicione:

```ts
function bool(v: FormDataEntryValue | null): boolean | null {
  const s = (v ?? "").toString().trim();
  if (s === "sim") return true;
  if (s === "nao") return false;
  return null;
}

function numDec(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim().replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function arr(values: FormDataEntryValue[]): string[] | null {
  const list = values.map((v) => v.toString().trim()).filter(Boolean);
  return list.length ? list : null;
}

function tipoDe(v: FormDataEntryValue | null): "rua" | "familia" {
  return v?.toString() === "familia" ? "familia" : "rua";
}
```

- [ ] **Step 2: Estender `montarPayload`**

Substitua a função `montarPayload` inteira por:

```ts
function montarPayload(formData: FormData) {
  return {
    nome: (str(formData.get("nome")) ?? "").toString(),
    tipo: tipoDe(formData.get("tipo")),
    como_chamar: str(formData.get("como_chamar")),
    foto_path: str(formData.get("foto_path")),
    idade_aproximada: num(formData.get("idade_aproximada")),
    data_nascimento: str(formData.get("data_nascimento")),
    documento: str(formData.get("documento")),
    cidade_origem: str(formData.get("cidade_origem")),
    contato_referencia: str(formData.get("contato_referencia")),
    restricoes_alimentares: str(formData.get("restricoes_alimentares")),
    observacoes: str(formData.get("observacoes")),
    // comuns novos
    artigo: str(formData.get("artigo")),
    tem_bo: bool(formData.get("tem_bo")),
    autoriza_imagem: bool(formData.get("autoriza_imagem")),
    data_cadastro: str(formData.get("data_cadastro")),
    // família
    bairro: str(formData.get("bairro")),
    cidade: str(formData.get("cidade")),
    paga_aluguel: bool(formData.get("paga_aluguel")),
    valor_aluguel: numDec(formData.get("valor_aluguel")),
    casa_propria: bool(formData.get("casa_propria")),
    filhos: num(formData.get("filhos")),
    beneficio: str(formData.get("beneficio")),
    responsavel_legal: str(formData.get("responsavel_legal")),
    motivos: arr(formData.getAll("motivos")),
  };
}
```

(As funções `criarAcolhido`/`atualizarAcolhido`/`definirStatus` não mudam — continuam validando só `nome` e usando `montarPayload`.)

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sem erros. O insert/update agora envia as colunas novas; como todas existem no banco (Task 1), o Supabase aceita.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/acolhidos.ts
git commit -m "feat: server actions leem campos dos dois tipos"
```

---

### Task 3: Formulário com seletor de tipo e campos condicionais

**Files:**
- Modify: `src/components/FormAcolhido.tsx`
- Modify: `src/app/(app)/acolhidos/novo/page.tsx`

**Interfaces:**
- Consumes: `TIPOS`, `MOTIVOS`, `hojeISO`, types `Acolhido`/`Tipo` de `@/lib/types`; nomes de campo esperados pela Task 2.
- Produces: `FormAcolhido` aceita nova prop opcional `tipoInicial?: Tipo`.

- [ ] **Step 1: Reescrever `FormAcolhido.tsx`**

Substitua todo o conteúdo de `src/components/FormAcolhido.tsx` por:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Save } from "lucide-react";
import FotoUpload from "@/components/FotoUpload";
import { TIPOS, MOTIVOS, hojeISO, type Acolhido, type Tipo } from "@/lib/types";

function SimNao({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: boolean | null;
}) {
  const dv = defaultValue == null ? "" : defaultValue ? "sim" : "nao";
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} className="field" defaultValue={dv}>
        <option value="">—</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>
  );
}

export default function FormAcolhido({
  acolhido,
  fotoUrl,
  action,
  tipoInicial,
}: {
  acolhido?: Acolhido;
  fotoUrl?: string | null;
  action: (formData: FormData) => Promise<void>;
  tipoInicial?: Tipo;
}) {
  const [nome, setNome] = useState(acolhido?.nome ?? "");
  const [tipo, setTipo] = useState<Tipo>(
    acolhido?.tipo ?? tipoInicial ?? "rua",
  );
  const [pagaAluguel, setPagaAluguel] = useState<string>(
    acolhido?.paga_aluguel == null ? "" : acolhido.paga_aluguel ? "sim" : "nao",
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe pelo menos o nome.");
      return;
    }
    setSalvando(true);
    try {
      await action(new FormData(e.currentTarget));
      setSalvando(false);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro ao salvar. Tente de novo.",
      );
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Tipo de cadastro */}
      <div className="card p-5">
        <p className="label">Tipo de cadastro</p>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              aria-pressed={tipo === t.value}
              className={
                tipo === t.value
                  ? "rounded-xl2 border-2 border-brand bg-brand-soft px-4 py-3 text-sm font-semibold text-brand"
                  : "rounded-xl2 border-2 border-line px-4 py-3 text-sm font-medium text-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Foto */}
      <div className="card p-5">
        <p className="label">Foto</p>
        <FotoUpload
          nome={nome}
          initialPath={acolhido?.foto_path ?? null}
          initialUrl={fotoUrl ?? null}
        />
      </div>

      {/* Campos comuns */}
      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="nome">
            Nome <span className="text-danger">*</span>
          </label>
          <input
            id="nome"
            name="nome"
            required
            className="field"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="como_chamar">
            Como gosta de ser chamado(a) / apelido
          </label>
          <input
            id="como_chamar"
            name="como_chamar"
            className="field"
            defaultValue={acolhido?.como_chamar ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="data_nascimento">
              Data de nascimento
            </label>
            <input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              className="field"
              defaultValue={acolhido?.data_nascimento ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="data_cadastro">
              Data do cadastro
            </label>
            <input
              id="data_cadastro"
              name="data_cadastro"
              type="date"
              className="field"
              defaultValue={acolhido?.data_cadastro ?? hojeISO()}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="documento">
            Documento (opcional)
          </label>
          <input
            id="documento"
            name="documento"
            className="field"
            placeholder="RG, CPF ou outro"
            defaultValue={acolhido?.documento ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="contato_referencia">
            Contato de referência
          </label>
          <input
            id="contato_referencia"
            name="contato_referencia"
            className="field"
            placeholder="Nome e telefone de um familiar ou pessoa próxima"
            defaultValue={acolhido?.contato_referencia ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="artigo">
            Passagem policial / artigo
          </label>
          <input
            id="artigo"
            name="artigo"
            className="field"
            defaultValue={acolhido?.artigo ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SimNao
            name="tem_bo"
            label="Boletim de ocorrência (B.O.)"
            defaultValue={acolhido?.tem_bo}
          />
          <SimNao
            name="autoriza_imagem"
            label="Autoriza uso de imagem"
            defaultValue={acolhido?.autoriza_imagem}
          />
        </div>

        <div>
          <label className="label" htmlFor="observacoes">
            Observações / encaminhamentos
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            className="field"
            placeholder="Anotações gerais, encaminhamentos (CRAS, CAPS...), etc."
            defaultValue={acolhido?.observacoes ?? ""}
          />
        </div>
      </div>

      {/* Campos só de Rua */}
      {tipo === "rua" && (
        <div className="card space-y-4 p-5">
          <p className="text-sm font-semibold text-muted">
            Dados — morador de rua
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="idade_aproximada">
                Idade aproximada
              </label>
              <input
                id="idade_aproximada"
                name="idade_aproximada"
                type="number"
                min={0}
                max={130}
                inputMode="numeric"
                className="field"
                defaultValue={acolhido?.idade_aproximada ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="cidade_origem">
                Cidade de origem
              </label>
              <input
                id="cidade_origem"
                name="cidade_origem"
                className="field"
                defaultValue={acolhido?.cidade_origem ?? ""}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="restricoes_alimentares">
              Restrições alimentares
            </label>
            <input
              id="restricoes_alimentares"
              name="restricoes_alimentares"
              className="field"
              defaultValue={acolhido?.restricoes_alimentares ?? ""}
            />
          </div>
        </div>
      )}

      {/* Campos só de Família / Idoso */}
      {tipo === "familia" && (
        <div className="card space-y-4 p-5">
          <p className="text-sm font-semibold text-muted">
            Dados — família / idoso
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="bairro">
                Bairro
              </label>
              <input
                id="bairro"
                name="bairro"
                className="field"
                defaultValue={acolhido?.bairro ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="cidade">
                Cidade
              </label>
              <input
                id="cidade"
                name="cidade"
                className="field"
                defaultValue={acolhido?.cidade ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SimNao
              name="casa_propria"
              label="Casa própria"
              defaultValue={acolhido?.casa_propria}
            />
            <div>
              <label className="label" htmlFor="paga_aluguel">
                Paga aluguel
              </label>
              <select
                id="paga_aluguel"
                name="paga_aluguel"
                className="field"
                value={pagaAluguel}
                onChange={(e) => setPagaAluguel(e.target.value)}
              >
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>

          {pagaAluguel === "sim" && (
            <div>
              <label className="label" htmlFor="valor_aluguel">
                Valor do aluguel (R$)
              </label>
              <input
                id="valor_aluguel"
                name="valor_aluguel"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="field"
                defaultValue={acolhido?.valor_aluguel ?? ""}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="filhos">
                Quantidade de filhos
              </label>
              <input
                id="filhos"
                name="filhos"
                type="number"
                min={0}
                max={30}
                inputMode="numeric"
                className="field"
                defaultValue={acolhido?.filhos ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="beneficio">
                Benefício
              </label>
              <input
                id="beneficio"
                name="beneficio"
                className="field"
                placeholder="Bolsa Família, BPC..."
                defaultValue={acolhido?.beneficio ?? ""}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="responsavel_legal">
              Responsável legal
            </label>
            <input
              id="responsavel_legal"
              name="responsavel_legal"
              className="field"
              defaultValue={acolhido?.responsavel_legal ?? ""}
            />
          </div>

          <div>
            <p className="label">Motivos</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MOTIVOS.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 rounded-xl2 border border-line px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="motivos"
                    value={m}
                    defaultChecked={acolhido?.motivos?.includes(m) ?? false}
                    className="h-4 w-4"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {erro && (
        <p className="rounded-xl2 bg-danger-soft px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-brand" disabled={salvando}>
          {salvando ? (
            <>
              <LoaderCircle className="animate-spin" size={20} /> Salvando…
            </>
          ) : (
            <>
              <Save size={20} /> Salvar
            </>
          )}
        </button>
        <Link
          href={acolhido ? `/acolhidos/${acolhido.id}` : "/inicio"}
          className="btn-ghost"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Ler `?tipo=` na página "novo"**

Substitua `src/app/(app)/acolhidos/novo/page.tsx` por:

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FormAcolhido from "@/components/FormAcolhido";
import { criarAcolhido } from "@/lib/actions/acolhidos";

export default function NovoAcolhidoPage({
  searchParams,
}: {
  searchParams: { tipo?: string };
}) {
  const tipoInicial = searchParams.tipo === "familia" ? "familia" : "rua";

  async function action(formData: FormData) {
    "use server";
    await criarAcolhido(formData);
  }

  return (
    <div>
      <Link
        href="/inicio"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Voltar
      </Link>
      <h1 className="mb-5 text-2xl font-bold">Novo cadastro</h1>
      <FormAcolhido action={action} tipoInicial={tipoInicial} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar build + checagem manual**

Run: `npm run build`
Expected: sem erros.

Manual (`npm run dev`): abra `/acolhidos/novo`. Clique nos botões "Morador de rua" e "Família / Idoso" — o bloco de campos específico deve alternar. No tipo Família, ao escolher "Paga aluguel = Sim" aparece o campo "Valor do aluguel". Preencha só o nome, escolha Família, marque um motivo, salve. Deve redirecionar para o detalhe sem erro. Abra `/acolhidos/novo?tipo=familia` e confirme que já inicia em Família.

- [ ] **Step 4: Commit**

```bash
git add src/components/FormAcolhido.tsx "src/app/(app)/acolhidos/novo/page.tsx"
git commit -m "feat: formulário com seletor de tipo e campos condicionais"
```

---

### Task 4: Listagem com abas de filtro por tipo

**Files:**
- Modify: `src/components/BuscaAcolhidos.tsx`
- Modify: `src/app/(app)/inicio/page.tsx`

**Interfaces:**
- Consumes: `AcolhidoResumo` (tem `tipo`) na página de início.
- Produces: `ItemLista` ganha campo `tipo: "rua" | "familia"`. Quem monta `ItemLista` (início) deve preencher `tipo`.

- [ ] **Step 1: Adicionar `tipo` ao `ItemLista` e o filtro em `BuscaAcolhidos`**

Substitua todo o conteúdo de `src/components/BuscaAcolhidos.tsx` por:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import BotaoPresenca from "@/components/BotaoPresenca";
import { formatarData } from "@/lib/types";

export type ItemLista = {
  id: string;
  nome: string;
  como_chamar: string | null;
  fotoUrl: string | null;
  ultima_presenca: string | null;
  veioHoje: boolean;
  tipo: "rua" | "familia";
};

const ABAS: { value: "todos" | "rua" | "familia"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rua", label: "Rua" },
  { value: "familia", label: "Famílias" },
];

export default function BuscaAcolhidos({ itens }: { itens: ItemLista[] }) {
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "rua" | "familia">(
    "todos",
  );

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return itens.filter((i) => {
      if (filtroTipo !== "todos" && i.tipo !== filtroTipo) return false;
      if (!termo) return true;
      return (
        i.nome.toLowerCase().includes(termo) ||
        (i.como_chamar ?? "").toLowerCase().includes(termo)
      );
    });
  }, [q, itens, filtroTipo]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar por nome ou apelido…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field pl-11"
            aria-label="Buscar acolhido"
          />
        </div>
        <Link href="/acolhidos/novo" className="btn-brand whitespace-nowrap">
          <UserPlus size={20} /> Novo cadastro
        </Link>
      </div>

      <div className="mb-3 flex gap-2">
        {ABAS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setFiltroTipo(a.value)}
            aria-pressed={filtroTipo === a.value}
            className={
              filtroTipo === a.value
                ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-line px-4 py-1.5 text-sm font-medium text-muted"
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="card p-8 text-center">
          {q || filtroTipo !== "todos" ? (
            <p className="text-muted">
              Ninguém encontrado com esse filtro. Ajuste a busca ou a aba de
              tipo.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-muted">Nenhuma pessoa cadastrada ainda.</p>
              <Link href="/acolhidos/novo" className="btn-brand">
                <UserPlus size={20} /> Cadastrar a primeira pessoa
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtrados.map((i) => (
            <li key={i.id} className="card flex items-center gap-3 p-3">
              <Link
                href={`/acolhidos/${i.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar nome={i.nome} fotoUrl={i.fotoUrl} size={56} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {i.como_chamar || i.nome}
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                      {i.tipo === "familia" ? "Família" : "Rua"}
                    </span>
                  </span>
                  <span className="block truncate text-sm text-muted">
                    Última presença: {formatarData(i.ultima_presenca)}
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  className="ml-auto shrink-0 text-line"
                />
              </Link>
              <div className="shrink-0">
                <BotaoPresenca acolhidoId={i.id} veioHoje={i.veioHoje} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Passar `tipo` na página de início**

Em `src/app/(app)/inicio/page.tsx`, no `map` que monta `itens`, adicione o campo `tipo`. Substitua o bloco:

```tsx
  const itens: ItemLista[] = lista.map((a) => ({
    id: a.id,
    nome: a.nome,
    como_chamar: a.como_chamar,
    fotoUrl: a.foto_path ? fotos[a.foto_path] ?? null : null,
    ultima_presenca: a.ultima_presenca,
    veioHoje: idsHoje.has(a.id),
  }));
```

por:

```tsx
  const itens: ItemLista[] = lista.map((a) => ({
    id: a.id,
    nome: a.nome,
    como_chamar: a.como_chamar,
    fotoUrl: a.foto_path ? fotos[a.foto_path] ?? null : null,
    ultima_presenca: a.ultima_presenca,
    veioHoje: idsHoje.has(a.id),
    tipo: a.tipo,
  }));
```

- [ ] **Step 3: Verificar build + checagem manual**

Run: `npm run build`
Expected: sem erros.

Manual: em `/inicio`, as abas **Todos · Rua · Famílias** aparecem; clicar filtra a lista; cada card mostra a etiqueta "Rua" ou "Família". A busca por texto continua funcionando combinada com a aba.

- [ ] **Step 4: Commit**

```bash
git add src/components/BuscaAcolhidos.tsx "src/app/(app)/inicio/page.tsx"
git commit -m "feat: listagem com abas de filtro por tipo"
```

---

### Task 5: Detalhe exibe campos por tipo + badge

**Files:**
- Modify: `src/app/(app)/acolhidos/[id]/page.tsx`

**Interfaces:**
- Consumes: `labelTipo`, `simNao`, `formatarBRL`, `formatarData` de `@/lib/types`; type `Acolhido` já com campos novos.

- [ ] **Step 1: Importar os helpers novos**

Em `src/app/(app)/acolhidos/[id]/page.tsx`, substitua o import de `@/lib/types`:

```tsx
import {
  formatarData,
  labelRefeicao,
  hojeISO,
  type Acolhido,
  type Presenca,
} from "@/lib/types";
```

por:

```tsx
import {
  formatarData,
  labelRefeicao,
  labelTipo,
  simNao,
  formatarBRL,
  hojeISO,
  type Acolhido,
  type Presenca,
} from "@/lib/types";
```

- [ ] **Step 2: Adicionar badge de tipo no cabeçalho**

Ainda em `[id]/page.tsx`, dentro do bloco do cabeçalho, logo após o parágrafo do `como_chamar` (o `{acolhido.como_chamar && (<p ...>{acolhido.nome}</p>)}`), adicione uma linha com o badge. Substitua:

```tsx
            {acolhido.como_chamar && (
              <p className="text-muted">{acolhido.nome}</p>
            )}
            {acolhido.status === "inativo" && (
```

por:

```tsx
            {acolhido.como_chamar && (
              <p className="text-muted">{acolhido.nome}</p>
            )}
            <span className="mt-1 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
              {labelTipo(acolhido.tipo)}
            </span>
            {acolhido.status === "inativo" && (
```

- [ ] **Step 3: Substituir a lista de campos (`dl`) por versão condicional ao tipo**

Substitua todo o bloco que hoje começa em `{(idade ||` e termina no fechamento `</dl>)}` (o `dl` com os `Campo`) por:

```tsx
        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Campo rotulo="Documento" valor={acolhido.documento} />
          <Campo
            rotulo="Nascimento"
            valor={
              acolhido.data_nascimento
                ? formatarData(acolhido.data_nascimento)
                : null
            }
          />
          <Campo
            rotulo="Contato de referência"
            valor={acolhido.contato_referencia}
          />
          <Campo rotulo="Passagem policial / artigo" valor={acolhido.artigo} />
          <Campo rotulo="Boletim de ocorrência" valor={simNao(acolhido.tem_bo)} />
          <Campo
            rotulo="Autoriza uso de imagem"
            valor={simNao(acolhido.autoriza_imagem)}
          />
          <Campo
            rotulo="Data do cadastro"
            valor={
              acolhido.data_cadastro
                ? formatarData(acolhido.data_cadastro)
                : null
            }
          />

          {acolhido.tipo === "rua" && (
            <>
              <Campo rotulo="Idade aproximada" valor={idade} />
              <Campo rotulo="Cidade de origem" valor={acolhido.cidade_origem} />
              <Campo
                rotulo="Restrições alimentares"
                valor={acolhido.restricoes_alimentares}
              />
            </>
          )}

          {acolhido.tipo === "familia" && (
            <>
              <Campo rotulo="Bairro" valor={acolhido.bairro} />
              <Campo rotulo="Cidade" valor={acolhido.cidade} />
              <Campo rotulo="Casa própria" valor={simNao(acolhido.casa_propria)} />
              <Campo rotulo="Paga aluguel" valor={simNao(acolhido.paga_aluguel)} />
              <Campo
                rotulo="Valor do aluguel"
                valor={formatarBRL(acolhido.valor_aluguel)}
              />
              <Campo
                rotulo="Quantidade de filhos"
                valor={acolhido.filhos != null ? String(acolhido.filhos) : null}
              />
              <Campo rotulo="Benefício" valor={acolhido.beneficio} />
              <Campo
                rotulo="Responsável legal"
                valor={acolhido.responsavel_legal}
              />
            </>
          )}

          <div className="sm:col-span-2">
            <Campo rotulo="Observações" valor={acolhido.observacoes} />
          </div>

          {acolhido.tipo === "familia" &&
            acolhido.motivos &&
            acolhido.motivos.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted">Motivos</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {acolhido.motivos.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-medium text-brand"
                    >
                      {m}
                    </span>
                  ))}
                </dd>
              </div>
            )}
        </dl>
```

(O `dl` agora é renderizado sempre; o componente `Campo` já esconde valores vazios, então não precisa da condição externa que existia antes.)

- [ ] **Step 4: Verificar build + checagem manual**

Run: `npm run build`
Expected: sem erros.

Manual: abra o detalhe de um cadastro Família criado na Task 3 — devem aparecer bairro/cidade/casa própria/paga aluguel/valor/filhos/benefício/responsável legal/motivos (chips) e o badge "Família / Idoso". Abra um cadastro Rua — devem aparecer idade/cidade de origem/restrições e o badge "Morador de rua". Campos vazios não aparecem.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/acolhidos/[id]/page.tsx"
git commit -m "feat: detalhe exibe campos por tipo e badge"
```

---

### Task 6: Export CSV por público + links nos relatórios

**Files:**
- Modify: `src/app/api/export/route.ts`
- Modify: `src/app/(app)/relatorios/page.tsx`

**Interfaces:**
- Consumes: `labelTipo`, `simNao`, `hojeISO`, `labelRefeicao` de `@/lib/types`.
- Produces: rota `/api/export` aceita `?publico=rua|familia` (opcional) além do `?tipo=acolhidos|presencas` já existente.

- [ ] **Step 1: Ampliar a rota de export**

Substitua todo o conteúdo de `src/app/api/export/route.ts` por:

```ts
import { createClient } from "@/lib/supabase/server";
import { hojeISO, labelRefeicao, labelTipo, simNao } from "@/lib/types";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const linhas = [headers.join(";")];
  for (const r of rows) linhas.push(r.map(csvEscape).join(";"));
  // BOM para acentuação correta no Excel
  return "﻿" + linhas.join("\r\n");
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "presencas";
  const publicoParam = url.searchParams.get("publico");
  const publico =
    publicoParam === "rua" || publicoParam === "familia" ? publicoParam : null;

  let csv = "";
  let nomeArquivo = "export.csv";

  if (tipo === "acolhidos") {
    let query = supabase.from("acolhidos").select("*").order("nome");
    if (publico) query = query.eq("tipo", publico);
    const { data } = await query;

    const rows = (data ?? []).map((a) => [
      labelTipo(a.tipo),
      a.nome,
      a.como_chamar,
      a.idade_aproximada,
      a.data_nascimento,
      a.documento,
      a.cidade_origem,
      a.contato_referencia,
      a.restricoes_alimentares,
      a.bairro,
      a.cidade,
      simNao(a.casa_propria),
      simNao(a.paga_aluguel),
      a.valor_aluguel,
      a.filhos,
      a.beneficio,
      a.artigo,
      simNao(a.tem_bo),
      simNao(a.autoriza_imagem),
      a.responsavel_legal,
      (a.motivos ?? []).join(", "),
      a.data_cadastro,
      a.observacoes,
      a.status,
    ]);
    csv = toCsv(
      [
        "Tipo",
        "Nome",
        "Como chamar",
        "Idade aproximada",
        "Nascimento",
        "Documento",
        "Cidade de origem",
        "Contato de referência",
        "Restrições alimentares",
        "Bairro",
        "Cidade",
        "Casa própria",
        "Paga aluguel",
        "Valor do aluguel",
        "Filhos",
        "Benefício",
        "Artigo",
        "B.O.",
        "Autoriza imagem",
        "Responsável legal",
        "Motivos",
        "Data do cadastro",
        "Observações",
        "Status",
      ],
      rows,
    );
    nomeArquivo = `cadastros${publico ? "-" + publico : ""}-${hojeISO()}.csv`;
  } else {
    const { data } = await supabase
      .from("presencas")
      .select("data, refeicao, observacao, acolhidos ( nome, como_chamar )")
      .order("data", { ascending: false });
    const rows = (data ?? []).map((p) => {
      const a = (p.acolhidos ?? null) as {
        nome?: string;
        como_chamar?: string | null;
      } | null;
      return [
        p.data,
        a?.nome ?? "",
        a?.como_chamar ?? "",
        labelRefeicao(p.refeicao),
        p.observacao ?? "",
      ];
    });
    csv = toCsv(
      ["Data", "Nome", "Como chamar", "Refeição", "Observação"],
      rows,
    );
    nomeArquivo = `presencas-${hojeISO()}.csv`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
```

- [ ] **Step 2: Adicionar links de export por público nos relatórios**

Em `src/app/(app)/relatorios/page.tsx`, substitua o bloco dos botões de export:

```tsx
        <div className="flex flex-wrap gap-3">
          <a href="/api/export?tipo=presencas" className="btn-brand">
            <Download size={20} /> Baixar presenças (CSV)
          </a>
          <a href="/api/export?tipo=acolhidos" className="btn-ghost">
            <Download size={20} /> Baixar cadastros (CSV)
          </a>
        </div>
```

por:

```tsx
        <div className="flex flex-wrap gap-3">
          <a href="/api/export?tipo=presencas" className="btn-brand">
            <Download size={20} /> Baixar presenças (CSV)
          </a>
          <a href="/api/export?tipo=acolhidos" className="btn-ghost">
            <Download size={20} /> Cadastros — todos (CSV)
          </a>
          <a href="/api/export?tipo=acolhidos&publico=rua" className="btn-ghost">
            <Download size={20} /> Cadastros — Rua (CSV)
          </a>
          <a
            href="/api/export?tipo=acolhidos&publico=familia"
            className="btn-ghost"
          >
            <Download size={20} /> Cadastros — Famílias (CSV)
          </a>
        </div>
```

- [ ] **Step 3: Verificar build + checagem manual**

Run: `npm run build`
Expected: sem erros.

Manual: em `/relatorios`, clique em "Cadastros — Famílias (CSV)". O arquivo baixado (`cadastros-familia-AAAA-MM-DD.csv`) deve abrir no Excel com acentos corretos, separador `;`, conter só registros do tipo família, com as colunas novas (Tipo, Bairro, Cidade, Paga aluguel = Sim/Não, Valor, Filhos, Benefício, Artigo, B.O., Autoriza imagem, Responsável legal, Motivos, Data do cadastro). "Cadastros — todos" traz os dois tipos. "Baixar presenças" continua igual.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/export/route.ts "src/app/(app)/relatorios/page.tsx"
git commit -m "feat: export CSV por público e links de relatório"
```

---

## Self-Review (feito na escrita do plano)

**Cobertura do spec:**
- §1 Banco → Task 1 (migração + índice + view). ✓
- §2 Tipos → Task 1 Steps 3–4. ✓
- §3 Formulário (seletor + campos comuns/rua/família, booleanos tri-estado, valor condicional, motivos) → Task 3. ✓ (artigo + B.O. nos comuns, conforme decisão "nos dois").
- §4 Actions → Task 2. ✓
- §5 Telas: início (abas + badge) → Task 4; detalhe → Task 5; novo (`?tipo=`) → Task 3; editar reusa `FormAcolhido` sem mudança → coberto (nenhuma edição necessária, `acolhido.tipo` preenche o estado inicial). ✓
- §6 Export (`?publico=` + colunas + links relatório) → Task 6. ✓
- §7 Edge cases: `nome`+`tipo` obrigatórios (Task 2/3); antigos viram `rua` (Task 1 default); valor só com aluguel=Sim (Task 3); booleano null preservado (helpers `bool`/`simNao`); motivos `text[]` (Task 1/2). ✓

**Placeholders:** nenhum "TBD/TODO"; todo passo de código traz o código completo. ✓

**Consistência de tipos:** nomes de campo do FormData (`tem_bo`, `autoriza_imagem`, `paga_aluguel`, `valor_aluguel`, `casa_propria`, `filhos`, `beneficio`, `responsavel_legal`, `bairro`, `cidade`, `artigo`, `data_cadastro`, `motivos`, `tipo`) batem entre Task 2 (leitura) e Task 3 (escrita). Helpers `simNao`/`labelTipo`/`formatarBRL` definidos na Task 1 e usados nas Tasks 5–6. `ItemLista.tipo` definido na Task 4 Step 1 e preenchido no Step 2. ✓

## Observações de execução

- A **Task 1 Step 2 exige rodar SQL no Supabase manualmente** — não dá para automatizar via `npm`. As tasks seguintes (insert/update com colunas novas) só funcionam de verdade depois disso; o `npm run build` passa mesmo sem a migração, mas a checagem manual falha se a migração não tiver sido aplicada.
- Não há framework de teste; a régua de cada task é `npm run build` + a checagem manual descrita.
```
