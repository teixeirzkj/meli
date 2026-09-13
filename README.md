# Rotas — conferência de rotas e pacotes

App mobile-first em Next.js 15 (App Router) + Supabase (Auth + Postgres com RLS).
A raiz do site é a tela de login; depois de autenticado o usuário cai no painel de rotas.

## Stack

- **Next.js 15** / React 19 / TypeScript
- **Tailwind CSS 4** (tokens de cor em [app/globals.css](app/globals.css))
- **Supabase** — `@supabase/ssr` com sessão em cookie, renovada no [middleware.ts](middleware.ts)

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a anon key do projeto
npm run dev
```

Abre em http://localhost:3000.

### Variáveis de ambiente

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys |

A **service_role key não é usada por este app** e não deve entrar no `.env`, no
repositório nem em nenhuma variável `NEXT_PUBLIC_*` — ela ignora RLS e dá acesso
total ao banco.

## Banco de dados

Antes do primeiro login, rode a migration no Supabase
(**SQL Editor → New query → colar → Run**):

1. [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — tabelas, trigger e RLS
2. [supabase/seed.sql](supabase/seed.sql) — opcional, promove um e-mail a administrador

### Modelo

| Tabela | O que guarda |
|---|---|
| `profiles` | nome, tipo (`user`/`admin`) e janela da assinatura; criada por trigger no cadastro |
| `rotas` | nome, quantidade esperada, data e status (`em_conferencia`/`finalizada`) |
| `pacotes` | código conferido, parada opcional e flag de excedente (único por rota) |
| `app_config` | linha única com o mínimo/máximo de dígitos do código |

**RLS:** cada usuário só enxerga as próprias rotas e pacotes; quem tem `tipo = 'admin'`
enxerga tudo. As policies usam a função `is_admin()` (`security definer`, para não
recursar em `profiles`). O painel admin não tem atalho nenhum: as ações dele passam
pelas mesmas policies.

## Telas

| Rota | O que faz |
|---|---|
| `/login` | entrar e criar conta |
| `/` | rotas do dia, contadores e rotas recentes |
| `/rotas/nova` | cria a rota com a quantidade esperada |
| `/rotas/[id]` | conferência: bipa o código, marca excedente, finaliza e exporta (.txt / PDF) |
| `/historico` | rotas anteriores com filtro de status e resultado |
| `/perfil` | nome, e-mail e situação da assinatura |
| `/admin` | usuários, renovação de assinatura, rotas de todos e regras do código |

Assinatura vencida bloqueia o acesso (admin não é bloqueado). Renovar +30 dias soma
sobre o vencimento quando a assinatura ainda está ativa; se já venceu, recomeça de hoje.

Remover uma conta do Auth continua sendo feito pelo painel do Supabase — o app só
bloqueia o acesso, porque apagar usuário exige a service_role key.

## Protótipos

Os mockups originais continuam versionados e servidos como estáticos:

- `/prototipos/rotas.html`
- `/prototipos/conferencia.html`

## Deploy na Vercel

Importe o repositório (o preset Next.js é detectado sozinho) e cadastre as duas
variáveis `NEXT_PUBLIC_*` em **Settings → Environment Variables**. Depois adicione a
URL do deploy em **Supabase → Authentication → URL Configuration** (Site URL e
Redirect URLs).
