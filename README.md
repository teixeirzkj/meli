# Rotas — MVP mobile-first

Protótipos estáticos do app de rotas.

## Telas

| URL | Arquivo | Descrição |
|---|---|---|
| `/` | `index.html` | App do entregador — abre direto na tela de login |
| `/conferencia.html` | `conferencia.html` | Painel de conferência (tema escuro) |

## Rodar localmente

Qualquer servidor estático serve, por exemplo:

```bash
python -m http.server 8000
```

Depois abra http://localhost:8000

## Deploy

Site 100% estático — no Vercel basta importar o repositório sem build command
(preset "Other"). A raiz (`/`) já é a tela de login.
