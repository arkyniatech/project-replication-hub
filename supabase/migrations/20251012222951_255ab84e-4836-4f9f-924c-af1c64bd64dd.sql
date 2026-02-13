-- Adicionar campos de controle de faturamento em aditivos_contratuais
ALTER TABLE aditivos_contratuais 
ADD COLUMN IF NOT EXISTS faturado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fatura_id uuid REFERENCES faturas(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_aditivos_faturado ON aditivos_contratuais(faturado) WHERE faturado = false;
CREATE INDEX IF NOT EXISTS idx_aditivos_fatura_id ON aditivos_contratuais(fatura_id);

-- Comentários para documentação
COMMENT ON COLUMN aditivos_contratuais.faturado IS 'Indica se o aditivo já foi faturado';
COMMENT ON COLUMN aditivos_contratuais.fatura_id IS 'Referência para a fatura gerada a partir deste aditivo';