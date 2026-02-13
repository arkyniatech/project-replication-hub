-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  contato JSONB DEFAULT '{}'::jsonb,
  endereco JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_codigo ON public.fornecedores(codigo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON public.fornecedores(nome);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON public.fornecedores(ativo);

-- Habilitar RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Policies para fornecedores
CREATE POLICY "Fornecedores visíveis para autenticados"
  ON public.fornecedores
  FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admin/Financeiro podem criar fornecedores"
  ON public.fornecedores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Admin/Financeiro podem atualizar fornecedores"
  ON public.fornecedores
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Admin pode deletar fornecedores"
  ON public.fornecedores
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela de sequenciais para fornecedores
CREATE TABLE IF NOT EXISTS public.sequenciais_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proximo_sequencial INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir registro inicial
INSERT INTO public.sequenciais_fornecedores (proximo_sequencial)
VALUES (1)
ON CONFLICT DO NOTHING;

-- Habilitar RLS (apenas leitura para sistema)
ALTER TABLE public.sequenciais_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sequenciais visíveis para autenticados"
  ON public.sequenciais_fornecedores
  FOR SELECT
  TO authenticated
  USING (true);

-- Função para gerar código de fornecedor
CREATE OR REPLACE FUNCTION public.gerar_codigo_fornecedor()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequencial INTEGER;
  v_codigo_final TEXT;
BEGIN
  -- Validar que usuário tem permissão
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para gerar códigos de fornecedor';
  END IF;

  -- Incrementa sequencial
  UPDATE sequenciais_fornecedores
  SET 
    proximo_sequencial = proximo_sequencial + 1,
    updated_at = now()
  RETURNING proximo_sequencial - 1 INTO v_sequencial;
  
  -- Gera código no formato FOR001, FOR002, etc.
  v_codigo_final := 'FOR' || LPAD(v_sequencial::TEXT, 3, '0');
  
  RETURN v_codigo_final;
END;
$$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_fornecedor_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_fornecedor_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fornecedor_updated_at();