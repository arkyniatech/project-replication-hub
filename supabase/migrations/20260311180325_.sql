
-- Fix INSERT policy to include is_master
DROP POLICY IF EXISTS "Staff pode criar aditivos" ON public.aditivos_contratuais;
CREATE POLICY "Staff pode criar aditivos" ON public.aditivos_contratuais 
FOR INSERT TO authenticated
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);

-- Fix UPDATE policy to include is_master
DROP POLICY IF EXISTS "Staff pode atualizar aditivos" ON public.aditivos_contratuais;
CREATE POLICY "Staff pode atualizar aditivos" ON public.aditivos_contratuais 
FOR UPDATE TO authenticated
USING (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);

-- Fix SELECT policy to include is_master
DROP POLICY IF EXISTS "Aditivos visíveis para usuários ativos da loja" ON public.aditivos_contratuais;
CREATE POLICY "Aditivos visíveis para usuários ativos da loja" ON public.aditivos_contratuais 
FOR SELECT TO authenticated
USING (
  is_master(auth.uid()) OR
  (is_active(auth.uid()) AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix DELETE policy to include is_master
DROP POLICY IF EXISTS "Admin pode deletar aditivos" ON public.aditivos_contratuais;
CREATE POLICY "Admin pode deletar aditivos" ON public.aditivos_contratuais 
FOR DELETE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
;
