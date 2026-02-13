-- Criar tabela faturas
CREATE TABLE IF NOT EXISTS public.faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  contrato_id UUID REFERENCES public.contratos(id),
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('FISCAL_MOCK', 'DEMONSTRATIVO')),
  emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
  vencimento TIMESTAMPTZ NOT NULL,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  forma_preferida TEXT NOT NULL,
  observacoes TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Index para performance
CREATE INDEX idx_faturas_loja ON public.faturas(loja_id);
CREATE INDEX idx_faturas_cliente ON public.faturas(cliente_id);
CREATE INDEX idx_faturas_contrato ON public.faturas(contrato_id);
CREATE INDEX idx_faturas_numero ON public.faturas(numero);

-- Trigger para updated_at
CREATE TRIGGER update_faturas_updated_at
  BEFORE UPDATE ON public.faturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- Faturas visíveis para usuários da loja
CREATE POLICY "Faturas visíveis para usuários da loja"
  ON public.faturas
  FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Vendedor/Gestor/Admin podem criar faturas
CREATE POLICY "Vendedor pode criar faturas"
  ON public.faturas
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor') OR 
     has_role(auth.uid(), 'gestor') OR 
     has_role(auth.uid(), 'financeiro') OR
     has_role(auth.uid(), 'admin'))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Vendedor/Gestor/Admin podem atualizar faturas
CREATE POLICY "Vendedor pode atualizar faturas"
  ON public.faturas
  FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor') OR 
     has_role(auth.uid(), 'gestor') OR 
     has_role(auth.uid(), 'financeiro') OR
     has_role(auth.uid(), 'admin'))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Admin pode deletar faturas
CREATE POLICY "Admin pode deletar faturas"
  ON public.faturas
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));