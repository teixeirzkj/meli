-- Rode uma vez, depois da migration 0001_init.sql.

-- 1. Quem já existia no Auth antes do trigger não ganhou profile. Cria agora.
insert into public.profiles (id, email, nome)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1))
  from auth.users u
 where u.email is not null
    on conflict (id) do nothing;

-- 2. Promove a conta do dono a administrador.
update public.profiles
   set tipo = 'admin',
       assinatura_fim = current_date + 3650
 where email = 'riquelmetat@gmail.com';
