-- =====================================================
-- FASE 2: EQUIPAMENTOS - GRUPOS E MODELOS
-- =====================================================

-- 1. GRUPOS DE EQUIPAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grupos_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- Auditoria
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(nome)
);

-- Índices
CREATE INDEX idx_grupos_nome ON public.grupos_equipamentos(nome);
CREATE INDEX idx_grupos_ativo ON public.grupos_equipamentos(ativo);

-- RLS
ALTER TABLE public.grupos_equipamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (todos podem ver grupos ativos)
CREATE POLICY "Grupos visíveis para autenticados"
  ON public.grupos_equipamentos FOR SELECT
  USING (ativo = true);

-- Políticas de INSERT (gestor e admin)
CREATE POLICY "Gestor pode criar grupos"
  ON public.grupos_equipamentos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas de UPDATE (gestor e admin)
CREATE POLICY "Gestor pode atualizar grupos"
  ON public.grupos_equipamentos FOR UPDATE
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas de DELETE (apenas admin)
CREATE POLICY "Admin pode deletar grupos"
  ON public.grupos_equipamentos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. MODELOS DE EQUIPAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.modelos_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos_equipamentos(id) ON DELETE CASCADE,
  
  -- Dados
  nome_comercial TEXT NOT NULL,
  prefixo_codigo TEXT NOT NULL,
  proximo_sequencial INTEGER NOT NULL DEFAULT 1,
  
  -- Descrição técnica
  descricao TEXT,
  especificacoes JSONB DEFAULT '{}'::jsonb,
  
  -- Tabela de preços por loja (JSONB)
  -- Estrutura: { "loja_id": { "DIARIA": valor, "7": valor, "14": valor, "21": valor, "28": valor } }
  tabela_por_loja JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Auditoria
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(grupo_id, nome_comercial),
  UNIQUE(prefixo_codigo)
);

-- Índices
CREATE INDEX idx_modelos_grupo ON public.modelos_equipamentos(grupo_id);
CREATE INDEX idx_modelos_nome ON public.modelos_equipamentos(nome_comercial);
CREATE INDEX idx_modelos_prefixo ON public.modelos_equipamentos(prefixo_codigo);
CREATE INDEX idx_modelos_ativo ON public.modelos_equipamentos(ativo);

-- RLS
ALTER TABLE public.modelos_equipamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (todos podem ver modelos ativos)
CREATE POLICY "Modelos visíveis para autenticados"
  ON public.modelos_equipamentos FOR SELECT
  USING (ativo = true);

-- Políticas de INSERT (gestor e admin)
CREATE POLICY "Gestor pode criar modelos"
  ON public.modelos_equipamentos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas de UPDATE (gestor e admin)
CREATE POLICY "Gestor pode atualizar modelos"
  ON public.modelos_equipamentos FOR UPDATE
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas de DELETE (apenas admin)
CREATE POLICY "Admin pode deletar modelos"
  ON public.modelos_equipamentos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. HISTÓRICO DE PREÇOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.historico_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES public.modelos_equipamentos(id) ON DELETE CASCADE,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  
  -- Dados da alteração
  periodo TEXT, -- 'DIARIA', '7', '14', '21', '28'
  valor_anterior NUMERIC,
  valor_novo NUMERIC,
  descricao TEXT,
  
  -- Auditoria
  usuario TEXT NOT NULL,
  data_iso TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_historico_modelo ON public.historico_precos(modelo_id);
CREATE INDEX idx_historico_loja ON public.historico_precos(loja_id);
CREATE INDEX idx_historico_data ON public.historico_precos(data_iso DESC);

-- RLS
ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (gestor e admin podem ver histórico)
CREATE POLICY "Gestor pode ver histórico de preços"
  ON public.historico_precos FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas de INSERT (sistema registra automaticamente)
CREATE POLICY "Sistema pode inserir histórico"
  ON public.historico_precos FOR INSERT
  WITH CHECK (true);

-- 4. TRIGGERS
-- =====================================================
CREATE TRIGGER update_grupos_updated_at
  BEFORE UPDATE ON public.grupos_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modelos_updated_at
  BEFORE UPDATE ON public.modelos_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();