-- ============================================
-- Garantir roles admin e rh para o usuário
-- ============================================

-- Função SECURITY DEFINER para inserir roles (com aliases para evitar ambiguidade)
CREATE OR REPLACE FUNCTION public.ensure_user_roles_v3()
RETURNS TABLE(uid uuid, user_role app_role) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid := '5be19bf1-0eac-4501-8fb5-217140626b3c';
BEGIN
  -- Inserir admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Inserir rh
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'rh')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Retornar as roles inseridas para validação
  RETURN QUERY
  SELECT ur.user_id, ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id;
END;
$$;

-- Executar e exibir resultado
SELECT * FROM public.ensure_user_roles_v3();

-- Cleanup
DROP FUNCTION IF EXISTS public.ensure_user_roles_v3();