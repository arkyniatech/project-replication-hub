
DROP POLICY IF EXISTS "Vendedor pode criar clientes" ON public.clientes;

CREATE POLICY "Vendedor pode criar clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (loja_id IN (
    SELECT user_lojas_permitidas.loja_id
    FROM user_lojas_permitidas
    WHERE user_lojas_permitidas.user_id = auth.uid()
  ))
);
;
