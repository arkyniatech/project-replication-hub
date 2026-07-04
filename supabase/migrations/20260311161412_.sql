DROP POLICY IF EXISTS "Vendedor pode criar obras" ON public.obras;
CREATE POLICY "Vendedor pode criar obras"
ON public.obras
FOR INSERT
TO public
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (loja_id IN (
    SELECT user_lojas_permitidas.loja_id
    FROM user_lojas_permitidas
    WHERE user_lojas_permitidas.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Vendedor pode atualizar obras" ON public.obras;
CREATE POLICY "Vendedor pode atualizar obras"
ON public.obras
FOR UPDATE
TO public
USING (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (loja_id IN (
    SELECT user_lojas_permitidas.loja_id
    FROM user_lojas_permitidas
    WHERE user_lojas_permitidas.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Admin pode deletar obras" ON public.obras;
CREATE POLICY "Admin pode deletar obras"
ON public.obras
FOR DELETE
TO public
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));;
