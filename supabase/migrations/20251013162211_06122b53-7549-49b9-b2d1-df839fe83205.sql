-- ============================================
-- PASSO 1: Conceder role 'admin' ao usuário atual
-- ============================================
INSERT INTO public.user_roles (user_id, role)
VALUES ('5be19bf1-0eac-4501-8fb5-217140626b3c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- PASSO 2: Ajustar políticas RLS - user_roles
-- ============================================

-- Deletar policies antigas
DROP POLICY IF EXISTS "Admin pode inserir roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin pode atualizar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin pode deletar roles" ON public.user_roles;

-- Criar policies corrigidas
CREATE POLICY "Admin pode inserir roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin pode atualizar roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin pode deletar roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================
-- PASSO 2: Ajustar políticas RLS - user_lojas_permitidas
-- ============================================

-- Deletar policies antigas
DROP POLICY IF EXISTS "Admin pode inserir lojas permitidas" ON public.user_lojas_permitidas;
DROP POLICY IF EXISTS "Admin pode atualizar lojas" ON public.user_lojas_permitidas;
DROP POLICY IF EXISTS "Admin pode deletar lojas permitidas" ON public.user_lojas_permitidas;

-- Criar policies corrigidas
CREATE POLICY "Admin pode inserir lojas permitidas"
  ON public.user_lojas_permitidas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin pode atualizar lojas"
  ON public.user_lojas_permitidas
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin pode deletar lojas permitidas"
  ON public.user_lojas_permitidas
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================
-- PASSO 3: Flexibilizar policy de user_profiles
-- ============================================

-- Deletar policy antiga que bloqueia usuários comuns
DROP POLICY IF EXISTS "Admin pode atualizar perfis" ON public.user_profiles;

-- Criar policy que permite edição do próprio perfil OU admin editar qualquer
CREATE POLICY "Usuário pode atualizar próprio perfil ou admin qualquer"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================
-- PASSO 4: Adicionar loja permitida ao usuário admin
-- ============================================
INSERT INTO public.user_lojas_permitidas (user_id, loja_id)
VALUES ('5be19bf1-0eac-4501-8fb5-217140626b3c', '8ee16ae1-cbbe-46f5-ad64-cbfb455b58ba')
ON CONFLICT (user_id, loja_id) DO NOTHING;