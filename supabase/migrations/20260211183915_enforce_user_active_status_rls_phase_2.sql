
-- 1. Criar função auxiliar para checar se o usuário está ativo
CREATE OR REPLACE FUNCTION public.is_active(u_id UUID) 
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT ativo FROM public.user_profiles WHERE id = u_id), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Atualizar políticas críticas para incluir checagem de status

-- EQUIPAMENTOS
DROP POLICY IF EXISTS "Equipamentos visíveis para usuários da loja" ON public.equipamentos;
CREATE POLICY "Equipamentos visíveis para usuários ativos da loja"
  ON public.equipamentos FOR SELECT
  USING (
    is_active(auth.uid()) AND 
    loja_atual_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- CLIENTES
DROP POLICY IF EXISTS "Clientes visíveis para usuários da loja" ON public.clientes;
CREATE POLICY "Clientes visíveis para usuários ativos da loja"
  ON public.clientes FOR SELECT
  USING (
    is_active(auth.uid()) AND 
    loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- CONTRATOS
DROP POLICY IF EXISTS "Contratos visíveis para usuários da loja" ON public.contratos;
CREATE POLICY "Contratos visíveis para usuários ativos da loja"
  ON public.contratos FOR SELECT
  USING (
    is_active(auth.uid()) AND 
    loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ORDENS_SERVICO
DROP POLICY IF EXISTS "OS visíveis por loja permitida" ON public.ordens_servico;
CREATE POLICY "OS visíveis por loja para usuários ativos"
  ON public.ordens_servico FOR SELECT
  USING (
    is_active(auth.uid()) AND 
    (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role))
  );

-- FATURAS
DROP POLICY IF EXISTS "Faturas visíveis para usuários da loja" ON public.faturas;
CREATE POLICY "Faturas visíveis para usuários ativos da loja"
  ON public.faturas FOR SELECT
  USING (
    is_active(auth.uid()) AND 
    loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );
;
