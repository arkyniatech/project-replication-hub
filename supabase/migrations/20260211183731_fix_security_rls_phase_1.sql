
-- 1. Habilitar RLS em tabelas faltantes
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtividade_manutencao ENABLE ROW LEVEL SECURITY;

-- 2. Corrigir políticas permissivas em tabelas críticas

-- PESSOAS (SELECT era 'true')
DROP POLICY IF EXISTS "Pessoas visíveis para autenticados" ON public.pessoas;
CREATE POLICY "Pessoas visíveis para Admin e RH"
  ON public.pessoas FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  );

-- USER_ROLES (SELECT era 'true')
DROP POLICY IF EXISTS "Roles visíveis para autenticados" ON public.user_roles;
CREATE POLICY "Roles visíveis para Admin e Gestor"
  ON public.user_roles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role)
  );

-- LOJAS (SELECT era 'true')
DROP POLICY IF EXISTS "Lojas visíveis para autenticados" ON public.lojas;
CREATE POLICY "Lojas visíveis para quem tem acesso permitido"
  ON public.lojas FOR SELECT
  USING (
    id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- CENTROS_CUSTO (SELECT era 'true')
DROP POLICY IF EXISTS "Centros de custo visíveis para autenticados" ON public.centros_custo;
CREATE POLICY "Centros de custo visíveis para Admin e RH"
  ON public.centros_custo FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  );

-- 3. Criar políticas para as tabelas recém-habilitadas

-- ORDENS_SERVIÇO
CREATE POLICY "OS visíveis por loja permitida"
  ON public.ordens_servico FOR SELECT
  USING (
    loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Equipe técnica e gestão podem gerir OS"
  ON public.ordens_servico FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'mecanico'::app_role)
  );

-- CHECKLIST_TEMPLATES
CREATE POLICY "Templates visíveis para autenticados"
  ON public.checklist_templates FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Gestão pode gerir templates"
  ON public.checklist_templates FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role)
  );

-- PRODUTIVIDADE_MANUTENCAO
CREATE POLICY "Produtividade visível para gestão e próprio mecânico"
  ON public.produtividade_manutencao FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role)
  );
;
