-- Remover políticas antigas e recriar com a política de dev

DROP POLICY IF EXISTS "Pessoas visíveis para autenticados" ON public.pessoas;
DROP POLICY IF EXISTS "Admin e RH podem inserir pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Admin e RH podem atualizar pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Admin e RH podem deletar pessoas" ON public.pessoas;

-- ⚠️ POLÍTICA TEMPORÁRIA PARA DEV - REMOVER ANTES DE PRODUÇÃO ⚠️
CREATE POLICY "DEV: Leitura pública temporária"
ON public.pessoas
FOR SELECT
TO authenticated, anon
USING (true);

-- Manter INSERT/UPDATE/DELETE apenas para admin e RH
CREATE POLICY "Admin e RH podem inserir pessoas"
ON public.pessoas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'rh'::app_role)
);

CREATE POLICY "Admin e RH podem atualizar pessoas"
ON public.pessoas
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'rh'::app_role)
);

CREATE POLICY "Admin e RH podem deletar pessoas"
ON public.pessoas
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'rh'::app_role)
);