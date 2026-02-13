-- ============================================================================
-- FASE 1: Dados Técnicos Básicos
-- ============================================================================
ALTER TABLE equipamentos 
ADD COLUMN IF NOT EXISTS potencia TEXT,
ADD COLUMN IF NOT EXISTS tensao TEXT,
ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS dimensoes_cm TEXT,
ADD COLUMN IF NOT EXISTS capacidade TEXT,
ADD COLUMN IF NOT EXISTS combustivel TEXT;

COMMENT ON COLUMN equipamentos.potencia IS 'Potência do equipamento (ex: 1500W, 3HP)';
COMMENT ON COLUMN equipamentos.tensao IS 'Tensão elétrica (ex: 110V, 220V, 380V)';
COMMENT ON COLUMN equipamentos.peso_kg IS 'Peso em quilogramas';
COMMENT ON COLUMN equipamentos.dimensoes_cm IS 'Dimensões em centímetros (LxAxP)';
COMMENT ON COLUMN equipamentos.capacidade IS 'Capacidade/Alcance (ex: 12m, 500kg)';
COMMENT ON COLUMN equipamentos.combustivel IS 'Tipo de combustível (Elétrico, Gasolina, Diesel, GNV)';

-- ============================================================================
-- FASE 2: Configuração Avançada de Locação
-- ============================================================================
ALTER TABLE modelos_equipamentos
ADD COLUMN IF NOT EXISTS caucao_padrao NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS waiver_protecao_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxa_limpeza_padrao NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tempo_padding_horas INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS tolerancia_atraso_horas INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS multa_diaria_atraso NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS politica_cancelamento TEXT;

COMMENT ON COLUMN modelos_equipamentos.caucao_padrao IS 'Valor de caução padrão para locação';
COMMENT ON COLUMN modelos_equipamentos.waiver_protecao_percent IS 'Percentual do waiver de proteção';
COMMENT ON COLUMN modelos_equipamentos.taxa_limpeza_padrao IS 'Taxa de limpeza cobrada na devolução';
COMMENT ON COLUMN modelos_equipamentos.tempo_padding_horas IS 'Tempo de preparação antes da locação';
COMMENT ON COLUMN modelos_equipamentos.tolerancia_atraso_horas IS 'Tolerância para devolução sem multa';
COMMENT ON COLUMN modelos_equipamentos.multa_diaria_atraso IS 'Valor da multa por dia de atraso';
COMMENT ON COLUMN modelos_equipamentos.politica_cancelamento IS 'Política de cancelamento (texto livre)';

-- ============================================================================
-- FASE 3: Dados Patrimoniais e Depreciação
-- ============================================================================
ALTER TABLE equipamentos
ADD COLUMN IF NOT EXISTS ano_fabricacao INTEGER,
ADD COLUMN IF NOT EXISTS data_aquisicao DATE,
ADD COLUMN IF NOT EXISTS valor_aquisicao NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS vida_util_meses INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'BOM';

COMMENT ON COLUMN equipamentos.ano_fabricacao IS 'Ano de fabricação do equipamento';
COMMENT ON COLUMN equipamentos.data_aquisicao IS 'Data de aquisição do equipamento';
COMMENT ON COLUMN equipamentos.valor_aquisicao IS 'Valor pago na aquisição';
COMMENT ON COLUMN equipamentos.vida_util_meses IS 'Vida útil estimada em meses';
COMMENT ON COLUMN equipamentos.condicao IS 'Condição: NOVO, BOM, REGULAR, RUIM';

-- View para cálculo de depreciação
CREATE OR REPLACE VIEW equipamentos_depreciacao AS
SELECT 
  e.id,
  e.codigo_interno,
  e.valor_aquisicao,
  e.vida_util_meses,
  e.data_aquisicao,
  CASE 
    WHEN e.valor_aquisicao IS NULL OR e.vida_util_meses IS NULL THEN NULL
    ELSE e.valor_aquisicao / e.vida_util_meses
  END as depreciacao_mensal,
  CASE
    WHEN e.data_aquisicao IS NULL OR e.valor_aquisicao IS NULL OR e.vida_util_meses IS NULL THEN NULL
    ELSE EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.data_aquisicao))
  END as meses_uso,
  CASE
    WHEN e.data_aquisicao IS NULL OR e.valor_aquisicao IS NULL OR e.vida_util_meses IS NULL THEN NULL
    ELSE GREATEST(0, e.valor_aquisicao - (e.valor_aquisicao / e.vida_util_meses * EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.data_aquisicao))))
  END as valor_residual
FROM equipamentos e
WHERE e.ativo = true;

