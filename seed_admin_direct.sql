-- Enable pgcrypto extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the admin user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@locacaoerp.com',
  crypt('Admin123!@#', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nome":"Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID (in case it already existed or was just created)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@locacaoerp.com';

  -- Create profile in public.user_profiles (if it doesn't exist)
  -- Note: The table schema provided earlier showed create_user creates a profile.
  -- Let's manually ensure it exists.
  -- Wait, the schema listing showed 'user_profiles' table. Let's insert into it.
  
  INSERT INTO public.user_profiles (id, nome, role, created_at, updated_at)
  VALUES (v_user_id, 'Admin', 'admin', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Assign role in public.user_roles (if table structure allows)
  -- The schema listing showed user_roles table with user_id and role columns.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also add to pessoas table if needed by the app logic
  INSERT INTO public.pessoas (
    id, nome, email, tipo, cargo, setor, data_admissao, situacao, 
    cpf, rg, data_nascimento, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), 'Admin', 'admin@locacaoerp.com', 'funcionario', 'Administrador', 'Diretoria', now(), 'ativo',
    '000.000.000-00', '000000000', '1990-01-01', now(), now()
  ) ON CONFLICT (email) DO NOTHING;

END $$;
