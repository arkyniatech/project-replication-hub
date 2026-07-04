
-- avisos_sistema
DROP POLICY IF EXISTS "Authenticated users can manage avisos_sistema" ON public.avisos_sistema;

CREATE POLICY "Todos autenticados podem ver avisos_sistema"
  ON public.avisos_sistema FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin pode gerenciar avisos_sistema"
  ON public.avisos_sistema FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- config_avisos_header
DROP POLICY IF EXISTS "Authenticated users can manage config_avisos_header" ON public.config_avisos_header;

CREATE POLICY "Todos autenticados podem ver config_avisos_header"
  ON public.config_avisos_header FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin pode gerenciar config_avisos_header"
  ON public.config_avisos_header FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- categorias_n2
DROP POLICY IF EXISTS "Authenticated users can manage categorias_n2" ON public.categorias_n2;

CREATE POLICY "Todos autenticados podem ver categorias_n2"
  ON public.categorias_n2 FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Financeiro pode gerenciar categorias_n2"
  ON public.categorias_n2 FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
  );

-- historico_precos: restrict INSERT to staff roles
DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON public.historico_precos;

CREATE POLICY "Staff pode inserir histórico de preços"
  ON public.historico_precos FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'financeiro'::app_role)
    OR public.has_role(auth.uid(), 'vendedor'::app_role)
  );
;