-- ============================================================================
-- FASE 4: Dados Fiscais e Contábeis
-- ============================================================================
ALTER TABLE equipamentos
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS cfop TEXT,
ADD COLUMN IF NOT EXISTS aliquota_iss NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS aliquota_icms NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cst_icms TEXT;

COMMENT ON COLUMN equipamentos.ncm IS 'Nomenclatura Comum do Mercosul';
COMMENT ON COLUMN equipamentos.cfop IS 'Código Fiscal de Operações e Prestações';
COMMENT ON COLUMN equipamentos.aliquota_iss IS 'Alíquota de ISS (%)';
COMMENT ON COLUMN equipamentos.aliquota_icms IS 'Alíquota de ICMS (%)';
COMMENT ON COLUMN equipamentos.cst_icms IS 'Código de Situação Tributária do ICMS';

-- Tabela auxiliar de NCMs comuns
CREATE TABLE IF NOT EXISTS ncm_comuns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  aliquota_iss_padrao NUMERIC(5,2) DEFAULT 5.00,
  aliquota_icms_padrao NUMERIC(5,2) DEFAULT 18.00,
  categoria TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir alguns NCMs comuns para locação de equipamentos
INSERT INTO ncm_comuns (codigo, descricao, categoria, aliquota_iss_padrao, aliquota_icms_padrao) VALUES
('8428.90.90', 'Outras máquinas e aparelhos de elevação, carga/descarga', 'ELEVACAO', 5.00, 18.00),
('8479.10.90', 'Máquinas e aparelhos de construção civil', 'CONSTRUCAO', 5.00, 18.00),
('8474.20.00', 'Máquinas para esmagar, moer ou pulverizar', 'BRITAGEM', 5.00, 18.00),
('8426.41.00', 'Guindastes sobre pneumáticos', 'GUINDASTES', 5.00, 18.00),
('8429.52.19', 'Escavadeiras', 'ESCAVACAO', 5.00, 18.00)
ON CONFLICT (codigo) DO NOTHING;

-- RLS para ncm_comuns
ALTER TABLE ncm_comuns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "NCMs visíveis para autenticados" ON ncm_comuns
  FOR SELECT USING (ativo = true);

CREATE POLICY "Gestor pode gerenciar NCMs" ON ncm_comuns
  FOR ALL USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================================
-- FASE 5: Controle de Uso (Horímetro)
-- ============================================================================
ALTER TABLE equipamentos
ADD COLUMN IF NOT EXISTS horimetro_atual NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_leitura_horimetro TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS horas_media_por_dia NUMERIC(5,2);

COMMENT ON COLUMN equipamentos.horimetro_atual IS 'Leitura atual do horímetro em horas';
COMMENT ON COLUMN equipamentos.ultima_leitura_horimetro IS 'Data/hora da última leitura do horímetro';
COMMENT ON COLUMN equipamentos.horas_media_por_dia IS 'Média de horas de uso por dia';

-- Tabela de histórico de leituras de horímetro
CREATE TABLE IF NOT EXISTS horimetro_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  leitura_anterior NUMERIC(10,2),
  leitura_atual NUMERIC(10,2) NOT NULL,
  horas_trabalhadas NUMERIC(10,2),
  data_leitura TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo_evento TEXT NOT NULL, -- 'CHECKOUT', 'CHECKIN', 'MANUTENCAO', 'MANUAL'
  contrato_id UUID REFERENCES contratos(id),
  observacoes TEXT,
  lido_por UUID REFERENCES auth.users(id),
  lido_por_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_horimetro_equipamento ON horimetro_leituras(equipamento_id);
CREATE INDEX idx_horimetro_data ON horimetro_leituras(data_leitura DESC);

COMMENT ON TABLE horimetro_leituras IS 'Histórico de leituras do horímetro de equipamentos';

