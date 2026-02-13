-- Criar tabela pessoa_movimentos
CREATE TABLE public.pessoa_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  descricao TEXT NOT NULL,
  observacao TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pessoa_movimentos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Movimentos visíveis para autenticados"
ON public.pessoa_movimentos
FOR SELECT
USING (true);

CREATE POLICY "Admin e RH podem inserir movimentos"
ON public.pessoa_movimentos
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin e RH podem atualizar movimentos"
ON public.pessoa_movimentos
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin e RH podem deletar movimentos"
ON public.pessoa_movimentos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_pessoa_movimentos_updated_at
BEFORE UPDATE ON public.pessoa_movimentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para performance
CREATE INDEX idx_pessoa_movimentos_pessoa_id ON public.pessoa_movimentos(pessoa_id);
CREATE INDEX idx_pessoa_movimentos_data ON public.pessoa_movimentos(data DESC);