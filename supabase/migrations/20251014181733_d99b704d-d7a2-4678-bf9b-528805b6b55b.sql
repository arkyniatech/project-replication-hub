-- Criar tabela de cobranças Inter/BolePix
CREATE TABLE IF NOT EXISTS public.cobrancas_inter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id UUID NOT NULL REFERENCES public.titulos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL,
  codigo_solicitacao TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  idempotency_key TEXT NOT NULL UNIQUE,
  linha_digitavel TEXT,
  codigo_barras TEXT,
  pix_copia_cola TEXT,
  qr_code_data_url TEXT,
  pdf_url TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_cobrancas_inter_titulo ON cobrancas_inter(titulo_id);
CREATE INDEX idx_cobrancas_inter_loja ON cobrancas_inter(loja_id);
CREATE INDEX idx_cobrancas_inter_codigo ON cobrancas_inter(codigo_solicitacao);
CREATE INDEX idx_cobrancas_inter_status ON cobrancas_inter(status);

-- RLS Policies
ALTER TABLE cobrancas_inter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cobranças visíveis para usuários da loja"
  ON cobrancas_inter FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro pode criar cobranças"
  ON cobrancas_inter FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'financeiro'::app_role) OR 
     has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro pode atualizar cobranças"
  ON cobrancas_inter FOR UPDATE
  USING (
    (has_role(auth.uid(), 'financeiro'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_cobrancas_inter_updated_at
  BEFORE UPDATE ON cobrancas_inter
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();