-- RLS para horimetro_leituras
ALTER TABLE horimetro_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leituras visíveis para usuários da loja" ON horimetro_leituras
  FOR SELECT USING (
    equipamento_id IN (
      SELECT e.id FROM equipamentos e
      WHERE e.loja_atual_id IN (
        SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Vendedor/Operação podem registrar leituras" ON horimetro_leituras
  FOR INSERT WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'operacao'::app_role) OR
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role)) AND
    equipamento_id IN (
      SELECT e.id FROM equipamentos e
      WHERE e.loja_atual_id IN (
        SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger para atualizar equipamento após leitura
CREATE OR REPLACE FUNCTION atualizar_horimetro_equipamento()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE equipamentos
  SET 
    horimetro_atual = NEW.leitura_atual,
    ultima_leitura_horimetro = NEW.data_leitura,
    updated_at = now()
  WHERE id = NEW.equipamento_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_atualizar_horimetro
  AFTER INSERT ON horimetro_leituras
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_horimetro_equipamento();

-- ============================================================================
-- FASE 6: KPIs Financeiros e Desempenho
-- ============================================================================
ALTER TABLE equipamentos
ADD COLUMN IF NOT EXISTS receita_acumulada NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS custo_total_manutencao NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS margem_acumulada NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vezes_locado INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_ocioso_ultimo_mes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxa_ocupacao_ultimo_mes NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN equipamentos.receita_acumulada IS 'Receita total acumulada de locações';
COMMENT ON COLUMN equipamentos.custo_total_manutencao IS 'Custo total de manutenções realizadas';
COMMENT ON COLUMN equipamentos.margem_acumulada IS 'Margem = receita - custos';
COMMENT ON COLUMN equipamentos.vezes_locado IS 'Quantidade de vezes que foi locado';
COMMENT ON COLUMN equipamentos.dias_ocioso_ultimo_mes IS 'Dias parado no último mês';
COMMENT ON COLUMN equipamentos.taxa_ocupacao_ultimo_mes IS 'Taxa de ocupação do último mês (%)';

-- Função para recalcular KPIs de um equipamento
CREATE OR REPLACE FUNCTION recalcular_kpis_equipamento(p_equipamento_id UUID)
RETURNS VOID AS $$
DECLARE
  v_receita NUMERIC(12,2);
  v_vezes INTEGER;
  v_dias_locado INTEGER;
BEGIN
  -- Calcular receita acumulada e vezes locado
  SELECT 
    COALESCE(SUM(ci.preco_total), 0),
    COUNT(DISTINCT ci.contrato_id)
  INTO v_receita, v_vezes
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = p_equipamento_id
    AND c.status IN ('ATIVO', 'CONCLUIDO');

  -- Calcular dias locado no último mês
  SELECT COALESCE(SUM(
    EXTRACT(DAY FROM 
      LEAST(ci.data_devolucao, CURRENT_DATE) - 
      GREATEST(ci.data_locacao, CURRENT_DATE - INTERVAL '30 days')
    )
  ), 0)
  INTO v_dias_locado
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = p_equipamento_id
    AND c.status IN ('ATIVO', 'CONCLUIDO')
    AND ci.data_locacao >= CURRENT_DATE - INTERVAL '30 days';

  -- Atualizar equipamento
  UPDATE equipamentos
  SET 
    receita_acumulada = v_receita,
    vezes_locado = v_vezes,
    dias_ocioso_ultimo_mes = GREATEST(0, 30 - v_dias_locado),
    taxa_ocupacao_ultimo_mes = ROUND((v_dias_locado::NUMERIC / 30) * 100, 2),
    margem_acumulada = v_receita - COALESCE(custo_total_manutencao, 0),
    updated_at = now()
  WHERE id = p_equipamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar KPIs quando item de contrato é inserido/atualizado
CREATE OR REPLACE FUNCTION trigger_atualizar_kpis_equipamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.equipamento_id IS NOT NULL THEN
    PERFORM recalcular_kpis_equipamento(NEW.equipamento_id);
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.equipamento_id IS NOT NULL AND OLD.equipamento_id != NEW.equipamento_id THEN
    PERFORM recalcular_kpis_equipamento(OLD.equipamento_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_kpis_contrato_item
  AFTER INSERT OR UPDATE ON contrato_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atualizar_kpis_equipamento();

-- ============================================================================
-- FEATURE FLAGS (para ativar/desativar funcionalidades)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO feature_flags (chave, nome, descricao, ativo) VALUES
('FASE_1_DADOS_TECNICOS', 'Dados Técnicos Básicos', 'Potência, tensão, peso, dimensões, etc.', true),
('FASE_2_CONFIG_LOCACAO', 'Configuração Avançada de Locação', 'Caução, waiver, multas, etc.', true),
('FASE_3_PATRIMONIAL', 'Dados Patrimoniais', 'Depreciação, valor de aquisição, etc.', true),
('FASE_4_FISCAL', 'Dados Fiscais', 'NCM, CFOP, alíquotas, etc.', true),
('FASE_5_HORIMETRO', 'Controle de Horímetro', 'Leituras e histórico de uso', true),
('FASE_6_KPIS', 'KPIs Financeiros', 'Receita, margem, ocupação, etc.', true)
ON CONFLICT (chave) DO UPDATE SET ativo = EXCLUDED.ativo;

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature flags visíveis para autenticados" ON feature_flags
  FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar feature flags" ON feature_flags
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at em ncm_comuns e feature_flags
CREATE TRIGGER update_ncm_comuns_updated_at BEFORE UPDATE ON ncm_comuns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();