-- =====================================================
-- FASE 2: EQUIPAMENTOS
-- =====================================================

-- 1. EQUIPAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  grupo_id UUID NOT NULL REFERENCES public.grupos_equipamentos(id) ON DELETE RESTRICT,
  modelo_id UUID NOT NULL REFERENCES public.modelos_equipamentos(id) ON DELETE RESTRICT,
  loja_atual_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
  
  -- Identificação
  codigo_interno TEXT NOT NULL UNIQUE,
  
  -- Tipo de controle
  tipo TEXT NOT NULL CHECK (tipo IN ('SERIALIZADO', 'SALDO')),
  
  -- Dados específicos por tipo
  numero_serie TEXT, -- Obrigatório para SERIALIZADO
  saldos_por_loja JSONB DEFAULT '{}'::jsonb, -- Para SALDO: { "loja_id": { "qtd": number } }
  
  -- Status global
  status_global TEXT NOT NULL DEFAULT 'DISPONIVEL' CHECK (
    status_global IN (
      'DISPONIVEL', 
      'RESERVADO', 
      'LOCADO', 
      'EM_REVISAO', 
      'MANUTENCAO', 
      'EM_TRANSPORTE', 
      'INATIVO'
    )
  ),
  
  -- Valor de indenização
  valor_indenizacao NUMERIC NOT NULL DEFAULT 0,
  
  -- Observações
  observacoes TEXT,
  
  -- Histórico (Timeline)
  historico JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_equipamentos_grupo ON public.equipamentos(grupo_id);
CREATE INDEX idx_equipamentos_modelo ON public.equipamentos(modelo_id);
CREATE INDEX idx_equipamentos_loja ON public.equipamentos(loja_atual_id);
CREATE INDEX idx_equipamentos_codigo ON public.equipamentos(codigo_interno);
CREATE INDEX idx_equipamentos_tipo ON public.equipamentos(tipo);
CREATE INDEX idx_equipamentos_status ON public.equipamentos(status_global);
CREATE INDEX idx_equipamentos_serie ON public.equipamentos(numero_serie) WHERE numero_serie IS NOT NULL;

-- RLS
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (todos autenticados podem ver equipamentos ativos)
CREATE POLICY "Equipamentos visíveis para usuários da loja"
  ON public.equipamentos FOR SELECT
  USING (
    loja_atual_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
    AND ativo = true
  );

-- Políticas de INSERT (vendedor, gestor e admin)
CREATE POLICY "Vendedor pode criar equipamentos"
  ON public.equipamentos FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
    AND
    loja_atual_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de UPDATE (vendedor, gestor e admin)
CREATE POLICY "Vendedor pode atualizar equipamentos"
  ON public.equipamentos FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role))
    AND
    loja_atual_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de DELETE (apenas admin)
CREATE POLICY "Admin pode deletar equipamentos"
  ON public.equipamentos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. TRIGGERS
-- =====================================================
CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();