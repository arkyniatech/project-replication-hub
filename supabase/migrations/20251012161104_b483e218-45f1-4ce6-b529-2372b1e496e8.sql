-- Criar tabela de recebimentos
CREATE TABLE IF NOT EXISTS public.recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL,
  titulo_id UUID NOT NULL,
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  forma TEXT NOT NULL,
  valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  juros_multa NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  usuario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_recebimentos_loja ON public.recebimentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_titulo ON public.recebimentos(titulo_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_data ON public.recebimentos(data);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_recebimentos_updated_at
  BEFORE UPDATE ON public.recebimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;

-- Recebimentos visíveis para usuários da loja
CREATE POLICY "Recebimentos visíveis para usuários da loja"
  ON public.recebimentos
  FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Financeiro pode criar recebimentos
CREATE POLICY "Financeiro pode criar recebimentos"
  ON public.recebimentos
  FOR INSERT
  WITH CHECK (
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

-- Admin pode deletar recebimentos
CREATE POLICY "Admin pode deletar recebimentos"
  ON public.recebimentos
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));