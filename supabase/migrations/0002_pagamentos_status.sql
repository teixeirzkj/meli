-- Rotas — pagamentos e situação da conta
-- Rode depois da 0001_init.sql: SQL Editor > New query > cole > Run

-- ------------------------------------------------- situação da conta
-- ativo: usa o app normalmente
-- suspenso: acesso pausado (inadimplência, férias) — reversível
-- bloqueado: acesso cortado pelo administrador
alter table public.profiles
  add column if not exists status text not null default 'ativo';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_ok'
  ) then
    alter table public.profiles
      add constraint profiles_status_ok
      check (status in ('ativo', 'suspenso', 'bloqueado'));
  end if;
end $$;

-- --------------------------------------------------------- pagamentos
create table if not exists public.pagamentos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  valor           numeric(10, 2) not null check (valor > 0),
  data_pagamento  date not null default current_date,
  -- primeiro dia do mês de referência, para agrupar o faturamento
  competencia     date not null,
  metodo          text not null default 'pix'
                  check (metodo in ('pix', 'cartao', 'boleto', 'dinheiro', 'outro')),
  observacao      text,
  registrado_por  uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists pagamentos_competencia_idx
  on public.pagamentos (competencia desc);

create index if not exists pagamentos_user_idx
  on public.pagamentos (user_id, data_pagamento desc);

alter table public.pagamentos enable row level security;

-- Usuário vê os próprios pagamentos; só admin registra, corrige e apaga.
drop policy if exists pagamentos_select on public.pagamentos;
create policy pagamentos_select on public.pagamentos
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists pagamentos_insert on public.pagamentos;
create policy pagamentos_insert on public.pagamentos
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists pagamentos_update on public.pagamentos;
create policy pagamentos_update on public.pagamentos
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists pagamentos_delete on public.pagamentos;
create policy pagamentos_delete on public.pagamentos
  for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------- faturamento por competência
-- Agregado pronto para o dashboard: total e quantidade por mês.
create or replace view public.faturamento_mensal
with (security_invoker = true) as
  select competencia,
         sum(valor)::numeric(12, 2) as total,
         count(*)::int              as quantidade,
         count(distinct user_id)::int as usuarios
    from public.pagamentos
   group by competencia
   order by competencia desc;
