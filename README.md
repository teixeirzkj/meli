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
| `CRON_SECRET` | autentica o cron da Vercel que limpa rotas antigas | **só no servidor** |

A `service_role` ignora RLS: ela não tem prefixo `NEXT_PUBLIC_`, nunca entra no
bundle e só é usada dentro de server actions, depois de confirmar que quem
chamou é administrador ([lib/supabase/admin.ts](lib/supabase/admin.ts)). Sem ela o
app funciona inteiro — só o botão de criar conta fica desligado.

## Banco de dados

Rode as migrations no Supabase (**SQL Editor → New query → colar → Run**), na ordem:

1. [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — profiles, rotas, pacotes, config, RLS
2. [supabase/migrations/0002_pagamentos_status.sql](supabase/migrations/0002_pagamentos_status.sql) — pagamentos e situação da conta
3. [supabase/migrations/0003_retencao_rotas.sql](supabase/migrations/0003_retencao_rotas.sql) — expurgo automático de rotas antigas
4. [supabase/seed.sql](supabase/seed.sql) — cria profile de quem já existia e promove o dono a admin

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
| `/rotas/[id]` | conferência: leitura por câmera, excedente, finalização e exportação |
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

## Instalar como aplicativo (PWA)

O app é instalável: ícone na tela inicial, tela cheia sem barra de navegador e
atalhos para "Nova rota" e "Histórico".

- **Android/Chrome** — aparece o botão *Instalar aplicativo* em `/perfil`, ou o
  próprio navegador oferece a instalação.
- **iPhone/Safari** — Compartilhar → *Adicionar à Tela de Início* (o iOS não
  expõe convite automático; `/perfil` mostra a instrução).

Peças: [app/manifest.ts](app/manifest.ts), [public/sw.js](public/sw.js),
[components/BotaoInstalar.tsx](components/BotaoInstalar.tsx) e os ícones em
`public/icons` (inclusive os *maskable*, com a arte nos 80% centrais, que é o
que o Android recorta).

O service worker é deliberadamente pequeno: **navegação nunca sai do cache** —
HTML servido de cache é o bug que aparece como "não atualizou" na mão do
usuário. Só ficam em cache os assets de `/_next/static` (nome com hash, muda a
cada build) e a página de offline.

Esses arquivos precisam ficar **fora do matcher do middleware**: o navegador os
busca fora do contexto de navegação e, se levarem redirect para `/login`, o app
não fica instalável.

### Levar para a Play Store

O PWA é o pré-requisito. Com ele pronto, [PWABuilder](https://www.pwabuilder.com)
ou [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) empacotam o site
numa Trusted Web Activity — um app Android que abre o site sem barra de
navegador. Exige conta de desenvolvedor Google (US$ 25, pagamento único) e o
arquivo `.well-known/assetlinks.json` no domínio, gerado pela própria
ferramenta. A App Store cobra US$ 99/ano e costuma recusar app que é só um site
embrulhado — para iPhone, o "Adicionar à Tela de Início" resolve sem loja.

## Limpeza automática de rotas

Rota antiga é apagada sozinha, com os pacotes dela junto (`on delete cascade`).
A janela padrão é de **60 dias contados da criação** e o administrador muda o
número em **Admin → Ajustes**; o mínimo aceito é 7 dias.

Quem executa é o próprio Postgres: a função `limpar_rotas_antigas()` roda todo
dia às 04:00 UTC via **pg_cron** (migration 0003) e anota em `manutencao_log`
quantas rotas saíram — só nos dias em que houve o que apagar. O painel mostra a
data da última faxina.

Como rede de segurança existe `/api/cron/limpeza`, agendada no
[vercel.json](vercel.json) para 04:20 UTC, chamando a mesma função. Se o pg_cron
estiver ativo ela não encontra nada; se não estiver, mantém a limpeza em dia.
A rota exige `Authorization: Bearer $CRON_SECRET` e recusa tudo enquanto a
variável não existir — endpoint que apaga dados não fica aberto.

Exclusão manual continua disponível: **Excluir rota** na tela da rota, com
confirmação e atalho para baixar o .txt antes.

## Leitura de código de barras

O botão **Escanear com a câmera** em `/rotas/[id]` abre a câmera traseira e lê em
sequência, sem fechar entre um pacote e outro: cada leitura dá bipe e vibração, e as
últimas aparecem na própria tela da câmera.

Dois motores, escolhidos em tempo de execução ([components/Scanner.tsx](components/Scanner.tsx)):

1. **BarcodeDetector** — API nativa do navegador (Chrome no Android). Custo zero de
   JavaScript e a leitura mais rápida.
2. **ZXing** — entra por `import()` dinâmico só quando a API nativa não existe (iPhone,
   Safari). Fica fora do carregamento inicial da página.

### Bipe de confirmação

Todo código registrado toca um som, com tom diferente por desfecho — o
conferente está olhando a etiqueta, não a tela:

| Som | Significa |
|---|---|
| um bipe agudo e curto | pacote conferido |
| dois toques médios | já conferido, ou excedente |
| grave e longo | não entrou (código fora do tamanho, falha ao salvar) |

Vale para código lido pela câmera, digitado ou vindo de leitor USB/Bluetooth —
os três passam pelo mesmo caminho. O botão **Bipe** na tela da câmera silencia,
e a escolha fica guardada no aparelho.

Detalhes que fazem o som funcionar no celular ([lib/som.ts](lib/som.ts)): um
único AudioContext para a página toda (criar um por bipe estoura o limite do
navegador e o som some no meio da conferência) e destravamento dentro de um
gesto do usuário, já que áudio que nasce sozinho é bloqueado.

Formatos: Code 128, Code 39/93, Codabar, EAN-8/13, ITF, UPC-A/E, QR e Data Matrix.
Há lanterna quando o aparelho expõe o controle, e o mesmo código lido repetidamente
só é aceito de novo depois de 2,5 s. A câmera exige HTTPS — em produção já é o caso.

## Performance

Cada navegação chegava a abrir quatro idas em série ao Supabase. O que mudou:

- O middleware lê o `exp` do JWT direto do cookie e só vai à rede quando falta
  menos de 2 minutos para expirar ([lib/supabase/middleware.ts](lib/supabase/middleware.ts)).
- Sessão e profile são buscados uma única vez por request, via `cache()` do React
  ([lib/auth.ts](lib/auth.ts)) — layout, página e actions compartilham a mesma leitura.
- Cada rota tem `loading.tsx`, então o esqueleto aparece no clique.
- O login não carrega Framer Motion (economiza ~40 kB na primeira tela) e é
  renderizado no servidor — `useSearchParams` deixava a tela em branco até hidratar.
- O id do usuário sai do próprio cookie em vez de uma chamada a `/auth/v1/user`
  ([lib/supabase/sessao-cookie.ts](lib/supabase/sessao-cookie.ts)). Quem valida o
  token continua sendo o Postgres, via RLS.
- As consultas da tela de conferência vão em paralelo.

## Protótipos

Os mockups originais continuam servidos como estáticos em `/prototipos/rotas.html`
e `/prototipos/conferencia.html`.

## Deploy na Vercel

Framework Preset **Next.js** (com `Other` a Vercel publica só `public/` e o app
não sobe). Cadastre as três variáveis em Settings → Environment Variables e
redeploy — variável `NEXT_PUBLIC_` entra no bundle em tempo de build.
