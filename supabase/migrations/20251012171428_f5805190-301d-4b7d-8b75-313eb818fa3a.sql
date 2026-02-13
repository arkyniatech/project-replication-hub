-- Criar tabela de aditivos contratuais
CREATE TABLE IF NOT EXISTS public.aditivos_contratuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('RENOVACAO', 'DESCONTO', 'TAXA', 'AJUSTE', 'OUTRO')),
  descricao TEXT NOT NULL,
  justificativa TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  vinculacao TEXT NOT NULL DEFAULT 'CONTRATO' CHECK (vinculacao IN ('CONTRATO', 'ITEM')),
  item_id UUID,
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'CANCELADO')),
  criado_por UUID,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aditivos_contrato_id ON public.aditivos_contratuais(contrato_id);
CREATE INDEX IF NOT EXISTS idx_aditivos_loja_id ON public.aditivos_contratuais(loja_id);
CREATE INDEX IF NOT EXISTS idx_aditivos_tipo ON public.aditivos_contratuais(tipo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_aditivos_updated_at
  BEFORE UPDATE ON public.aditivos_contratuais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.aditivos_contratuais ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Aditivos visíveis para usuários da loja"
  ON public.aditivos_contratuais FOR SELECT
  USING (loja_id IN (
    SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Vendedor pode criar aditivos"
  ON public.aditivos_contratuais FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendedor pode atualizar aditivos"
  ON public.aditivos_contratuais FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar aditivos"
  ON public.aditivos_contratuais FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));