-- 1. modelos_equipamentos: require authentication
DROP POLICY IF EXISTS "Modelos visíveis para autenticados" ON public.modelos_equipamentos;
CREATE POLICY "Modelos visíveis para autenticados"
ON public.modelos_equipamentos FOR SELECT
TO authenticated
USING (ativo = true AND public.is_active(auth.uid()));

-- 2. grupos_equipamentos: require authentication
DROP POLICY IF EXISTS "Grupos visíveis para autenticados" ON public.grupos_equipamentos;
CREATE POLICY "Grupos visíveis para autenticados"
ON public.grupos_equipamentos FOR SELECT
TO authenticated
USING (ativo = true AND public.is_active(auth.uid()));

-- 3. obras: add is_active check
DROP POLICY IF EXISTS "Obras visíveis para usuários da loja" ON public.obras;
CREATE POLICY "Obras visíveis para usuários da loja"
ON public.obras FOR SELECT
TO authenticated
USING (
  public.is_active(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR loja_id IN (
      SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp
      WHERE ulp.user_id = auth.uid()
    )
  )
);

-- 4. transferencia_logs: scope by loja (origem or destino)
DROP POLICY IF EXISTS "Logs visiveis para autenticados" ON public.transferencia_logs;
CREATE POLICY "Logs visiveis por loja"
ON public.transferencia_logs FOR SELECT
TO authenticated
USING (
  public.is_active(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.transferencias t
      WHERE t.id = transferencia_logs.transferencia_id
        AND (
          t.origem_loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
          OR t.destino_loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
        )
    )
  )
);

DROP POLICY IF EXISTS "Staff pode inserir logs" ON public.transferencia_logs;
CREATE POLICY "Staff pode inserir logs por loja"
ON public.transferencia_logs FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.transferencias t
      WHERE t.id = transferencia_logs.transferencia_id
        AND (
          t.origem_loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
          OR t.destino_loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
        )
    )
  )
);

-- 5. transferencia_itens: scope by loja
DROP POLICY IF EXISTS "Itens visiveis com a transferencia" ON public.transferencia_itens;
CREATE POLICY "Itens visiveis por loja"
ON public.transferencia_itens FOR SELECT
TO authenticated
USING (
  public.is_active(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.transferencias t
      WHERE t.id = transferencia_itens.transferencia_id
        AND (
          t.origem_loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
          OR t.destino_loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
        )
    )
  )
);;
