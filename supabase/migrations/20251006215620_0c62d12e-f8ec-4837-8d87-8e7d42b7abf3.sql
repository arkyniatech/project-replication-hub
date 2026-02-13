-- ====================================
-- MÓDULO LOGÍSTICA - INTEGRAÇÃO SUPABASE
-- ====================================

-- 1. Criar ENUM para status de tarefas
CREATE TYPE status_tarefa_logistica AS ENUM (
  'AGENDAR',
  'PROGRAMADO',
  'EM_ROTA',
  'CONCLUIDO',
  'REAGENDADO',
  'CANCELADO'
);

-- 2. Criar ENUM para tipo de tarefa
CREATE TYPE tipo_tarefa_logistica AS ENUM (
  'ENTREGA',
  'RETIRADA',
  'SUPORTE'
);

-- 3. Criar ENUM para prioridade
CREATE TYPE prioridade_tarefa AS ENUM (
  'BAIXA',
  'MEDIA',
  'ALTA',
  'CRITICA'
);

-- 4. Tabela de configurações de logística por loja
CREATE TABLE logistica_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  
  -- Base da loja
  base_latitude NUMERIC(10, 8),
  base_longitude NUMERIC(11, 8),
  base_endereco TEXT,
  
  -- Jornada de trabalho
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  intervalo_almoco_inicio TIME DEFAULT '12:00',
  intervalo_almoco_fim TIME DEFAULT '13:00',
  
  -- Janelas de entrega
  janelas JSONB DEFAULT '[
    {"nome": "Manhã", "inicio": "08:00", "fim": "12:00"},
    {"nome": "Tarde", "inicio": "13:00", "fim": "18:00"}
  ]'::jsonb,
  
  -- Motivos de falha (nao_saida e nao_entrega)
  motivos_nao_saida JSONB DEFAULT '["Motorista atrasou tarefas anteriores", "Cliente solicitou reagendamento", "Equipamento não liberado pela manutenção", "Problemas com veículo"]'::jsonb,
  motivos_nao_entrega JSONB DEFAULT '["Cliente ausente", "Local não encontrado", "Local de descarga inadequado", "Cliente rejeitou entrega"]'::jsonb,
  
  -- Templates de mensagem WhatsApp
  template_entrega TEXT DEFAULT 'Olá {{cliente}}, sua entrega do contrato {{contrato}} está programada para {{data}} no período {{janela}}. Qualquer dúvida, entre em contato.',
  template_retirada TEXT DEFAULT 'Olá {{cliente}}, a retirada dos equipamentos do contrato {{contrato}} está agendada para {{data}} no período {{janela}}.',
  template_aviso TEXT DEFAULT 'Olá {{cliente}}, este é um lembrete sobre a tarefa do contrato {{contrato}} programada para {{data}}.',
  
  -- Confirmações obrigatórias
  confirmacoes_obrigatorias JSONB DEFAULT '["Acesso liberado no local", "Energia adequada", "Local de descarga pronto"]'::jsonb,
  
  -- Configurações gerais
  prazo_minimo_horas INTEGER DEFAULT 4,
  tolerancia_inicio_min INTEGER DEFAULT 30,
  tolerancia_fim_min INTEGER DEFAULT 30,
  responsavel_obrigatorio BOOLEAN DEFAULT true,
  comprovante_digital BOOLEAN DEFAULT true,
  frete_por_zona JSONB DEFAULT '{"habilitado": false, "tabela": []}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(loja_id)
);

-- 5. Tabela de motoristas
CREATE TABLE logistica_motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  
  nome TEXT NOT NULL,
  telefone TEXT,
  cnh TEXT,
  categoria_cnh TEXT,
  vencimento_cnh DATE,
  
  ativo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 6. Tabela de veículos
CREATE TABLE logistica_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  
  placa TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER,
  capacidade_kg NUMERIC(10, 2),
  capacidade_m3 NUMERIC(10, 2),
  
  ativo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(loja_id, placa)
);

-- 7. Tabela de itinerários
CREATE TABLE logistica_itinerarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  
  data_iso DATE NOT NULL,
  motorista_id UUID REFERENCES logistica_motoristas(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES logistica_veiculos(id) ON DELETE SET NULL,
  
  km_inicial NUMERIC(10, 2),
  km_final NUMERIC(10, 2),
  km_total NUMERIC(10, 2),
  
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(loja_id, data_iso, motorista_id)
);

