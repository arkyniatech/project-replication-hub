
-- Fix contratos INSERT policy to include master role
DROP POLICY IF EXISTS "Active staff can create contracts" ON public.contratos;

CREATE POLICY "Active staff can create contracts"
ON public.contratos FOR INSERT
TO public
WITH CHECK (
  is_active(auth.uid()) AND
  (
    is_master(auth.uid()) OR
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  ) AND
  loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas
    WHERE user_id = auth.uid()
  )
);

-- Fix contrato_itens INSERT policy to include master role
DROP POLICY IF EXISTS "Vendedor pode criar itens de contrato" ON public.contrato_itens;

CREATE POLICY "Vendedor pode criar itens de contrato"
ON public.contrato_itens FOR INSERT
TO public
WITH CHECK (
  is_master(auth.uid()) OR
  has_role(auth.uid(), 'vendedor'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix contrato_itens UPDATE policy to include master role
DROP POLICY IF EXISTS "Vendedor pode atualizar itens de contrato" ON public.contrato_itens;

CREATE POLICY "Vendedor pode atualizar itens de contrato"
ON public.contrato_itens FOR UPDATE
TO public
USING (
  is_master(auth.uid()) OR
  has_role(auth.uid(), 'vendedor'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix contratos UPDATE policy to include master role
DROP POLICY IF EXISTS "Vendedor pode atualizar contratos" ON public.contratos;

CREATE POLICY "Vendedor pode atualizar contratos"
ON public.contratos FOR UPDATE
TO public
USING (
  (
    is_master(auth.uid()) OR
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  ) AND
  loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas
    WHERE user_id = auth.uid()
  )
);
;
