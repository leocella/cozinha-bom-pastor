# Design — Dois tipos de cadastro (Morador de rua + Família/Idoso)

**Data:** 2026-07-10
**Projeto:** cozinha-comunitaria (Next.js 14 App Router + Supabase, Server Actions, RLS, fotos em bucket privado)

## Objetivo

Hoje o sistema tem um único cadastro genérico de "acolhidos", modelado para
população em situação de rua. A Associação Pró-Solidariedade e Vida Bom Pastor
usa **duas fichas** com campos distintos:

1. **Morador de rua** (o cadastro que já existe).
2. **Família / Idoso** (nova ficha, com campos socioeconômicos).

Precisamos suportar os dois tipos mantendo intacto o registro de presença
(`presencas`), que só depende da pessoa cadastrada.

## Decisões tomadas (brainstorming)

- **Modelo de dados:** uma única tabela `acolhidos` + coluna discriminadora
  `tipo`. As colunas de família entram como opcionais/nuláveis. Motivo:
  `presencas`, RLS, a view `vw_acolhidos` e toda a UI já giram em torno de uma
  tabela só; tabela separada exigiria duplicar tudo e um FK polimórfico em
  `presencas`.
- **UI:** listagem e relatórios na **mesma tela**, com abas de filtro
  **Todos · Rua · Famílias** e etiqueta de tipo em cada card.
- **Motivos** (multi-seleção, `text[]`): `Desemprego`, `Baixa renda`,
  `Idoso(a) sem renda`, `Doença na família`.
- **Artigo/passagem policial** e **B.O.** ficam **nos dois tipos** (campos comuns).
- **Booleanos** viram select **Sim / Não / — (em branco = não informado)** —
  a realidade das fichas é de dados incompletos, e um checkbox não distingue
  "não" de "não perguntei".
- **`filhos`** é quantidade (inteiro).

## 1. Banco de dados

Nova migração `supabase/migrations/0004_tipos_cadastro.sql`. Tudo idempotente
(`add column if not exists`), tudo opcional exceto `tipo`.

```sql
alter table public.acolhidos
  add column if not exists tipo text not null default 'rua'
    check (tipo in ('rua','familia'));

-- campos comuns novos (valem para os dois tipos)
alter table public.acolhidos add column if not exists artigo text;            -- passagem policial / artigo
alter table public.acolhidos add column if not exists tem_bo boolean;         -- há Boletim de Ocorrência?
alter table public.acolhidos add column if not exists autoriza_imagem boolean;
alter table public.acolhidos add column if not exists data_cadastro date default current_date;

-- campos da ficha de família / idoso
alter table public.acolhidos add column if not exists bairro text;
alter table public.acolhidos add column if not exists cidade text;
alter table public.acolhidos add column if not exists paga_aluguel boolean;
alter table public.acolhidos add column if not exists valor_aluguel numeric(10,2);
alter table public.acolhidos add column if not exists casa_propria boolean;
alter table public.acolhidos add column if not exists filhos int;
alter table public.acolhidos add column if not exists beneficio text;         -- qual benefício (Bolsa Família, BPC...)
alter table public.acolhidos add column if not exists responsavel_legal text;
alter table public.acolhidos add column if not exists motivos text[];

create index if not exists acolhidos_tipo_idx on public.acolhidos(tipo);
```

- `default 'rua'` faz os cadastros existentes virarem "rua" sem migração de dados.
- `vw_acolhidos` usa `a.*`, então as colunas novas aparecem automaticamente —
  a view **não precisa ser recriada** (mas incluímos um `create or replace`
  inofensivo se necessário para garantir).
- **`presencas` não muda em nada.** RLS não muda (as políticas são por
  `created_by`, independentes das colunas).

## 2. Tipos (`src/lib/types.ts`)

```ts
export type Tipo = "rua" | "familia";

export const TIPOS: { value: Tipo; label: string }[] = [
  { value: "rua", label: "Morador de rua" },
  { value: "familia", label: "Família / Idoso" },
];

export function labelTipo(t: string | null): string { ... }

export const MOTIVOS: string[] = [
  "Desemprego",
  "Baixa renda",
  "Idoso(a) sem renda",
  "Doença na família",
];
```

O type `Acolhido` ganha os campos novos:
`tipo`, `artigo`, `tem_bo`, `autoriza_imagem`, `data_cadastro`, `bairro`,
`cidade`, `paga_aluguel`, `valor_aluguel`, `casa_propria`, `filhos`,
`beneficio`, `responsavel_legal`, `motivos` (com os tipos TS corretos:
`boolean | null`, `number | null`, `string[] | null`, etc.).

Helpers auxiliares: `formatarBRL(n)` para `valor_aluguel`, `simNao(b)` para
booleanos na exibição.

## 3. Formulário (`src/components/FormAcolhido.tsx`)

Componente client. Mudanças:

- **Seletor de tipo** (controle segmentado) no topo, controlado por estado.
  Nova prop `tipoInicial?: Tipo` (default `"rua"`), usada pela URL `?tipo=` na
  tela "novo". Campo `tipo` enviado no FormData (input hidden espelhando o estado).
- Blocos de campo renderizados condicionalmente pelo tipo selecionado.

**Distribuição dos campos:**

