-- ============================================================
-- Fix #27: equipamentos UPDATE/INSERT sem bypass de master
-- ============================================================

DROP POLICY IF EXISTS "Vendedor pode atualizar equipamentos" ON public.equipamentos;
CREATE POLICY "Staff pode atualizar equipamentos"
ON public.equipamentos
FOR UPDATE
TO authenticated
USING (
  is_master(auth.uid())
  OR (
    is_active(auth.uid())
    AND (
      has_role(auth.uid(), 'vendedor'::app_role)
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    AND (loja_atual_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Active staff can create equipment" ON public.equipamentos;
CREATE POLICY "Staff pode criar equipamentos"
ON public.equipamentos
FOR INSERT
TO authenticated
WITH CHECK (
  is_master(auth.uid())
  OR (
    is_active(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR has_role(auth.uid(), 'vendedor'::app_role)
    )
    AND (loja_atual_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  )
);

-- ============================================================
-- Fix #16: titulos SELECT/UPDATE/DELETE sem bypass de master
-- ============================================================

DROP POLICY IF EXISTS "Titulos visíveis para usuários ativos da loja" ON public.titulos;
CREATE POLICY "Titulos visíveis para staff"
ON public.titulos
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_active(auth.uid())
    AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Staff pode atualizar titulos" ON public.titulos;
CREATE POLICY "Staff pode atualizar titulos"
ON public.titulos
FOR UPDATE
TO authenticated
USING (
  is_master(auth.uid())
  OR (
    (
      has_role(auth.uid(), 'vendedor'::app_role)
      OR has_role(auth.uid(), 'gestor'::app_role)
      OR has_role(auth.uid(), 'financeiro'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Admin pode deletar titulos" ON public.titulos;
CREATE POLICY "Master/Admin pode deletar titulos"
ON public.titulos
FOR DELETE
TO authenticated
USING (
  is_master(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);;
