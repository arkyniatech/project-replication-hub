-- Adicionar policy de DELETE para user_roles que permita admins deletarem qualquer role
-- Isso evita o problema de recursão quando atualizamos roles

DROP POLICY IF EXISTS "Admin pode deletar roles" ON public.user_roles;

CREATE POLICY "Admin pode deletar roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);