| Bloco | Campos |
|-------|--------|
| Comuns (sempre) | nome\*, como chamar, foto, documento, data de nascimento, contato de referência, observações, artigo/passagem policial, B.O. (Sim/Não/—), autoriza imagem (Sim/Não/—), data do cadastro |
| Só Rua | idade aproximada, cidade de origem, restrições alimentares |
| Só Família | bairro, cidade, casa própria (Sim/Não/—), paga aluguel (Sim/Não/—) + valor (condicional a "Sim"), filhos (número), benefício, responsável legal, motivos (checkboxes) |

- Booleanos: `<select>` com opções `""` (—), `sim`, `nao`.
- `valor_aluguel`: aparece só quando `paga_aluguel === "sim"`.
- `motivos`: grupo de checkboxes `name="motivos"` (múltiplos valores).
- `data_cadastro`: input date, default hoje na criação.
- Validação client mantém: só `nome` obrigatório (tipo sempre tem valor).

## 4. Server Actions (`src/lib/actions/acolhidos.ts`)

`montarPayload` passa a ler os campos novos. Helpers adicionais:

- `bool(v)`: `"sim" → true`, `"nao" → false`, vazio → `null`.
- `numDec(v)`: parse decimal para `valor_aluguel`.
- `arr(formData, name)`: `formData.getAll(name)` → `string[]` (ou `null` se vazio)
  para `motivos`.

`criarAcolhido` / `atualizarAcolhido`: validação inalterada (só `nome`); `tipo`
default `'rua'` se ausente por segurança. Redirects e `revalidatePath`
inalterados.

## 5. Telas

- **Início (`inicio/page.tsx` + `BuscaAcolhidos.tsx`):** o item da lista passa a
  incluir `tipo`. `BuscaAcolhidos` ganha abas **Todos · Rua · Famílias**
  (filtro client-side, combinado com a busca por texto já existente) e uma
  etiqueta de tipo em cada card.
- **Detalhe (`acolhidos/[id]/page.tsx`):** badge de tipo no cabeçalho; renderiza
  o bloco de campos do tipo correspondente (booleanos como Sim/Não, `motivos`
  como chips, `valor_aluguel` formatado em R$, `data_cadastro`,
  `responsavel_legal`). Campos vazios continuam ocultos (componente `Campo`).
- **Novo (`acolhidos/novo/page.tsx`):** lê `?tipo=` para pré-selecionar o tipo
  no formulário.
- **Editar:** usa o mesmo `FormAcolhido` já preenchido (sem mudança estrutural).

## 6. Export CSV (`src/app/api/export/route.ts`)

**Colisão de nomes resolvida:** a rota já usa `?tipo=acolhidos|presencas` para
escolher o *dataset*. Para filtrar o *público*, adicionamos um parâmetro novo
**`?publico=rua|familia`** (opcional). Mantém-se BOM UTF-8 e separador `;`.

- Export de `acolhidos`: `.eq("tipo", publico)` quando `publico` presente;
  colunas ampliadas com Tipo, Bairro, Cidade, Paga aluguel (Sim/Não), Valor,
  Casa própria, Filhos, Benefício, Artigo, B.O., Autoriza imagem, Responsável
  legal, Data do cadastro, Motivos (unidos por vírgula).
- Export de `presencas`: inalterado (o filtro por público não se aplica; se
  `publico` for passado, é ignorado ou aplicado via join — mantemos simples e
  ignoramos no dataset de presenças).
- **Relatórios (`relatorios/page.tsx`):** links de export por público
  (Rua / Famílias / Todos).

## 7. Qualidade / edge cases

- Só `nome` + `tipo` obrigatórios; todo o resto opcional (dados incompletos são
  a norma).
- Cadastros antigos → `tipo = 'rua'` automaticamente.
- `valor_aluguel` só é coletado/exibido quando `paga_aluguel = Sim`.
- Booleanos preservam o estado "não informado" (`null`), distinto de "Não".
- `motivos` como `text[]` permite contagem por motivo em relatório futuro.
- Sem mudanças em `presencas`, RLS, autenticação ou storage.

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/0004_tipos_cadastro.sql` | criar |
| `src/lib/types.ts` | estender (Tipo, TIPOS, MOTIVOS, Acolhido, helpers) |
| `src/components/FormAcolhido.tsx` | seletor de tipo + campos condicionais |
| `src/lib/actions/acolhidos.ts` | ler campos novos (bool/numDec/arr) |
| `src/components/BuscaAcolhidos.tsx` | abas de filtro por tipo + etiqueta |
| `src/app/(app)/inicio/page.tsx` | passar `tipo` para a lista |
| `src/app/(app)/acolhidos/[id]/page.tsx` | exibir campos por tipo + badge |
| `src/app/(app)/acolhidos/novo/page.tsx` | ler `?tipo=` |
| `src/app/api/export/route.ts` | `?publico=` + colunas novas |
| `src/app/(app)/relatorios/page.tsx` | links de export por público |

## Fora de escopo

- Migração de dados históricos (não há dados de família ainda).
- Relatórios agregados por motivo (o `text[]` deixa a porta aberta, mas não é
  parte desta entrega).
- Qualquer mudança em presenças, autenticação, RLS ou storage.
