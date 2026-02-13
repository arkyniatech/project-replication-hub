-- ============================================
-- CORREÇÃO 1: Restringir Políticas de user_roles
-- ============================================
-- PROBLEMA: Política atual permite qualquer usuário autenticado ver roles de todos
-- SOLUÇÃO: Usuários veem apenas próprias roles, exceto admin/rh

-- Remover política permissiva atual
DROP POLICY IF EXISTS "Roles visíveis para autenticados" ON user_roles;

-- Criar política restritiva
CREATE POLICY "Usuário vê apenas próprias roles ou admin vê todas"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  );

-- ============================================
-- CORREÇÃO 2: Remover Políticas Duplicadas da Tabela pessoas
-- ============================================
-- PROBLEMA: 7 políticas quando apenas 4 são necessárias (1 por operação CRUD)
-- SOLUÇÃO: Manter apenas as mais permissivas e claras

-- Remover política de DELETE duplicada (mais restritiva)
DROP POLICY IF EXISTS "Apenas admin pode deletar pessoas" ON pessoas;

-- Remover política de INSERT duplicada
DROP POLICY IF EXISTS "Admin e RH podem inserir pessoas" ON pessoas;

-- Remover política de UPDATE duplicada (menos permissiva)
DROP POLICY IF EXISTS "Admin e RH podem atualizar pessoas" ON pessoas;

-- ============================================
-- Comentários de Auditoria
-- ============================================
COMMENT ON POLICY "Usuário vê apenas próprias roles ou admin vê todas" ON user_roles IS 
  '✅ SECURITY FIX: Previne enumeração de admins. Usuários comuns veem apenas suas próprias roles.';

COMMENT ON TABLE pessoas IS 
  '✅ SECURITY FIX: Políticas duplicadas removidas. 4 políticas CRUD mantidas (SELECT/INSERT/UPDATE/DELETE).';