
DROP POLICY IF EXISTS "Authenticated users can view fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can insert fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can update fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Authenticated users can delete fornecedores" ON public.fornecedores;

CREATE POLICY "Roles autorizados podem ver fornecedores" ON public.fornecedores
  FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  );

CREATE POLICY "Roles autorizados podem inserir fornecedores" ON public.fornecedores
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  );

CREATE POLICY "Roles autorizados podem atualizar fornecedores" ON public.fornecedores
  FOR UPDATE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  );

CREATE POLICY "Roles autorizados podem excluir fornecedores" ON public.fornecedores
  FOR DELETE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
;
