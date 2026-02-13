-- Garantir que existe uma linha inicial com UUID fixo
INSERT INTO sequenciais_fornecedores (id, proximo_sequencial, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 1, now())
ON CONFLICT (id) DO NOTHING;

-- Recriar a função gerar_codigo_fornecedor com lógica corrigida
CREATE OR REPLACE FUNCTION public.gerar_codigo_fornecedor()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sequencial INTEGER;
  v_codigo_final TEXT;
  v_fixed_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Validar que usuário tem permissão
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'financeiro'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para gerar códigos de fornecedor';
  END IF;

  -- Incrementa sequencial usando INSERT ... ON CONFLICT
  INSERT INTO sequenciais_fornecedores (id, proximo_sequencial, updated_at)
  VALUES (v_fixed_id, 2, now())
  ON CONFLICT (id) 
  DO UPDATE SET 
    proximo_sequencial = sequenciais_fornecedores.proximo_sequencial + 1,
    updated_at = now()
  WHERE sequenciais_fornecedores.id = v_fixed_id
  RETURNING proximo_sequencial - 1 INTO v_sequencial;
  
  -- Gera código no formato FOR001, FOR002, etc.
  v_codigo_final := 'FOR' || LPAD(v_sequencial::TEXT, 3, '0');
  
  RETURN v_codigo_final;
END;
$function$;