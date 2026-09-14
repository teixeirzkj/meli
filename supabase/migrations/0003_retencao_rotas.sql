-- Rotas — expurgo automático de rotas antigas
-- Rode depois da 0002: SQL Editor > New query > cole > Run

-- ------------------------------------------------- janela de retenção
alter table public.app_config
  add column if not exists dias_retencao_rotas integer not null default 60;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_config_retencao_ok') then
    alter table public.app_config
      add constraint app_config_retencao_ok
      check (dias_retencao_rotas >= 7 and dias_retencao_rotas <= 3650);
  end if;
end $$;

-- ------------------------------------------------------ registro das faxinas
create table if not exists public.manutencao_log (
  id               bigserial primary key,
  executado_em     timestamptz not null default now(),
  rotas_removidas  integer not null,
  dias_retencao    integer not null
);

alter table public.manutencao_log enable row level security;

drop policy if exists manutencao_log_select on public.manutencao_log;
create policy manutencao_log_select on public.manutencao_log
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------- a limpeza
-- Apaga rotas criadas há mais de N dias. Os pacotes vão junto pelo
-- "on delete cascade" da própria tabela.
create or replace function public.limpar_rotas_antigas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  dias      integer;
  removidas integer;
begin
  select dias_retencao_rotas into dias from public.app_config where id = true;
  dias := coalesce(dias, 60);

  with apagadas as (
    delete from public.rotas
     where created_at < now() - make_interval(days => dias)
    returning 1
  )
  select count(*)::int into removidas from apagadas;

  -- Só registra quando houve o que apagar, para o log não virar ruído diário.
  if removidas > 0 then
    insert into public.manutencao_log (rotas_removidas, dias_retencao)
    values (removidas, dias);
  end if;

  return removidas;
end;
$$;

revoke all on function public.limpar_rotas_antigas() from public, anon, authenticated;
grant execute on function public.limpar_rotas_antigas() to service_role;

-- ------------------------------------------------------------ agendamento
-- Todo dia às 04:00 UTC (01:00 em Brasília), fora do horário de operação.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('limpar-rotas-antigas')
   where exists (select 1 from cron.job where jobname = 'limpar-rotas-antigas');

  perform cron.schedule(
    'limpar-rotas-antigas',
    '0 4 * * *',
    $cron$ select public.limpar_rotas_antigas(); $cron$
  );
exception
  when others then
    -- Sem pg_cron o app ainda tem a rota /api/cron/limpeza como rede de
    -- segurança; a limpeza não fica dependendo só daqui.
    raise notice 'pg_cron indisponível (%), use o cron da Vercel', sqlerrm;
end $$;
