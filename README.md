# Rotas — MVP mobile-first

Protótipos estáticos do app de conferência e execução de rotas.

## Telas

- **Rotas App** (`Rotas App.dc.html`) — app do entregador: login, lista de rotas, execução de paradas.
- **Conferência de Rotas** (`Conferencia de Rotas.dc.html`) — painel de conferência (tema escuro).

## Rodar localmente

Qualquer servidor estático serve, por exemplo:

```bash
python -m http.server 8000
```

Depois abra http://localhost:8000

## Deploy

Site 100% estático — no Vercel basta importar o repositório sem build command
(preset "Other"). O `index.html` da raiz é a página inicial.
