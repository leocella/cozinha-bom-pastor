# Cozinha Comunitária

App para **cadastrar acolhidos** (pessoas em situação de rua) e **registrar a presença** de cada um a cada vez que vêm comer — substituindo a ficha de papel. Feito em **Next.js 14 (App Router) + Supabase**, com autenticação, RLS e fotos em bucket privado.

## O que ele faz

- **Início** — contador de presenças/pessoas do dia, busca por nome ou apelido e botão **"Presente hoje"** de 1 toque em cada card.
- **Cadastro** com foto (câmera no celular ou arquivo). Só o nome é obrigatório.
- **Detalhe** com histórico de presenças e registro de presença por data/refeição.
- **Hoje** — lista de quem já veio no dia.
- **Relatórios** — resumo do mês (presenças, pessoas atendidas, cadastros ativos) e **exportação CSV** para backup/prestação de contas.

## Pré-requisitos

- Node.js 18.18+ (recomendado 20+)
- Um projeto **Supabase** (cloud ou self-hosted)

## Passo a passo

### 1. Banco de dados
No painel do Supabase → **SQL Editor**, cole e rode o conteúdo de:

```
supabase/migrations/0001_init.sql
```

Isso cria as tabelas `acolhidos` e `presencas`, a view de resumo, as políticas de **RLS** e o **bucket privado `fotos`** com suas políticas.

### 2. Variáveis de ambiente
Copie o exemplo e preencha com os dados do seu projeto (Supabase → Settings → API):

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Criar o usuário de acesso
Não há tela de cadastro (é uma ferramenta interna). Crie o usuário em
**Supabase → Authentication → Users → Add user** (e-mail + senha, marque
"Auto Confirm"). Esse será o login da cozinha.

> Cada usuário só enxerga os próprios registros (RLS por `created_by`). Se
> várias pessoas vão operar com os **mesmos** dados, use **um único login**
> compartilhado. (Dá para evoluir para times/organização numa fase 2.)

### 4. Rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 e entre com o usuário criado.

### 5. Deploy
Funciona bem na **Vercel** (adicione as duas variáveis de ambiente no projeto).
`npm run build` já foi validado.

## Stack e decisões

- **Next.js App Router** com **Server Actions** chamando o Supabase direto (sem middleware de automação).
- **@supabase/ssr** para sessão via cookies (browser + server + middleware).
- **RLS ligado** em tudo; fotos em **bucket privado** servidas por **URL assinada** temporária (1h). Nada de dado pessoal exposto publicamente — atenção à LGPD, já que é população vulnerável.
- **Índice único (acolhido_id, data)**: impede marcar a mesma pessoa duas vezes no mesmo dia. Se quiser registrar várias refeições por dia, remova esse índice no SQL.

## Estrutura

```
supabase/migrations/0001_init.sql   -> schema + RLS + storage
src/lib/supabase/                   -> clients (browser, server, middleware)
src/lib/actions/                    -> server actions (acolhidos, presencas)
src/lib/photos.ts                   -> URLs assinadas das fotos
src/app/(app)/                      -> área logada (inicio, hoje, acolhidos, relatorios)
src/app/login, src/app/auth         -> login e logout
src/app/api/export                  -> exportação CSV
src/components/                     -> UI (busca, cards, foto, formulários)
```

## Ideias para a fase 2

- Filtro de relatório por período personalizado e por refeição.
- Times/organização (vários operadores compartilhando os mesmos dados com papéis).
- Ficha individual em PDF (dados + foto + histórico).
- PWA/offline para usar no celular sem depender de conexão.
