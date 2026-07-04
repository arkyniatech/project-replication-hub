-- ============================================================
-- APLICAR EM PRODUÇÃO — Supabase Dashboard > SQL Editor
-- Projeto: otpbnwpnprgdncexvksx
-- Data: 2026-07-03
--
-- Corrige: "new row violates row-level security policy for
-- table user_roles" ao criar/editar usuários com papel master.
--
-- Obs.: o enum app_role de produção JÁ possui 'master' e
-- 'usuario' (verificado em 2026-07-03), então este script só
-- ajusta as policies. É idempotente — pode rodar mais de uma vez.
-- ============================================================

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
