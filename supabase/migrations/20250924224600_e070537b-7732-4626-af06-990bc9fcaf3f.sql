-- Confirmar email do usuário admin (apenas email_confirmed_at)
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'admin@b2x.com.br';