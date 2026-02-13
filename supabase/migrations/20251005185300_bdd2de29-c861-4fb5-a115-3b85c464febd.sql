-- FASE A: Mudanças no banco de dados para novo formato de código

-- 1. Adicionar coluna codigo_numerico na tabela grupos_equipamentos
ALTER TABLE grupos_equipamentos 
ADD COLUMN IF NOT EXISTS codigo_numerico INTEGER;

-- 2. Popular grupos existentes com códigos numéricos sequenciais (01-99)
WITH numbered_groups AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM grupos_equipamentos
  WHERE codigo_numerico IS NULL
)
UPDATE grupos_equipamentos g
SET codigo_numerico = ng.row_num
FROM numbered_groups ng
WHERE g.id = ng.id;

-- 3. Adicionar constraints
ALTER TABLE grupos_equipamentos 
ALTER COLUMN codigo_numerico SET NOT NULL;

ALTER TABLE grupos_equipamentos 
ADD CONSTRAINT grupos_equipamentos_codigo_numerico_unique UNIQUE (codigo_numerico);

ALTER TABLE grupos_equipamentos 
ADD CONSTRAINT grupos_equipamentos_codigo_numerico_check CHECK (codigo_numerico BETWEEN 1 AND 99);

-- 4. Recriar tabela sequenciais_equipamentos com nova estrutura
DROP TABLE IF EXISTS sequenciais_equipamentos CASCADE;

CREATE TABLE sequenciais_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES grupos_equipamentos(id) ON DELETE CASCADE,
  proximo_sequencial INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loja_id, grupo_id)
);

-- 5. Habilitar RLS
ALTER TABLE sequenciais_equipamentos ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para sequenciais_equipamentos
CREATE POLICY "Sequenciais visíveis para autenticados"
  ON sequenciais_equipamentos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema pode inserir sequenciais"
  ON sequenciais_equipamentos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar sequenciais"
  ON sequenciais_equipamentos
  FOR UPDATE
  TO authenticated
  USING (true);

-- 7. Atualizar função gerar_codigo_equipamento para novo formato
CREATE OR REPLACE FUNCTION public.gerar_codigo_equipamento(
  p_loja_id UUID,
  p_grupo_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_codigo_loja TEXT;
  v_codigo_grupo TEXT;
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
  
  -- Busca código numérico do grupo (formato 01, 02, etc)
  SELECT LPAD(codigo_numerico::TEXT, 2, '0') INTO v_codigo_grupo
  FROM grupos_equipamentos 
  WHERE id = p_grupo_id AND ativo = true;
  
  IF v_codigo_grupo IS NULL THEN
    RAISE EXCEPTION 'Grupo não encontrado ou inativo: %', p_grupo_id;
  END IF;
  
  -- Incrementa e retorna sequencial por (loja + grupo)
  INSERT INTO sequenciais_equipamentos (loja_id, grupo_id, proximo_sequencial)
  VALUES (p_loja_id, p_grupo_id, 2)
  ON CONFLICT (loja_id, grupo_id) 
  DO UPDATE SET 
    proximo_sequencial = sequenciais_equipamentos.proximo_sequencial + 1,
    updated_at = now()
  RETURNING proximo_sequencial - 1 INTO v_sequencial;
  
  -- Monta código no formato: LA + 001 + 01 + 001 (exemplo: LA00101001)
  v_codigo_final := 'LA' || v_codigo_loja || v_codigo_grupo || LPAD(v_sequencial::TEXT, 3, '0');
  
  RETURN v_codigo_final;
END;
$function$;