
-- 1) pessoas SELECT: require is_active
DROP POLICY IF EXISTS "Pessoas visíveis para Admin e RH" ON public.pessoas;
CREATE POLICY "Pessoas visíveis para Admin e RH"
ON public.pessoas FOR SELECT
TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  )
);

-- 2) horimetro_leituras SELECT: scope by loja via equipamentos.loja_atual_id
DROP POLICY IF EXISTS "Leituras visíveis para usuários ativos" ON public.horimetro_leituras;
CREATE POLICY "Leituras visíveis por loja para usuários ativos"
ON public.horimetro_leituras FOR SELECT
TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.equipamentos e
      WHERE e.id = horimetro_leituras.equipamento_id
      AND e.loja_atual_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
      )
    )
  )
);

-- 3) produtividade_manutencao SELECT: scope by loja_id
DROP POLICY IF EXISTS "Produtividade visível para gestão e próprio mecânico" ON public.produtividade_manutencao;
CREATE POLICY "Produtividade visível por loja para gestão"
ON public.produtividade_manutencao FOR SELECT
TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'gestor'::app_role)
      AND loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
      )
    )
  )
);

-- 4) ordens_servico ALL: scope by loja_id on USING and WITH CHECK
DROP POLICY IF EXISTS "Equipe técnica e gestão podem gerir OS" ON public.ordens_servico;
CREATE POLICY "Equipe técnica e gestão podem gerir OS"
ON public.ordens_servico FOR ALL
TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'mecanico'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
)
WITH CHECK (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'mecanico'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
);

-- 5) storage.objects: add UPDATE policy for contratos-anexos
DROP POLICY IF EXISTS "Users can update contract attachments from permitted stores" ON storage.objects;
CREATE POLICY "Users can update contract attachments from permitted stores"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contratos-anexos'
  AND is_active(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
    AND (
      is_master(auth.uid())
      OR c.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
    )
  )
)
WITH CHECK (
  bucket_id = 'contratos-anexos'
  AND is_active(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.contratos c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
    AND (
      is_master(auth.uid())
      OR c.loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid())
    )
  )
);
;
