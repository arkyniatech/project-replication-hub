-- ====================================
-- MÓDULO MANUTENÇÃO - ESTRUTURA COMPLETA
-- ====================================

-- 1. ENUMS para o módulo de manutenção
CREATE TYPE area_oficina AS ENUM ('AMARELA', 'VERMELHA', 'AZUL', 'VERDE', 'CINZA');
CREATE TYPE status_os AS ENUM ('EM_ANALISE', 'AGUARD_PECA', 'EM_REPARO', 'EM_TESTE', 'CONCLUIDA');
CREATE TYPE tipo_os AS ENUM ('PREVENTIVA', 'CORRETIVA');
CREATE TYPE origem_os AS ENUM ('POS_LOCACAO', 'AUDITORIA', 'SUPORTE');
CREATE TYPE prioridade_os AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE class_defeito AS ENUM ('DESGASTE', 'MAU_USO', 'NA');
CREATE TYPE status_pedido AS ENUM ('RASCUNHO', 'FINALIZADO', 'COMPRADO', 'PARCIAL', 'TOTAL');

-- 2. TABELA: ordens_servico (OS)
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  equipamento_id UUID NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL,
  tipo tipo_os NOT NULL,
  origem origem_os NOT NULL DEFAULT 'POS_LOCACAO',
  prioridade prioridade_os NOT NULL DEFAULT 'MEDIA',
  sla_horas INTEGER NOT NULL DEFAULT 24,
  status status_os NOT NULL DEFAULT 'EM_ANALISE',
  area_atual area_oficina NOT NULL DEFAULT 'AMARELA',
  
  -- Dados técnicos
  laudo_html TEXT,
  fotos JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  classificacao_defeito class_defeito,
  
  -- Vínculos
  contrato_id UUID REFERENCES contratos(id),
  usuario_resp_id UUID,
  
  -- Checklist e Pedido (JSONB)
  checklist JSONB,
  pedido_pecas JSONB,
  
  -- Timeline
  timeline JSONB NOT NULL DEFAULT '[]',
  
  -- Timestamps
  entrada_area_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (loja_id, numero)
);

-- RLS para ordens_servico
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OS visíveis para usuários da loja"
  ON public.ordens_servico FOR SELECT
  TO authenticated
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mecânico/Gestor podem criar OS"
  ON public.ordens_servico FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'mecanico'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mecânico/Gestor podem atualizar OS"
  ON public.ordens_servico FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'mecanico'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar OS"
  ON public.ordens_servico FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. TABELA: checklist_templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID REFERENCES modelos_equipamentos(id) ON DELETE CASCADE,
  tipo tipo_os NOT NULL,
  itens JSONB NOT NULL DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para checklist_templates
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visíveis para autenticados"
  ON public.checklist_templates FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Gestor pode gerenciar templates"
  ON public.checklist_templates FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. TABELA: produtividade_manutencao
CREATE TABLE public.produtividade_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_iso DATE NOT NULL,
  loja_id UUID NOT NULL,
  mecanico_id UUID,
  auxiliar_id UUID,
  
  -- Métricas
  limpas INTEGER NOT NULL DEFAULT 0,
  liberadas INTEGER NOT NULL DEFAULT 0,
  aguard_diag INTEGER NOT NULL DEFAULT 0,
  aguard_peca INTEGER NOT NULL DEFAULT 0,
  suportes INTEGER NOT NULL DEFAULT 0,
  
  -- Métricas específicas de equipamentos
  andaimes_limpas INTEGER NOT NULL DEFAULT 0,
  andaimes_liberadas INTEGER NOT NULL DEFAULT 0,
  escoras_limpas INTEGER NOT NULL DEFAULT 0,
  escoras_liberadas INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE (data_iso, loja_id, mecanico_id, auxiliar_id)
);

-- RLS para produtividade_manutencao
ALTER TABLE public.produtividade_manutencao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtividade visível para usuários da loja"
  ON public.produtividade_manutencao FOR SELECT
  TO authenticated
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mecânico/Gestor podem registrar produtividade"
  ON public.produtividade_manutencao FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'mecanico'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mecânico/Gestor podem atualizar produtividade"
  ON public.produtividade_manutencao FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'mecanico'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

