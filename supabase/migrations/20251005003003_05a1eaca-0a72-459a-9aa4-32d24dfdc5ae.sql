-- 1. Adicionar campo codigo_numerico à tabela lojas
ALTER TABLE lojas ADD COLUMN codigo_numerico INTEGER;

-- 2. Popular codigo_numerico baseado em ordem alfabética
WITH lojas_ordenadas AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY nome) as numero
  FROM lojas
  WHERE ativo = true
)
UPDATE lojas 
SET codigo_numerico = lojas_ordenadas.numero
FROM lojas_ordenadas
WHERE lojas.id = lojas_ordenadas.id;

-- 3. Tornar codigo_numerico NOT NULL após popular
ALTER TABLE lojas ALTER COLUMN codigo_numerico SET NOT NULL;

-- 4. Adicionar constraint de unicidade
ALTER TABLE lojas ADD CONSTRAINT lojas_codigo_numerico_unique UNIQUE (codigo_numerico);

-- 5. Criar tabela sequenciais_equipamentos
CREATE TABLE IF NOT EXISTS sequenciais_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  proximo_sequencial INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sequenciais_equipamentos_loja_id_unique UNIQUE (loja_id)
);

-- 6. Popular sequenciais_equipamentos com todas as lojas ativas
INSERT INTO sequenciais_equipamentos (loja_id, proximo_sequencial)
SELECT id, 1
FROM lojas
WHERE ativo = true
ON CONFLICT (loja_id) DO NOTHING;

-- 7. Habilitar RLS na tabela sequenciais_equipamentos
ALTER TABLE sequenciais_equipamentos ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para sequenciais_equipamentos
CREATE POLICY "Sequenciais visíveis para autenticados"
  ON sequenciais_equipamentos FOR SELECT
  USING (true);

CREATE POLICY "Sistema pode atualizar sequenciais"
  ON sequenciais_equipamentos FOR UPDATE
  USING (true);

CREATE POLICY "Sistema pode inserir sequenciais"
  ON sequenciais_equipamentos FOR INSERT
  WITH CHECK (true);

-- 9. Criar função RPC para gerar código de equipamento
CREATE OR REPLACE FUNCTION gerar_codigo_equipamento(p_loja_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo_loja TEXT;
  v_sequencial INTEGER;
  v_codigo_final TEXT;
BEGIN
  -- Busca código numérico da loja (formato 001, 002, etc)
  SELECT LPAD(codigo_numerico::TEXT, 3, '0') INTO v_codigo_loja
  FROM lojas 
  WHERE id = p_loja_id AND ativo = true;
  
  IF v_codigo_loja IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada ou inativa: %', p_loja_id;
  END IF;
  
  -- Incrementa e retorna sequencial da loja
  INSERT INTO sequenciais_equipamentos (loja_id, proximo_sequencial)
  VALUES (p_loja_id, 2)
  ON CONFLICT (loja_id) 
  DO UPDATE SET 
    proximo_sequencial = sequenciais_equipamentos.proximo_sequencial + 1,
    updated_at = now()
  RETURNING proximo_sequencial - 1 INTO v_sequencial;
  
  -- Monta código no formato: LA + 001 + 001 (exemplo: LA001001)
  v_codigo_final := 'LA' || v_codigo_loja || LPAD(v_sequencial::TEXT, 3, '0');
  
  RETURN v_codigo_final;
END;
$$;

-- 10. Trigger para atualizar updated_at em sequenciais_equipamentos
CREATE TRIGGER update_sequenciais_equipamentos_updated_at
  BEFORE UPDATE ON sequenciais_equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Comentários para documentação
COMMENT ON COLUMN lojas.codigo_numerico IS 'Código numérico sequencial da loja (001, 002, etc) usado para gerar códigos de equipamento';
COMMENT ON TABLE sequenciais_equipamentos IS 'Controla sequenciais de códigos de equipamento por loja';
COMMENT ON FUNCTION gerar_codigo_equipamento IS 'Gera código único de equipamento no formato LA+LojaCod+Seq (ex: LA001042)';