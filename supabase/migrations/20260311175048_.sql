
DROP POLICY IF EXISTS "Staff pode criar titulos" ON public.titulos;

CREATE POLICY "Staff pode criar titulos"
ON public.titulos
FOR INSERT
TO authenticated
WITH CHECK (
  (is_master(auth.uid())
   OR has_role(auth.uid(), 'vendedor'::app_role)
   OR has_role(auth.uid(), 'gestor'::app_role)
   OR has_role(auth.uid(), 'financeiro'::app_role)
   OR has_role(auth.uid(), 'admin'::app_role))
  AND (loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas
    WHERE user_id = auth.uid()
  ))
);
;