-- 5. ÍNDICES para performance
CREATE INDEX idx_os_equipamento ON ordens_servico(equipamento_id);
CREATE INDEX idx_os_loja ON ordens_servico(loja_id);
CREATE INDEX idx_os_area ON ordens_servico(area_atual);
CREATE INDEX idx_os_status ON ordens_servico(status);
CREATE INDEX idx_os_contrato ON ordens_servico(contrato_id);
CREATE INDEX idx_checklist_modelo ON checklist_templates(modelo_id);
CREATE INDEX idx_produtividade_data ON produtividade_manutencao(data_iso);
CREATE INDEX idx_produtividade_loja ON produtividade_manutencao(loja_id);

-- 6. TRIGGERS para updated_at
CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtividade_manutencao_updated_at
  BEFORE UPDATE ON produtividade_manutencao
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. FUNCTION para gerar número de OS
CREATE OR REPLACE FUNCTION gerar_numero_os(p_loja_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contador INTEGER;
  v_numero TEXT;
BEGIN
  -- ✅ SECURITY: Validar que usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM user_lojas_permitidas
    WHERE user_id = auth.uid() AND loja_id = p_loja_id
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para gerar OS nesta loja';
  END IF;

  -- Busca o contador atual e incrementa
  INSERT INTO contadores_documentos (loja_id, tipo, chave_contador, contador_atual, ultimo_uso)
  VALUES (p_loja_id, 'OS', 'OS', 1, now())
  ON CONFLICT (loja_id, tipo, chave_contador)
  DO UPDATE SET 
    contador_atual = contadores_documentos.contador_atual + 1,
    ultimo_uso = now(),
    updated_at = now()
  RETURNING contador_atual INTO v_contador;
  
  v_numero := 'OS-' || LPAD(v_contador::TEXT, 6, '0');
  
  RETURN v_numero;
END;
$$;

-- 8. FUNCTION para atualizar área do equipamento quando OS muda de área
CREATE OR REPLACE FUNCTION atualizar_area_equipamento_por_os()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se a área mudou, atualizar o status do equipamento
  IF (TG_OP = 'UPDATE' AND NEW.area_atual IS DISTINCT FROM OLD.area_atual) OR TG_OP = 'INSERT' THEN
    -- Atualiza o status do equipamento baseado na área
    UPDATE equipamentos
    SET 
      status_global = CASE 
        WHEN NEW.area_atual = 'VERDE' THEN 'DISPONIVEL'
        ELSE 'MANUTENCAO'
      END,
      updated_at = now()
    WHERE id = NEW.equipamento_id;
    
    -- Adiciona evento na timeline do equipamento
    UPDATE equipamentos
    SET 
      historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_object(
        'id', gen_random_uuid()::text,
        'ts', now()::text,
        'tipo', 'AREA_OFICINA_ALTERADA',
        'descricao', 'Movido para área ' || NEW.area_atual,
        'usuario', auth.uid()::text,
        'osId', NEW.id::text
      )::jsonb
    WHERE id = NEW.equipamento_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_area_equipamento
  AFTER INSERT OR UPDATE ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_area_equipamento_por_os();

-- 9. COMENTÁRIOS nas tabelas
COMMENT ON TABLE ordens_servico IS 'Ordens de Serviço da Oficina de Manutenção';
COMMENT ON TABLE checklist_templates IS 'Templates de checklist por modelo de equipamento';
COMMENT ON TABLE produtividade_manutencao IS 'Registro diário de produtividade da manutenção';

COMMENT ON COLUMN ordens_servico.timeline IS 'Timeline de eventos da OS em formato JSONB: [{id, ts, user, action, payload}]';
COMMENT ON COLUMN ordens_servico.checklist IS 'Checklist executado em formato JSONB';
COMMENT ON COLUMN ordens_servico.pedido_pecas IS 'Pedido de peças em formato JSONB';
COMMENT ON COLUMN checklist_templates.itens IS 'Itens do checklist em formato JSONB: [{id, titulo, critico}]';