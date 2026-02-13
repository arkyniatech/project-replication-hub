-- ============================================
-- Migration: Garantir CASCADE nas foreign keys de usuários
-- ============================================

-- Verificar e ajustar user_profiles
-- Se a FK existir sem CASCADE, remover e recriar com CASCADE
DO $$ 
BEGIN
  -- Remover constraint antiga se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_id_fkey' 
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
  END IF;
  
  -- Criar nova constraint com CASCADE
  ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
END $$;

-- Verificar e ajustar user_roles
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_fkey' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_user_id_fkey;
  END IF;
  
  ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
END $$;

-- Verificar e ajustar user_lojas_permitidas
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_lojas_permitidas_user_id_fkey' 
    AND table_name = 'user_lojas_permitidas'
  ) THEN
    ALTER TABLE user_lojas_permitidas DROP CONSTRAINT user_lojas_permitidas_user_id_fkey;
  END IF;
  
  ALTER TABLE user_lojas_permitidas 
  ADD CONSTRAINT user_lojas_permitidas_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
END $$;

-- ============================================
-- Comentários de Auditoria
-- ============================================
COMMENT ON CONSTRAINT user_profiles_id_fkey ON user_profiles IS 
  '✅ SECURITY: CASCADE delete - quando usuário é deletado do auth.users, perfil é deletado automaticamente';

COMMENT ON CONSTRAINT user_roles_user_id_fkey ON user_roles IS 
  '✅ SECURITY: CASCADE delete - quando usuário é deletado do auth.users, roles são deletadas automaticamente';

COMMENT ON CONSTRAINT user_lojas_permitidas_user_id_fkey ON user_lojas_permitidas IS 
  '✅ SECURITY: CASCADE delete - quando usuário é deletado do auth.users, lojas permitidas são deletadas automaticamente';