-- 8. Tabela de tarefas de logística
CREATE TABLE logistica_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  itinerario_id UUID REFERENCES logistica_itinerarios(id) ON DELETE SET NULL,
  
  -- Relações
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  
  -- Dados da tarefa
  tipo tipo_tarefa_logistica NOT NULL DEFAULT 'ENTREGA',
  status status_tarefa_logistica NOT NULL DEFAULT 'AGENDAR',
  prioridade prioridade_tarefa NOT NULL DEFAULT 'MEDIA',
  
  -- Agendamento
  previsto_iso TIMESTAMPTZ NOT NULL,
  duracao_min INTEGER DEFAULT 60,
  janela TEXT, -- MANHA, TARDE
  
  -- Endereço
  endereco JSONB NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  
  -- Cliente
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  
  -- Execução
  check_in_ts TIMESTAMPTZ,
  check_in_latitude NUMERIC(10, 8),
  check_in_longitude NUMERIC(11, 8),
  concluido_ts TIMESTAMPTZ,
  
  -- Motivo de falha
  motivo_falha TEXT,
  motivo_falha_tipo TEXT, -- 'NAO_SAIDA' ou 'NAO_ENTREGA'
  
  -- Observações
  observacoes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 9. Tabela de métricas diárias
CREATE TABLE logistica_metricas_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  data_iso DATE NOT NULL,
  
  -- Contadores por motorista (opcional)
  motorista_id UUID REFERENCES logistica_motoristas(id) ON DELETE CASCADE,
  
  -- Métricas
  planejadas INTEGER DEFAULT 0,
  concluidas INTEGER DEFAULT 0,
  on_window INTEGER DEFAULT 0,
  reagendadas INTEGER DEFAULT 0,
  
  km_total NUMERIC(10, 2) DEFAULT 0,
  
  -- Top motivos (array de objetos)
  motivos_falha JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(loja_id, data_iso, motorista_id)
);

-- 10. Índices para performance
CREATE INDEX idx_logistica_tarefas_loja_data ON logistica_tarefas(loja_id, previsto_iso);
CREATE INDEX idx_logistica_tarefas_status ON logistica_tarefas(status);
CREATE INDEX idx_logistica_tarefas_motorista ON logistica_tarefas(itinerario_id) WHERE itinerario_id IS NOT NULL;
CREATE INDEX idx_logistica_itinerarios_loja_data ON logistica_itinerarios(loja_id, data_iso);
CREATE INDEX idx_logistica_metricas_loja_data ON logistica_metricas_diarias(loja_id, data_iso);

-- 11. Trigger para updated_at
CREATE TRIGGER update_logistica_config_updated_at BEFORE UPDATE ON logistica_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logistica_motoristas_updated_at BEFORE UPDATE ON logistica_motoristas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logistica_veiculos_updated_at BEFORE UPDATE ON logistica_veiculos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logistica_itinerarios_updated_at BEFORE UPDATE ON logistica_itinerarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logistica_tarefas_updated_at BEFORE UPDATE ON logistica_tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_logistica_metricas_updated_at BEFORE UPDATE ON logistica_metricas_diarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. RLS - Habilitar Row Level Security
ALTER TABLE logistica_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_itinerarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistica_metricas_diarias ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies - logistica_config
CREATE POLICY "Config visível para usuários da loja"
  ON logistica_config FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Gestor/Admin podem atualizar config"
  ON logistica_config FOR UPDATE
  USING (
    (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

CREATE POLICY "Gestor/Admin podem inserir config"
  ON logistica_config FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 14. RLS Policies - logistica_motoristas
CREATE POLICY "Motoristas visíveis para usuários da loja"
  ON logistica_motoristas FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Vendedor/Gestor podem gerenciar motoristas"
  ON logistica_motoristas FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 15. RLS Policies - logistica_veiculos
CREATE POLICY "Veículos visíveis para usuários da loja"
  ON logistica_veiculos FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Vendedor/Gestor podem gerenciar veículos"
  ON logistica_veiculos FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 16. RLS Policies - logistica_itinerarios
CREATE POLICY "Itinerários visíveis para usuários da loja"
  ON logistica_itinerarios FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Vendedor/Operação podem gerenciar itinerários"
  ON logistica_itinerarios FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'operacao') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 17. RLS Policies - logistica_tarefas
CREATE POLICY "Tarefas visíveis para usuários da loja"
  ON logistica_tarefas FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Vendedor/Operação podem gerenciar tarefas"
  ON logistica_tarefas FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'operacao') OR has_role(auth.uid(), 'motorista') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 18. RLS Policies - logistica_metricas_diarias
CREATE POLICY "Métricas visíveis para usuários da loja"
  ON logistica_metricas_diarias FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Sistema pode gerenciar métricas"
  ON logistica_metricas_diarias FOR ALL
  USING (
    loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 19. Seed inicial - Criar config padrão para todas as lojas existentes
INSERT INTO logistica_config (loja_id)
SELECT id FROM lojas WHERE ativo = true
ON CONFLICT (loja_id) DO NOTHING;