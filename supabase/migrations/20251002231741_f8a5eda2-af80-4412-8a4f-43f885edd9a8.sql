-- =====================================================
-- FASE 2: COMERCIAL CORE - CLIENTES E OBRAS
-- =====================================================

-- 1. CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  
  -- Tipo
  tipo TEXT NOT NULL CHECK (tipo IN ('PF', 'PJ')),
  
  -- Dados PF
  nome TEXT,
  cpf TEXT,
  rg TEXT,
  data_nascimento DATE,
  
  -- Dados PJ
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  isento_ie BOOLEAN DEFAULT false,
  
  -- Contatos
  contatos JSONB DEFAULT '[]'::jsonb,
  contato_principal_id TEXT,
  
  -- Endereço
  endereco JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status_credito TEXT NOT NULL DEFAULT 'EM_ANALISE' CHECK (status_credito IN ('ATIVO', 'SUSPENSO', 'EM_ANALISE')),
  inadimplente BOOLEAN DEFAULT false,
  
  -- LGPD
  aceite_lgpd BOOLEAN DEFAULT false,
  data_aceite_lgpd TIMESTAMPTZ,
  
  -- Anexos
  anexos JSONB DEFAULT '[]'::jsonb,
  
  -- Observações
  observacoes TEXT,
  
  -- Auditoria
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_clientes_loja ON public.clientes(loja_id);
CREATE INDEX idx_clientes_tipo ON public.clientes(tipo);
CREATE INDEX idx_clientes_cpf ON public.clientes(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_clientes_cnpj ON public.clientes(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_clientes_status ON public.clientes(status_credito);
CREATE INDEX idx_clientes_inadimplente ON public.clientes(inadimplente);

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT (todos autenticados podem ver clientes da sua loja)
CREATE POLICY "Clientes visíveis para usuários da loja"
  ON public.clientes FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de INSERT (vendedor, gestor, admin)
CREATE POLICY "Vendedor pode criar clientes"
  ON public.clientes FOR INSERT
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

-- Políticas de UPDATE (vendedor, gestor, admin)
CREATE POLICY "Vendedor pode atualizar clientes"
  ON public.clientes FOR UPDATE
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

-- Políticas de DELETE (apenas admin)
CREATE POLICY "Admin pode deletar clientes"
  ON public.clientes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. OBRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  
  -- Dados
  nome TEXT NOT NULL,
  codigo TEXT,
  
  -- Endereço
  endereco JSONB DEFAULT '{}'::jsonb,
  
  -- Contatos
  contatos JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'SUSPENSA', 'ENCERRADA')),
  
  -- Datas
  data_inicio DATE,
  data_previsao_termino DATE,
  data_termino DATE,
  
  -- Observações
  observacoes TEXT,
  
  -- Auditoria
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_obras_loja ON public.obras(loja_id);
CREATE INDEX idx_obras_cliente ON public.obras(cliente_id);
CREATE INDEX idx_obras_status ON public.obras(status);
CREATE INDEX idx_obras_codigo ON public.obras(codigo) WHERE codigo IS NOT NULL;

-- RLS
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT
CREATE POLICY "Obras visíveis para usuários da loja"
  ON public.obras FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas de INSERT
CREATE POLICY "Vendedor pode criar obras"
  ON public.obras FOR INSERT
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
CREATE POLICY "Vendedor pode atualizar obras"
  ON public.obras FOR UPDATE
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
CREATE POLICY "Admin pode deletar obras"
  ON public.obras FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. TRIGGERS
-- =====================================================
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_obras_updated_at
  BEFORE UPDATE ON public.obras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();