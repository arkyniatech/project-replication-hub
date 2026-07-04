CREATE POLICY "Usuarios podem ver suas proprias roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());;
