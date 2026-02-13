-- ============================================
-- VALIDAÇÃO FUNÇÕES SECURITY DEFINER
-- ============================================

-- 1. gerar_codigo_equipamento(uuid) - Validar acesso à loja
CREATE OR REPLACE FUNCTION gerar_codigo_equipamento(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo_loja TEXT;
  v_sequencial INTEGER;
  v_codigo_final TEXT;
BEGIN
  -- ✅ SECURITY: Validar que usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM user_lojas_permitidas
    WHERE user_id = auth.uid() AND loja_id = p_loja_id
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para gerar códigos nesta loja';
  END IF;

  -- Busca código numérico da loja
  SELECT LPAD(codigo_numerico::TEXT, 3, '0') INTO v_codigo_loja
  FROM lojas 
  WHERE id = p_loja_id AND ativo = true;
  
  IF v_codigo_loja IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada ou inativa: %', p_loja_id;
  END IF;
  
  -- Incrementa sequencial
  INSERT INTO sequenciais_equipamentos (loja_id, proximo_sequencial)
  VALUES (p_loja_id, 2)
  ON CONFLICT (loja_id) 
  DO UPDATE SET 
    proximo_sequencial = sequenciais_equipamentos.proximo_sequencial + 1,
    updated_at = now()
  RETURNING proximo_sequencial - 1 INTO v_sequencial;
  
  v_codigo_final := 'LA' || v_codigo_loja || LPAD(v_sequencial::TEXT, 3, '0');
  
  RETURN v_codigo_final;
END;
$$;

-- 2. gerar_codigo_equipamento(uuid, uuid) - Validar acesso à loja
CREATE OR REPLACE FUNCTION gerar_codigo_equipamento(p_loja_id uuid, p_grupo_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo_loja TEXT;
  v_codigo_grupo TEXT;
  v_sequencial INTEGER;
  v_codigo_final TEXT;
BEGIN
  -- ✅ SECURITY: Validar que usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM user_lojas_permitidas
    WHERE user_id = auth.uid() AND loja_id = p_loja_id
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para gerar códigos nesta loja';
  END IF;

  -- Busca código da loja
  SELECT LPAD(codigo_numerico::TEXT, 3, '0') INTO v_codigo_loja
  FROM lojas 
  WHERE id = p_loja_id AND ativo = true;
  
  IF v_codigo_loja IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada ou inativa: %', p_loja_id;
  END IF;
  
  -- Busca código do grupo
  SELECT LPAD(codigo_numerico::TEXT, 2, '0') INTO v_codigo_grupo
  FROM grupos_equipamentos 
  WHERE id = p_grupo_id AND ativo = true;
  
  IF v_codigo_grupo IS NULL THEN
    RAISE EXCEPTION 'Grupo não encontrado ou inativo: %', p_grupo_id;
  END IF;
  
  INSERT INTO sequenciais_equipamentos (loja_id, grupo_id, proximo_sequencial)
  VALUES (p_loja_id, p_grupo_id, 2)
  ON CONFLICT (loja_id, grupo_id) 
  DO UPDATE SET 
    proximo_sequencial = sequenciais_equipamentos.proximo_sequencial + 1,
    updated_at = now()
  RETURNING proximo_sequencial - 1 INTO v_sequencial;
  
  v_codigo_final := 'LA' || v_codigo_loja || v_codigo_grupo || LPAD(v_sequencial::TEXT, 3, '0');
  
  RETURN v_codigo_final;
END;
$$;

-- 3. incrementar_contador - Validar permissão
CREATE OR REPLACE FUNCTION incrementar_contador(p_loja_id uuid, p_tipo text, p_chave_contador text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_novo_contador INTEGER;
BEGIN
  -- ✅ SECURITY: Validar que usuário tem acesso à loja
  IF NOT EXISTS (
    SELECT 1 FROM user_lojas_permitidas
    WHERE user_id = auth.uid() AND loja_id = p_loja_id
  ) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para incrementar contadores nesta loja';
  END IF;

  INSERT INTO public.contadores_documentos (loja_id, tipo, chave_contador, contador_atual, ultimo_uso)
  VALUES (p_loja_id, p_tipo, p_chave_contador, 1, now())
  ON CONFLICT (loja_id, tipo, chave_contador)
  DO UPDATE SET 
    contador_atual = contadores_documentos.contador_atual + 1,
    ultimo_uso = now(),
    updated_at = now()
  RETURNING contador_atual INTO v_novo_contador;
  
  RETURN v_novo_contador;
END;
$$;

-- 4. recalcular_saldo_equipamento_direto - Validar permissão
CREATE OR REPLACE FUNCTION recalcular_saldo_equipamento_direto(p_equipamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loja_id UUID;
  v_total_usado INTEGER;
  v_saldo_total INTEGER;
  v_saldos_atuais JSONB;
BEGIN
  -- ✅ SECURITY: Validar permissão para modificar saldos
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para recalcular saldos de equipamentos';
  END IF;

  SELECT loja_atual_id, saldos_por_loja 
  INTO v_loja_id, v_saldos_atuais
  FROM equipamentos
  WHERE id = p_equipamento_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcula total usado
  SELECT COALESCE(SUM(ci.quantidade), 0)
  INTO v_total_usado
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = p_equipamento_id
    AND ci.controle = 'GRUPO'
    AND c.status IN ('RASCUNHO', 'ATIVO', 'RESERVADO', 'AGUARDANDO_ENTREGA')
    AND c.ativo = true;
  
  v_saldo_total := COALESCE((v_saldos_atuais->v_loja_id::text->>'qtd')::integer, 0);
  
  v_saldos_atuais := jsonb_set(
    COALESCE(v_saldos_atuais, '{}'::jsonb),
    ARRAY[v_loja_id::text, 'qtd']::text[],
    to_jsonb(v_saldo_total),
    true
  );
  
  v_saldos_atuais := jsonb_set(
    v_saldos_atuais,
    ARRAY[v_loja_id::text, 'qtdDisponivel']::text[],
    to_jsonb(GREATEST(0, v_saldo_total - v_total_usado)),
    true
  );
  
  UPDATE equipamentos
  SET 
    saldos_por_loja = v_saldos_atuais,
    updated_at = now()
  WHERE id = p_equipamento_id;
END;
$$;

-- 5. recalcular_kpis_equipamento - Validar permissão
CREATE OR REPLACE FUNCTION recalcular_kpis_equipamento(p_equipamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receita NUMERIC(12,2);
  v_vezes INTEGER;
  v_dias_locado INTEGER;
BEGIN
  -- ✅ SECURITY: Validar permissão
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para recalcular KPIs';
  END IF;

  SELECT 
    COALESCE(SUM(ci.preco_total), 0),
    COUNT(DISTINCT ci.contrato_id)
  INTO v_receita, v_vezes
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = p_equipamento_id
    AND c.status IN ('ATIVO', 'CONCLUIDO');

  SELECT COALESCE(SUM(
    EXTRACT(DAY FROM 
      LEAST(ci.data_devolucao, CURRENT_DATE) - 
      GREATEST(ci.data_locacao, CURRENT_DATE - INTERVAL '30 days')
    )
  ), 0)
  INTO v_dias_locado
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = p_equipamento_id
    AND c.status IN ('ATIVO', 'CONCLUIDO')
    AND ci.data_locacao >= CURRENT_DATE - INTERVAL '30 days';

  UPDATE equipamentos
  SET 
    receita_acumulada = v_receita,
    vezes_locado = v_vezes,
    dias_ocioso_ultimo_mes = GREATEST(0, 30 - v_dias_locado),
    taxa_ocupacao_ultimo_mes = ROUND((v_dias_locado::NUMERIC / 30) * 100, 2),
    margem_acumulada = v_receita - COALESCE(custo_total_manutencao, 0),
    updated_at = now()
  WHERE id = p_equipamento_id;
END;
$$;

-- 6. Adicionar comentários de auditoria
COMMENT ON FUNCTION gerar_codigo_equipamento(uuid) IS 
'SECURITY: Validar acesso à loja antes de gerar código. Requer permissão na loja.';

COMMENT ON FUNCTION gerar_codigo_equipamento(uuid, uuid) IS 
'SECURITY: Validar acesso à loja antes de gerar código. Requer permissão na loja.';

COMMENT ON FUNCTION incrementar_contador(uuid, text, text) IS 
'SECURITY: Validar acesso à loja antes de incrementar contador.';

COMMENT ON FUNCTION recalcular_saldo_equipamento_direto(uuid) IS 
'SECURITY: Requer role admin, vendedor ou gestor para recalcular saldos.';

COMMENT ON FUNCTION recalcular_kpis_equipamento(uuid) IS 
'SECURITY: Requer role admin, vendedor ou gestor para recalcular KPIs.';