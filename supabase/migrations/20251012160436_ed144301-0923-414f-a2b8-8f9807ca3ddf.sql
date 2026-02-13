-- Criar tabela de títulos a receber
CREATE TABLE IF NOT EXISTS public.titulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  contrato_id UUID,
  fatura_id UUID,
  numero TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Locação',
  subcategoria TEXT,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
  emissao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'EM_ABERTO',
  forma TEXT,
  origem TEXT NOT NULL DEFAULT 'CONTRATO',
  timeline JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_titulos_loja ON public.titulos(loja_id);
CREATE INDEX IF NOT EXISTS idx_titulos_cliente ON public.titulos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_titulos_contrato ON public.titulos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_titulos_fatura ON public.titulos(fatura_id);
CREATE INDEX IF NOT EXISTS idx_titulos_vencimento ON public.titulos(vencimento);
CREATE INDEX IF NOT EXISTS idx_titulos_status ON public.titulos(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_titulos_updated_at
  BEFORE UPDATE ON public.titulos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE public.titulos ENABLE ROW LEVEL SECURITY;

-- Títulos visíveis para usuários da loja
CREATE POLICY "Títulos visíveis para usuários da loja"
  ON public.titulos
  FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Vendedor/Financeiro podem criar títulos
CREATE POLICY "Vendedor/Financeiro podem criar títulos"
  ON public.titulos
  FOR INSERT
  WITH CHECK (
    (
      has_role(auth.uid(), 'vendedor') OR 
      has_role(auth.uid(), 'gestor') OR 
      has_role(auth.uid(), 'financeiro') OR 
      has_role(auth.uid(), 'admin')
    )
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Financeiro pode atualizar títulos
CREATE POLICY "Financeiro pode atualizar títulos"
  ON public.titulos
  FOR UPDATE
  USING (
    (
      has_role(auth.uid(), 'gestor') OR 
      has_role(auth.uid(), 'financeiro') OR 
      has_role(auth.uid(), 'admin')
    )
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Admin pode deletar títulos
CREATE POLICY "Admin pode deletar títulos"
  ON public.titulos
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));