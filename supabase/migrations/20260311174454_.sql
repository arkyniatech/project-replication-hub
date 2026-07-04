
-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Vendedor pode atualizar clientes" ON public.clientes;

-- Recreate as PERMISSIVE
CREATE POLICY "Vendedor pode atualizar clientes"
ON public.clientes
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'vendedor'::app_role)
   OR has_role(auth.uid(), 'gestor'::app_role)
   OR has_role(auth.uid(), 'admin'::app_role)
   OR is_master(auth.uid()))
  AND (loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas
    WHERE user_id = auth.uid()
  ))
);
;
