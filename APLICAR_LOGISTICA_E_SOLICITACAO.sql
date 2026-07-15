-- =============================================================================
-- APLICAR_LOGISTICA_E_SOLICITACAO.sql
-- =============================================================================
-- Consolida e torna IDEMPOTENTES as duas migrations abaixo, para aplicação
-- manual no SQL Editor do Supabase em bancos de PRODUÇÃO onde elas ainda não
-- foram aplicadas (causando erros como:
--   "Could not find the table 'public.logistica_config'"
--   "Could not find the function public.rpc_criar_solicitacao(p)").
--
-- Migrations de origem:
--   1) 20251006215620_..._MÓDULO LOGÍSTICA
--   2) 20251014173505_..._MÓDULO SOLICITAÇÃO DE MANUTENÇÃO
--
-- SEGURO PARA RODAR MAIS DE UMA VEZ (idempotente):
--   - CREATE TYPE envolto em DO/EXCEPTION duplicate_object
--   - CREATE TABLE IF NOT EXISTS
--   - CREATE INDEX IF NOT EXISTS
--   - DROP TRIGGER IF EXISTS antes de cada CREATE TRIGGER
--   - DROP POLICY IF EXISTS antes de cada CREATE POLICY
--   - CREATE OR REPLACE FUNCTION para as RPCs
--   - ENABLE ROW LEVEL SECURITY (já idempotente)
--   - Seeds com ON CONFLICT DO NOTHING
--
-- DEPENDÊNCIAS EXTERNAS ASSUMIDAS (devem já existir no banco):
--   Tabelas: public.lojas, public.contratos, public.clientes, public.pessoas,
--            public.user_lojas_permitidas, auth.users
--   Função:  public.has_role(uuid, app_role)  [e o ENUM app_role]
--   Função:  public.update_updated_at_column()  [garantida abaixo via CREATE OR REPLACE]
--   Coluna:  public.lojas.ativo (usada no seed da logística)
-- =============================================================================


-- =============================================================================
-- 0. FUNÇÃO UTILITÁRIA update_updated_at_column()
-- Usada pelos triggers de updated_at do módulo LOGÍSTICA. Nenhuma das migrations
-- originais a define, então garantimos aqui via CREATE OR REPLACE (seguro se já existir).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- ==============  MÓDULO LOGÍSTICA (migration 20251006215620)  ================
-- =============================================================================

