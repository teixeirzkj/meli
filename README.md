# Rotas — conferência de rotas e pacotes

App mobile-first em Next.js 15 (App Router) + Supabase (Auth + Postgres com RLS).
A raiz do site é a tela de login; não existe autocadastro — a contratação passa
pelo WhatsApp e a conta é criada no painel administrativo.

## Stack

- **Next.js 15** / React 19 / TypeScript
- **Tailwind CSS 4** (tokens de cor em [app/globals.css](app/globals.css))
- **Framer Motion** no painel admin (transições de aba, diálogos, gráfico)
- **Supabase** — `@supabase/ssr` com sessão em cookie

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do projeto
npm run dev
```

### Variáveis de ambiente

| Variável | Para quê | Onde vive |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | endereço do projeto | build + navegador |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | acesso do usuário logado, sob RLS | build + navegador |
| `SUPABASE_SERVICE_ROLE_KEY` | criar e excluir contas no Auth | **só no servidor** |

A `service_role` ignora RLS: ela não tem prefixo `NEXT_PUBLIC_`, nunca entra no
bundle e só é usada dentro de server actions, depois de confirmar que quem
chamou é administrador ([lib/supabase/admin.ts](lib/supabase/admin.ts)). Sem ela o
app funciona inteiro — só o botão de criar conta fica desligado.

## Banco de dados

Rode as migrations no Supabase (**SQL Editor → New query → colar → Run**), na ordem:

1. [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — profiles, rotas, pacotes, config, RLS
2. [supabase/migrations/0002_pagamentos_status.sql](supabase/migrations/0002_pagamentos_status.sql) — pagamentos e situação da conta
3. [supabase/seed.sql](supabase/seed.sql) — cria profile de quem já existia e promove o dono a admin

| Tabela | O que guarda |
|---|---|
| `profiles` | nome, tipo (`user`/`admin`), status (`ativo`/`suspenso`/`bloqueado`), janela da assinatura |
| `rotas` | nome, quantidade esperada, data e status da conferência |
| `pacotes` | código conferido, parada opcional e flag de excedente (único por rota) |
| `pagamentos` | valor, data, competência, forma de pagamento e quem registrou |
| `app_config` | mínimo/máximo de dígitos do código |

**RLS:** cada usuário só enxerga o que é seu; `tipo = 'admin'` enxerga tudo, via
`is_admin()` (`security definer`, para não recursar em `profiles`). O painel admin
não tem atalho: as ações passam pelas mesmas policies.

## Telas

| Rota | O que faz |
|---|---|
| `/login` | entrar; quem não tem conta é levado ao WhatsApp |
| `/` | rotas do dia, contadores e rotas recentes |
| `/rotas/nova` | cria a rota com a quantidade esperada |
| `/rotas/[id]` | conferência: bipa o código, marca excedente, finaliza, exporta |
| `/historico` | rotas anteriores com filtro de status e resultado |
| `/perfil` | nome, e-mail e situação da assinatura |
| `/admin` | visão geral, usuários, pagamentos, rotas de todos e ajustes |
| `/api/health` | diagnóstico de deploy: commit publicado e env vars presentes |

### Painel administrativo

- **Visão geral** — recebido no mês, contas ativas, assinaturas vencendo em 7 dias,
  contas sem acesso, faturamento dos últimos 6 meses e próximas renovações.
- **Usuários** — criar conta com e-mail e senha (já confirmada), renovar +30 dias,
  suspender, bloquear, reativar, promover a admin e excluir.
- **Pagamentos** — registrar recebimento (com renovação opcional da assinatura),
  histórico e totais.
- **Ajustes** — regras de validação do código do pacote.

`suspenso` e `bloqueado` cortam o acesso mas preservam os dados; só a exclusão
apaga. Administrador nunca é barrado por assinatura, senão ninguém conseguiria
reativar ninguém.

## Performance

Cada navegação chegava a abrir quatro idas em série ao Supabase. O que mudou:

- O middleware lê o `exp` do JWT direto do cookie e só vai à rede quando falta
  menos de 2 minutos para expirar ([lib/supabase/middleware.ts](lib/supabase/middleware.ts)).
- Sessão e profile são buscados uma única vez por request, via `cache()` do React
  ([lib/auth.ts](lib/auth.ts)) — layout, página e actions compartilham a mesma leitura.
- Cada rota tem `loading.tsx`, então o esqueleto aparece no clique.
- O login não carrega Framer Motion (economiza ~40 kB na primeira tela).

## Protótipos

Os mockups originais continuam servidos como estáticos em `/prototipos/rotas.html`
e `/prototipos/conferencia.html`.

## Deploy na Vercel

Framework Preset **Next.js** (com `Other` a Vercel publica só `public/` e o app
não sobe). Cadastre as três variáveis em Settings → Environment Variables e
redeploy — variável `NEXT_PUBLIC_` entra no bundle em tempo de build.
