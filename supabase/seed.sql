-- Promove um usuário já existente a administrador.
-- Rode depois de criar a conta no Auth.
update public.profiles
   set tipo = 'admin',
       assinatura_fim = current_date + 3650
 where email = 'riquelmetat@gmail.com';