-- 1. ENUM status_tarefa_logistica
DO $$ BEGIN
  CREATE TYPE status_tarefa_logistica AS ENUM (
    'AGENDAR',
    'PROGRAMADO',
    'EM_ROTA',
    'CONCLUIDO',
    'REAGENDADO',
    'CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. ENUM tipo_tarefa_logistica
DO $$ BEGIN
  CREATE TYPE tipo_tarefa_logistica AS ENUM (
    'ENTREGA',
    'RETIRADA',
    'SUPORTE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. ENUM prioridade_tarefa
DO $$ BEGIN
  CREATE TYPE prioridade_tarefa AS ENUM (
    'BAIXA',
    'MEDIA',
    'ALTA',
    'CRITICA'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Tabela de configurações de logística por loja
CREATE TABLE IF NOT EXISTS logistica_config (
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
CREATE TABLE IF NOT EXISTS logistica_motoristas (
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
CREATE TABLE IF NOT EXISTS logistica_veiculos (
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
CREATE TABLE IF NOT EXISTS logistica_itinerarios (
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
CREATE TABLE IF NOT EXISTS logistica_tarefas (
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
CREATE TABLE IF NOT EXISTS logistica_metricas_diarias (
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
CREATE INDEX IF NOT EXISTS idx_logistica_tarefas_loja_data ON logistica_tarefas(loja_id, previsto_iso);
CREATE INDEX IF NOT EXISTS idx_logistica_tarefas_status ON logistica_tarefas(status);
CREATE INDEX IF NOT EXISTS idx_logistica_tarefas_motorista ON logistica_tarefas(itinerario_id) WHERE itinerario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logistica_itinerarios_loja_data ON logistica_itinerarios(loja_id, data_iso);
CREATE INDEX IF NOT EXISTS idx_logistica_metricas_loja_data ON logistica_metricas_diarias(loja_id, data_iso);

-- 11. Triggers para updated_at
DROP TRIGGER IF EXISTS update_logistica_config_updated_at ON logistica_config;
CREATE TRIGGER update_logistica_config_updated_at BEFORE UPDATE ON logistica_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_logistica_motoristas_updated_at ON logistica_motoristas;
CREATE TRIGGER update_logistica_motoristas_updated_at BEFORE UPDATE ON logistica_motoristas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_logistica_veiculos_updated_at ON logistica_veiculos;
CREATE TRIGGER update_logistica_veiculos_updated_at BEFORE UPDATE ON logistica_veiculos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_logistica_itinerarios_updated_at ON logistica_itinerarios;
CREATE TRIGGER update_logistica_itinerarios_updated_at BEFORE UPDATE ON logistica_itinerarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_logistica_tarefas_updated_at ON logistica_tarefas;
CREATE TRIGGER update_logistica_tarefas_updated_at BEFORE UPDATE ON logistica_tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_logistica_metricas_updated_at ON logistica_metricas_diarias;
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
DROP POLICY IF EXISTS "Config visível para usuários da loja" ON logistica_config;
CREATE POLICY "Config visível para usuários da loja"
  ON logistica_config FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Gestor/Admin podem atualizar config" ON logistica_config;
CREATE POLICY "Gestor/Admin podem atualizar config"
  ON logistica_config FOR UPDATE
  USING (
    (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Gestor/Admin podem inserir config" ON logistica_config;
CREATE POLICY "Gestor/Admin podem inserir config"
  ON logistica_config FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 14. RLS Policies - logistica_motoristas
DROP POLICY IF EXISTS "Motoristas visíveis para usuários da loja" ON logistica_motoristas;
CREATE POLICY "Motoristas visíveis para usuários da loja"
  ON logistica_motoristas FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vendedor/Gestor podem gerenciar motoristas" ON logistica_motoristas;
CREATE POLICY "Vendedor/Gestor podem gerenciar motoristas"
  ON logistica_motoristas FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 15. RLS Policies - logistica_veiculos
DROP POLICY IF EXISTS "Veículos visíveis para usuários da loja" ON logistica_veiculos;
CREATE POLICY "Veículos visíveis para usuários da loja"
  ON logistica_veiculos FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vendedor/Gestor podem gerenciar veículos" ON logistica_veiculos;
CREATE POLICY "Vendedor/Gestor podem gerenciar veículos"
  ON logistica_veiculos FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 16. RLS Policies - logistica_itinerarios
DROP POLICY IF EXISTS "Itinerários visíveis para usuários da loja" ON logistica_itinerarios;
CREATE POLICY "Itinerários visíveis para usuários da loja"
  ON logistica_itinerarios FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vendedor/Operação podem gerenciar itinerários" ON logistica_itinerarios;
CREATE POLICY "Vendedor/Operação podem gerenciar itinerários"
  ON logistica_itinerarios FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'operacao') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 17. RLS Policies - logistica_tarefas
DROP POLICY IF EXISTS "Tarefas visíveis para usuários da loja" ON logistica_tarefas;
CREATE POLICY "Tarefas visíveis para usuários da loja"
  ON logistica_tarefas FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vendedor/Operação podem gerenciar tarefas" ON logistica_tarefas;
CREATE POLICY "Vendedor/Operação podem gerenciar tarefas"
  ON logistica_tarefas FOR ALL
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'operacao') OR has_role(auth.uid(), 'motorista') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 18. RLS Policies - logistica_metricas_diarias
DROP POLICY IF EXISTS "Métricas visíveis para usuários da loja" ON logistica_metricas_diarias;
CREATE POLICY "Métricas visíveis para usuários da loja"
  ON logistica_metricas_diarias FOR SELECT
  USING (loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Sistema pode gerenciar métricas" ON logistica_metricas_diarias;
CREATE POLICY "Sistema pode gerenciar métricas"
  ON logistica_metricas_diarias FOR ALL
  USING (
    loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- 19. Seed inicial - Criar config padrão para todas as lojas existentes
INSERT INTO logistica_config (loja_id)
SELECT id FROM lojas WHERE ativo = true
ON CONFLICT (loja_id) DO NOTHING;


-- =============================================================================
-- ========  MÓDULO SOLICITAÇÃO DE MANUTENÇÃO (migration 20251014173505)  ======
-- =============================================================================

-- ETAPA 1: Tabelas

-- 1) Cabeçalho da Solicitação
CREATE TABLE IF NOT EXISTS public.solicitacao_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  cliente_nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('SUPORTE_CAMPO','TROCA_COM_SUBSTITUICAO')),
  prioridade TEXT NOT NULL CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','CRITICA')),
  sintomas TEXT NOT NULL,
  janela_data DATE,
  janela_periodo TEXT CHECK (janela_periodo IN ('MANHA','TARDE','COMERCIAL')),
  assistente_sugestao JSONB,
  os_id UUID,
  substituto JSONB,
  laudo JSONB,
  sla_horas INTEGER,
  status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','AGUARDANDO_RETIRADA','EM_ROTA','RECEBIDA_OFICINA','EM_DIAGNOSTICO','AGUARDANDO_PECA','CONCLUIDA','CANCELADA')),
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2) Itens da Solicitação
CREATE TABLE IF NOT EXISTS public.solicitacao_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacao_manutencao(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('SERIALIZADO','SALDO')),
  equip_id UUID,
  modelo_id UUID NOT NULL,
  grupo_id UUID NOT NULL,
  qtd NUMERIC(12,3) NOT NULL DEFAULT 1,
  codigo_interno TEXT
);

-- 3) Timeline (auditoria imutável)
CREATE TABLE IF NOT EXISTS public.solicitacao_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacao_manutencao(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL,
  acao TEXT NOT NULL,
  payload JSONB
);

-- 4) Anexos (metadados)
CREATE TABLE IF NOT EXISTS public.solicitacao_anexo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacao_manutencao(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('FOTO','DOC')),
  path TEXT NOT NULL,
  size_bytes INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Event-bus para integrações internas
CREATE TABLE IF NOT EXISTS public.manut_event_bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  solicitacao_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('CRIADA','TROCA_CRIADA','LAUDO_REGISTRADO','ATUALIZAR_AGENDA','NOTIFICAR_OFICINA')),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ETAPA 2: Enable RLS
ALTER TABLE public.solicitacao_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_anexo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manut_event_bus ENABLE ROW LEVEL SECURITY;

-- ETAPA 3: RLS Policies

-- Solicitação Manutenção
DROP POLICY IF EXISTS "Solicitações visíveis para usuários da loja" ON public.solicitacao_manutencao;
CREATE POLICY "Solicitações visíveis para usuários da loja"
ON public.solicitacao_manutencao FOR SELECT
USING (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Vendedor pode criar solicitações" ON public.solicitacao_manutencao;
CREATE POLICY "Vendedor pode criar solicitações"
ON public.solicitacao_manutencao FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'vendedor'::app_role) OR
   has_role(auth.uid(), 'gestor'::app_role) OR
   has_role(auth.uid(), 'admin'::app_role)) AND
  loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Usuário pode atualizar solicitações da loja" ON public.solicitacao_manutencao;
CREATE POLICY "Usuário pode atualizar solicitações da loja"
ON public.solicitacao_manutencao FOR UPDATE
USING (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
))
WITH CHECK (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admin/Gestor podem deletar solicitações" ON public.solicitacao_manutencao;
CREATE POLICY "Admin/Gestor podem deletar solicitações"
ON public.solicitacao_manutencao FOR DELETE
USING (
  (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND
  loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);

-- Itens (herdam restrição por join)
DROP POLICY IF EXISTS "Itens visíveis via solicitação" ON public.solicitacao_item;
CREATE POLICY "Itens visíveis via solicitação"
ON public.solicitacao_item FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s
  WHERE s.id = solicitacao_id
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s
  WHERE s.id = solicitacao_id
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
));

-- Timeline (herdam restrição por join)
DROP POLICY IF EXISTS "Timeline visível via solicitação" ON public.solicitacao_timeline;
CREATE POLICY "Timeline visível via solicitação"
ON public.solicitacao_timeline FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s
  WHERE s.id = solicitacao_id
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s
  WHERE s.id = solicitacao_id
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
));

