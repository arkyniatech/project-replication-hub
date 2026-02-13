-- ============================================
-- CORREÇÃO CRÍTICA: Remover Política DEV da Tabela Pessoas
-- ============================================

-- 1. Remover política DEV insegura
DROP POLICY IF EXISTS "DEV: Leitura pública temporária" ON pessoas;

-- 2. Criar políticas restritivas para pessoas
CREATE POLICY "Pessoas restritas a próprio perfil ou RH"
  ON pessoas FOR SELECT 
  TO authenticated
  USING (
    id = (SELECT pessoa_id FROM user_profiles WHERE id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'rh'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "RH pode criar pessoas"
  ON pessoas FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role)
  );

CREATE POLICY "RH pode atualizar pessoas"
  ON pessoas FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'rh'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Apenas admin pode deletar pessoas"
  ON pessoas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Adicionar comentários de auditoria
COMMENT ON TABLE pessoas IS 'SECURITY: Acesso restrito a próprio perfil ou RH. Políticas RLS ativas.';