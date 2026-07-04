
DROP POLICY IF EXISTS "Authenticated users can manage titulos_pagar" ON public.titulos_pagar;

CREATE POLICY "Financeiro pode ver titulos_pagar"
  ON public.titulos_pagar FOR SELECT TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gestor'::app_role)
        OR public.has_role(auth.uid(), 'financeiro'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Financeiro pode criar titulos_pagar"
  ON public.titulos_pagar FOR INSERT TO authenticated
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gestor'::app_role)
        OR public.has_role(auth.uid(), 'financeiro'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Financeiro pode atualizar titulos_pagar"
  ON public.titulos_pagar FOR UPDATE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gestor'::app_role)
        OR public.has_role(auth.uid(), 'financeiro'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admin pode excluir titulos_pagar"
  ON public.titulos_pagar FOR DELETE TO authenticated
  USING (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated users can manage parcelas_pagar" ON public.parcelas_pagar;

CREATE POLICY "Acesso herdado do titulo - parcelas_pagar"
  ON public.parcelas_pagar FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.titulos_pagar tp
      WHERE tp.id = parcelas_pagar.titulo_id
        AND (public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'gestor'::app_role)
             OR public.has_role(auth.uid(), 'financeiro'::app_role))
        AND tp.loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.titulos_pagar tp
      WHERE tp.id = parcelas_pagar.titulo_id
        AND (public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'gestor'::app_role)
             OR public.has_role(auth.uid(), 'financeiro'::app_role))
        AND tp.loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can manage aprovacoes_cp" ON public.aprovacoes_cp;

CREATE POLICY "Financeiro pode gerenciar aprovacoes_cp"
  ON public.aprovacoes_cp FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "Authenticated users can manage logistica_tarefas" ON public.logistica_tarefas;

CREATE POLICY "Equipe pode gerenciar logistica_tarefas da loja"
  ON public.logistica_tarefas FOR ALL TO authenticated
  USING (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gestor'::app_role)
        OR public.has_role(auth.uid(), 'financeiro'::app_role)
        OR public.has_role(auth.uid(), 'vendedor'::app_role)
        OR public.has_role(auth.uid(), 'mecanico'::app_role)
        OR public.has_role(auth.uid(), 'motorista'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_master(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'gestor'::app_role)
        OR public.has_role(auth.uid(), 'financeiro'::app_role)
        OR public.has_role(auth.uid(), 'vendedor'::app_role)
        OR public.has_role(auth.uid(), 'mecanico'::app_role)
        OR public.has_role(auth.uid(), 'motorista'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );
;