-- Anexos (herdam restrição por join)
DROP POLICY IF EXISTS "Anexos visíveis via solicitação" ON public.solicitacao_anexo;
CREATE POLICY "Anexos visíveis via solicitação"
ON public.solicitacao_anexo FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s
  WHERE s.id = solicitacao_id
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s
  WHERE s.id = solicitacao_id
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
));

-- Event Bus
DROP POLICY IF EXISTS "Event bus visível por loja" ON public.manut_event_bus;
CREATE POLICY "Event bus visível por loja"
ON public.manut_event_bus FOR ALL
USING (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
))
WITH CHECK (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
));

-- ETAPA 4: RPCs para regras de negócio

-- RPC 1: Criar Solicitação
CREATE OR REPLACE FUNCTION public.rpc_criar_solicitacao(p JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_sla INTEGER;
BEGIN
  -- Calcular SLA baseado na prioridade
  v_sla := COALESCE(
    (p->>'sla_horas')::INTEGER,
    CASE p->>'prioridade'
      WHEN 'CRITICA' THEN 8
      WHEN 'ALTA' THEN 24
      WHEN 'MEDIA' THEN 48
      ELSE 72
    END
  );

  -- Inserir cabeçalho
  INSERT INTO public.solicitacao_manutencao (
    id, loja_id, contrato_id, cliente_id, cliente_nome, tipo, prioridade,
    sintomas, janela_data, janela_periodo, assistente_sugestao, sla_horas,
    status, created_by
  ) VALUES (
    v_id,
    (p->>'loja_id')::UUID,
    (p->>'contrato_id')::UUID,
    (p->>'cliente_id')::UUID,
    p->>'cliente_nome',
    p->>'tipo',
    p->>'prioridade',
    p->>'sintomas',
    (p->>'janela_data')::DATE,
    p->>'janela_periodo',
    p->'assistente_sugestao',
    v_sla,
    'ABERTA',
    auth.uid()
  );

  -- Inserir itens
  INSERT INTO public.solicitacao_item (solicitacao_id, tipo, equip_id, modelo_id, grupo_id, qtd, codigo_interno)
  SELECT
    v_id,
    i->>'tipo',
    (i->>'equip_id')::UUID,
    (i->>'modelo_id')::UUID,
    (i->>'grupo_id')::UUID,
    COALESCE((i->>'qtd')::NUMERIC, 1),
    i->>'codigo_interno'
  FROM jsonb_array_elements(p->'itens') i;

  -- Inserir timeline inicial
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'CRIADA', p);

  -- Publicar evento
  INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
  VALUES (
    (p->>'loja_id')::UUID,
    v_id,
    'CRIADA',
    jsonb_build_object('contrato_id', p->>'contrato_id')
  );

  RETURN v_id;
