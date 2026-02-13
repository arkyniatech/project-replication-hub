-- Apenas corrigir RLS de user_profiles
DROP POLICY IF EXISTS "DEV: Permitir criação de perfis durante signup" ON public.user_profiles;

CREATE POLICY "Admin pode criar perfis ou usuário cria próprio"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  id = auth.uid()
);