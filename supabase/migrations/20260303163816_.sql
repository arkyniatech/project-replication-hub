
-- Adicionar is_master() nas políticas de SELECT/CRUD

-- PESSOAS
DROP POLICY IF EXISTS "Pessoas visíveis para Admin e RH" ON public.pessoas;
CREATE POLICY "Pessoas visíveis para Admin e RH"
ON public.pessoas FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- CENTROS_CUSTO
DROP POLICY IF EXISTS "Centros de custo visíveis para Admin e RH" ON public.centros_custo;
CREATE POLICY "Centros de custo visíveis para Admin e RH"
ON public.centros_custo FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

DROP POLICY IF EXISTS "Admin e RH podem inserir centros de custo" ON public.centros_custo;
CREATE POLICY "Admin e RH podem inserir centros de custo"
ON public.centros_custo FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

DROP POLICY IF EXISTS "Admin e RH podem atualizar centros de custo" ON public.centros_custo;
CREATE POLICY "Admin e RH podem atualizar centros de custo"
ON public.centros_custo FOR UPDATE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

DROP POLICY IF EXISTS "Admin pode deletar centros de custo" ON public.centros_custo;
CREATE POLICY "Admin pode deletar centros de custo"
ON public.centros_custo FOR DELETE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- HISTORICO_PRECOS
DROP POLICY IF EXISTS "Gestor pode ver histórico de preços" ON public.historico_precos;
CREATE POLICY "Gestor pode ver histórico de preços"
ON public.historico_precos FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- SYSTEM_LOGS
DROP POLICY IF EXISTS "Admins view all logs" ON public.system_logs;
CREATE POLICY "Admins view all logs"
ON public.system_logs FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

DROP POLICY IF EXISTS "Active users can insert logs" ON public.system_logs;
CREATE POLICY "Active users can insert logs"
ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()) OR is_active(auth.uid()));

-- PRODUTIVIDADE
DROP POLICY IF EXISTS "Produtividade visível para gestão e próprio mecânico" ON public.produtividade_manutencao;
CREATE POLICY "Produtividade visível para gestão e próprio mecânico"
ON public.produtividade_manutencao FOR SELECT TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- GRUPOS_EQUIPAMENTOS
DROP POLICY IF EXISTS "Gestor pode criar grupos" ON public.grupos_equipamentos;
CREATE POLICY "Gestor pode criar grupos"
ON public.grupos_equipamentos FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Gestor pode atualizar grupos" ON public.grupos_equipamentos;
CREATE POLICY "Gestor pode atualizar grupos"
ON public.grupos_equipamentos FOR UPDATE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin pode deletar grupos" ON public.grupos_equipamentos;
CREATE POLICY "Admin pode deletar grupos"
ON public.grupos_equipamentos FOR DELETE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- MODELOS_EQUIPAMENTOS
DROP POLICY IF EXISTS "Gestor pode criar modelos" ON public.modelos_equipamentos;
CREATE POLICY "Gestor pode criar modelos"
ON public.modelos_equipamentos FOR INSERT TO authenticated
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Gestor pode atualizar modelos" ON public.modelos_equipamentos;
CREATE POLICY "Gestor pode atualizar modelos"
ON public.modelos_equipamentos FOR UPDATE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin pode deletar modelos" ON public.modelos_equipamentos;
CREATE POLICY "Admin pode deletar modelos"
ON public.modelos_equipamentos FOR DELETE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- CHECKLIST_TEMPLATES
DROP POLICY IF EXISTS "Gestão pode gerir templates" ON public.checklist_templates;
CREATE POLICY "Gestão pode gerir templates"
ON public.checklist_templates FOR ALL TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- ORDENS_SERVICO
DROP POLICY IF EXISTS "Equipe técnica e gestão podem gerir OS" ON public.ordens_servico;
CREATE POLICY "Equipe técnica e gestão podem gerir OS"
ON public.ordens_servico FOR ALL TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'mecanico'::app_role))
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'mecanico'::app_role));
;