END;
$$;

-- RPC 2: Mudar Status
CREATE OR REPLACE FUNCTION public.rpc_mudar_status(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
  v_novo TEXT := p->>'status';
  v_ant TEXT;
  v_loja_id UUID;
BEGIN
  -- Buscar status anterior e loja_id
  SELECT status, loja_id INTO v_ant, v_loja_id
  FROM public.solicitacao_manutencao
  WHERE id = v_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Validações de transição
  IF v_ant = 'ABERTA' AND v_novo NOT IN ('AGUARDANDO_RETIRADA','EM_ROTA','CANCELADA') THEN
    RAISE EXCEPTION 'Transição inválida de % para %', v_ant, v_novo;
  END IF;

  IF v_ant = 'CANCELADA' OR v_ant = 'CONCLUIDA' THEN
    RAISE EXCEPTION 'Não é possível alterar status de solicitação %', v_ant;
  END IF;

  -- Atualizar status
  UPDATE public.solicitacao_manutencao
  SET status = v_novo, updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'STATUS_MUDOU', jsonb_build_object('de', v_ant, 'para', v_novo));

  -- Acionar eventos auxiliares
  IF v_novo = 'AGUARDANDO_RETIRADA' THEN
    INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
    VALUES (v_loja_id, v_id, 'ATUALIZAR_AGENDA', jsonb_build_object('acao', 'bloquear'));
  END IF;
END;
$$;

-- RPC 3: Registrar Laudo
CREATE OR REPLACE FUNCTION public.rpc_registrar_laudo(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
  v_loja_id UUID;
BEGIN
  -- Atualizar laudo
  UPDATE public.solicitacao_manutencao
  SET laudo = p->'laudo', updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id
  RETURNING loja_id INTO v_loja_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'LAUDO_REGISTRADO', p->'laudo');

  -- Se mau uso, publicar evento para Comercial
  IF (p->'laudo'->>'tipo') = 'MAU_USO' THEN
    INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
    VALUES (v_loja_id, v_id, 'LAUDO_REGISTRADO', p->'laudo');
  END IF;
END;
$$;

-- RPC 4: Criar OS de Solicitação
CREATE OR REPLACE FUNCTION public.rpc_criar_os_de_solicitacao(p JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
  v_os UUID := gen_random_uuid();
  v_loja_id UUID;
BEGIN
  -- Atualizar com os_id
  UPDATE public.solicitacao_manutencao
  SET os_id = v_os, updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id
  RETURNING loja_id INTO v_loja_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'OS_CRIADA', jsonb_build_object('os_id', v_os));

  -- Publicar evento para Oficina
  INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
  VALUES (v_loja_id, v_id, 'NOTIFICAR_OFICINA', jsonb_build_object('os_id', v_os));

  RETURN v_os;
END;
$$;

-- RPC 5: Aplicar Substituição
CREATE OR REPLACE FUNCTION public.rpc_aplicar_substituicao(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
BEGIN
  -- Atualizar substituto
  UPDATE public.solicitacao_manutencao
  SET substituto = p->'substituto', updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'SUBSTITUICAO_APLICADA', p);
END;
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacao_loja_status ON public.solicitacao_manutencao(loja_id, status);
CREATE INDEX IF NOT EXISTS idx_solicitacao_contrato ON public.solicitacao_manutencao(contrato_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_cliente ON public.solicitacao_manutencao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_created ON public.solicitacao_manutencao(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_bus_loja ON public.manut_event_bus(loja_id, created_at DESC);

-- =============================================================================
-- FIM. Pode ser executado novamente sem efeitos colaterais.
-- =============================================================================
