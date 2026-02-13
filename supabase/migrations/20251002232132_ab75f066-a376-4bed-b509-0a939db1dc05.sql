-- =====================================================
-- FASE 2: CONTRATOS
-- =====================================================

-- 1. CONTRATOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  
  -- Numeração
  numero TEXT NOT NULL,
  
  -- Datas
  data_inicio DATE NOT NULL,
  data_fim DATE,
  data_prevista_fim DATE,
  
  -- Valores
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  valor_pendente NUMERIC NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (
    status IN (
      'RASCUNHO',
      'AGUARDANDO_ENTREGA',
      'ATIVO',
      'ENCERRADO',
      'CANCELADO'
    )
  ),
  
  -- Logística
  logistica JSONB DEFAULT '{}'::jsonb,
  
  -- Pagamento
  forma_pagamento TEXT,
  condicoes_pagamento JSONB DEFAULT '{}'::jsonb,
  
  -- Documentos
  documentos JSONB DEFAULT '[]'::jsonb,
  
  -- Observações
  observacoes TEXT,
  observacoes_internas TEXT,
  
  -- Timeline
  timeline JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(loja_id, numero)
);

-- Índices
CREATE INDEX idx_contratos_loja ON public.contratos(loja_id);
CREATE INDEX idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_obra ON public.contratos(obra_id);
CREATE INDEX idx_contratos_numero ON public.contratos(numero);
CREATE INDEX idx_contratos_status ON public.contratos(status);
CREATE INDEX idx_contratos_data_inicio ON public.contratos(data_inicio);
CREATE INDEX idx_contratos_data_fim ON public.contratos(data_fim);

-- RLS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT
CREATE POLICY "Contratos visíveis para usuários da loja"
  ON public.contratos FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de INSERT
CREATE POLICY "Vendedor pode criar contratos"
  ON public.contratos FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
    AND
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de UPDATE
CREATE POLICY "Vendedor pode atualizar contratos"
  ON public.contratos FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
    AND
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de DELETE
CREATE POLICY "Admin pode deletar contratos"
  ON public.contratos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. ITENS DE CONTRATO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contrato_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  
  -- Equipamento
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE RESTRICT,
  modelo_id UUID REFERENCES public.modelos_equipamentos(id) ON DELETE RESTRICT,
  grupo_id UUID REFERENCES public.grupos_equipamentos(id) ON DELETE RESTRICT,
  
  -- Controle
  controle TEXT NOT NULL CHECK (controle IN ('SERIE', 'GRUPO')),
  quantidade INTEGER NOT NULL DEFAULT 1,
  
  -- Período e preço
  periodo TEXT NOT NULL, -- 'DIARIA', '7', '14', '21', '28'
  preco_unitario NUMERIC NOT NULL,
  preco_total NUMERIC NOT NULL,
  
  -- Status do item
  status TEXT NOT NULL DEFAULT 'RESERVADO' CHECK (
    status IN (
      'RESERVADO',
      'LOCADO',
      'DEVOLVIDO',
      'EM_REVISAO'
    )
  ),
  
  -- Datas
  data_locacao DATE,
  data_devolucao DATE,
  
  -- Observações
  observacoes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_contrato_itens_contrato ON public.contrato_itens(contrato_id);
CREATE INDEX idx_contrato_itens_equipamento ON public.contrato_itens(equipamento_id);
CREATE INDEX idx_contrato_itens_modelo ON public.contrato_itens(modelo_id);
CREATE INDEX idx_contrato_itens_grupo ON public.contrato_itens(grupo_id);
CREATE INDEX idx_contrato_itens_status ON public.contrato_itens(status);

-- RLS
ALTER TABLE public.contrato_itens ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (herdar do contrato)
CREATE POLICY "Itens visíveis para usuários que veem o contrato"
  ON public.contrato_itens FOR SELECT
  USING (
    contrato_id IN (
      SELECT id FROM public.contratos
      WHERE loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas de INSERT
CREATE POLICY "Vendedor pode criar itens de contrato"
  ON public.contrato_itens FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
  );

-- Políticas de UPDATE
CREATE POLICY "Vendedor pode atualizar itens de contrato"
  ON public.contrato_itens FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
  );

-- Políticas de DELETE
CREATE POLICY "Admin pode deletar itens de contrato"
  ON public.contrato_itens FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. TRIGGERS
-- =====================================================
CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contrato_itens_updated_at
  BEFORE UPDATE ON public.contrato_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();