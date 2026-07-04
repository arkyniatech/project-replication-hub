DROP POLICY "Vendedor pode criar faturas" ON faturas;

CREATE POLICY "Staff pode criar faturas" ON faturas FOR INSERT TO authenticated
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') 
   OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'admin'))
  AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);;
