
-- 1. Securing system_logs (current: INSERT true)
DROP POLICY IF EXISTS "Users can insert logs" ON public.system_logs;
CREATE POLICY "Active users can insert logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (is_active(auth.uid()));

-- 2. Securing user_profiles (current: active can see own, admin all)
-- (Já possui políticas razoáveis, mas vamos garantir is_active para UPDATE)
DROP POLICY IF EXISTS "Usuários veem próprio perfil ou admin/rh veem todos" ON public.user_profiles;
CREATE POLICY "Active users see own profile or admin/rh all"
  ON public.user_profiles FOR SELECT
  USING (
    is_active(auth.uid()) AND (id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role)
  );

-- 3. Updating other table modification policies
-- (Vendedor can create equipment)
DROP POLICY IF EXISTS "Vendedor pode criar equipamentos" ON public.equipamentos;
CREATE POLICY "Active staff can create equipment"
  ON public.equipamentos FOR INSERT
  WITH CHECK (
    is_active(auth.uid()) AND 
    (has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND 
    (loja_atual_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  );

-- (Vendedor can create contracts)
DROP POLICY IF EXISTS "Vendedor pode criar contratos" ON public.contratos;
CREATE POLICY "Active staff can create contracts"
  ON public.contratos FOR INSERT
  WITH CHECK (
    is_active(auth.uid()) AND 
    (has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND 
    (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  );
;
