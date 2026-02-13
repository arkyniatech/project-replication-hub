-- ============================================
-- Bootstrap Admin via SECURITY DEFINER Function
-- ============================================

-- PASSO 1: Criar função SECURITY DEFINER para inserir o primeiro admin
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir role 'admin' para o usuário bootstrap
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('5be19bf1-0eac-4501-8fb5-217140626b3c', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- PASSO 2: Executar a função de bootstrap
SELECT public.bootstrap_first_admin();

-- PASSO 3: Remover a função (cleanup de segurança)
DROP FUNCTION IF EXISTS public.bootstrap_first_admin();