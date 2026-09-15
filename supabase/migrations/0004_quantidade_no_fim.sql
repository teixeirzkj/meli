-- Rotas — quantidade esperada deixa de ser exigida na criação
-- Rode depois da 0003: SQL Editor > New query > cole > Run

-- Na operação real ninguém sabe quantos pacotes são quando a rota começa: o
-- número aparece depois da conferência. A rota nasce sem quantidade e recebe
-- o valor ao ser finalizada, que é quando falta e excedente fazem sentido.
alter table public.rotas
  alter column qtd_esperada drop not null;

-- A checagem antiga (> 0) segue valendo para quando o valor existir: em SQL,
-- comparação com null dá "desconhecido" e a linha passa.
