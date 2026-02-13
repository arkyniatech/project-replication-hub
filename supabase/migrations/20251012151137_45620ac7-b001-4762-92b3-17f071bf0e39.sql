-- Adicionar coluna is_padrao se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'obras' 
    AND column_name = 'is_padrao'
  ) THEN
    ALTER TABLE public.obras ADD COLUMN is_padrao BOOLEAN DEFAULT false;
    COMMENT ON COLUMN public.obras.is_padrao IS 'Indica se esta é a obra padrão do cliente';
  END IF;
END $$;

-- Criar índice para is_padrao se não existir
CREATE INDEX IF NOT EXISTS idx_obras_padrao ON public.obras(cliente_id, is_padrao) WHERE is_padrao = true;