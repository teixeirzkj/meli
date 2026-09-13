-- Rotas — schema inicial
-- Rode no Supabase: SQL Editor > New query > cole > Run

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text not null,
  nome               text not null default '',
  tipo               text not null default 'user' check (tipo in ('user', 'admin')),
  assinatura_inicio  date not null default current_date,
  assinatura_fim     date not null default (current_date + 30),
  created_at         timestamptz not null default now()
);

-- ------------------------------------------------------------------- rotas
create table if not exists public.rotas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  nome           text not null,
  qtd_esperada   integer not null check (qtd_esperada > 0),
  data_rota      date not null default current_date,
  status         text not null default 'em_conferencia'
                 check (status in ('em_conferencia', 'finalizada')),
  finalizada_em  timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists rotas_user_data_idx on public.rotas (user_id, data_rota desc);

-- ----------------------------------------------------------------- pacotes
create table if not exists public.pacotes (
  id          uuid primary key default gen_random_uuid(),
  rota_id     uuid not null references public.rotas (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  codigo      text not null,
  parada      text,
  excedente   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (rota_id, codigo)
);

create index if not exists pacotes_rota_idx on public.pacotes (rota_id, created_at desc);

-- -------------------------------------------------------------- app_config
-- Linha única com as regras de validação do código do pacote.
create table if not exists public.app_config (
  id                  boolean primary key default true check (id),
  codigo_min_digitos  integer not null default 4  check (codigo_min_digitos >= 1),
  codigo_max_digitos  integer not null default 20 check (codigo_max_digitos >= 1),
  updated_at          timestamptz not null default now(),
  constraint app_config_digitos_ok check (codigo_max_digitos >= codigo_min_digitos)
);

insert into public.app_config (id) values (true) on conflict (id) do nothing;

-- ------------------------------------------------------ helpers e triggers
-- security definer: lê profiles sem passar por RLS, evitando recursão nas policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.tipo = 'admin'
  );
$$;

-- Todo usuário criado no Auth ganha um profile com 30 dias de assinatura.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- RLS
alter table public.profiles   enable row level security;
alter table public.rotas      enable row level security;
alter table public.pacotes    enable row level security;
alter table public.app_config enable row level security;

-- profiles: cada um vê e edita o seu; admin vê e edita todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- rotas: dono ou admin.
drop policy if exists rotas_select on public.rotas;
create policy rotas_select on public.rotas
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists rotas_insert on public.rotas;
create policy rotas_insert on public.rotas
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists rotas_update on public.rotas;
create policy rotas_update on public.rotas
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists rotas_delete on public.rotas;
create policy rotas_delete on public.rotas
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- pacotes: dono ou admin.
drop policy if exists pacotes_select on public.pacotes;
create policy pacotes_select on public.pacotes
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists pacotes_insert on public.pacotes;
create policy pacotes_insert on public.pacotes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.rotas r
      where r.id = rota_id and r.user_id = auth.uid() and r.status = 'em_conferencia'
    )
  );

drop policy if exists pacotes_delete on public.pacotes;
create policy pacotes_delete on public.pacotes
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- app_config: todo mundo lê, só admin escreve.
drop policy if exists app_config_select on public.app_config;
create policy app_config_select on public.app_config
  for select to authenticated using (true);

drop policy if exists app_config_update on public.app_config;
create policy app_config_update on public.app_config
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
