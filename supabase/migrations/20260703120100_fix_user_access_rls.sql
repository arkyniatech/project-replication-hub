-- ============================================
-- Corrigir RLS de user_roles / user_lojas_permitidas
-- para reconhecer o papel 'master'
-- ============================================
-- PROBLEMA: as policies existentes só consideravam 'admin'. Usuários master
-- (e fluxos legados no navegador) recebiam:
--   "new row violates row-level security policy for table user_roles"
-- e o usuário ficava meio-criado (aparecia na lista sem roles).
--
-- MODELO:
--   SELECT  -> o próprio usuário, ou master/admin/rh
--   INSERT/UPDATE/DELETE -> apenas master/admin (RH gerencia acessos somente
--   via Edge Functions create-user / update-user-access, que usam
--   service_role e aplicam regras finas de privilégio).

-- ---------- user_roles ----------
DROP POLICY IF EXISTS "Usuário vê apenas próprias roles ou admin vê todas" ON public.user_roles;
CREATE POLICY "Usuário vê apenas próprias roles ou admin vê todas"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
  );

DROP POLICY IF EXISTS "Admin pode inserir roles" ON public.user_roles;
CREATE POLICY "Admin pode inserir roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admin pode atualizar roles" ON public.user_roles;
CREATE POLICY "Admin pode atualizar roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admin pode deletar roles" ON public.user_roles;
CREATE POLICY "Admin pode deletar roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------- user_lojas_permitidas ----------
DROP POLICY IF EXISTS "Admin pode inserir lojas permitidas" ON public.user_lojas_permitidas;
CREATE POLICY "Admin pode inserir lojas permitidas"
  ON public.user_lojas_permitidas FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admin pode atualizar lojas" ON public.user_lojas_permitidas;
CREATE POLICY "Admin pode atualizar lojas"
  ON public.user_lojas_permitidas FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admin pode deletar lojas permitidas" ON public.user_lojas_permitidas;
CREATE POLICY "Admin pode deletar lojas permitidas"
  ON public.user_lojas_permitidas FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'master'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

COMMENT ON POLICY "Admin pode inserir roles" ON public.user_roles IS
  'master/admin podem gerenciar roles diretamente; RH usa as Edge Functions (service_role).';
