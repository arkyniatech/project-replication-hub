-- =====================================================================
-- Ticket #50 — 2ª rodada de correções (revisão profunda multi-agente)
--
-- SEGURANÇA
--  (A) RLS alinhada ao RBAC: vendedor só cria requisição; cotação/pedido/
--      recebimento/estoque exigem gestor+ (antes qualquer vendedor com acesso
--      à loja podia aprovar cotação, emitir PO e mexer no estoque via API).
--  (B) RPCs sensíveis passam a exigir papel de gestão, não só acesso à loja.
--  (C) criar_cotacao_de_os aceita mecânico (persona que opera a tela) e
--      deixa de permitir que vendedor altere a OS via SECURITY DEFINER.
--
-- INTEGRIDADE
--  (D) registrar_recebimento valida que o item pertence AO pedido informado.
--  (E) Idempotência: gerar_pedidos/criar_cotacao_* barram repetição (duplo clique).
--  (F) dividir_por_item: ignora itens não cotados (preço 0) e usa desempate
--      determinístico (pi.id) nas duas consultas do vencedor.
--  (G) ajustar_saldo_estoque respeita o controle do catálogo (não força SALDO).
-- =====================================================================

-- =========================
-- (A) Guards de papel
-- =========================

-- Gestão do módulo: master/admin/gestor com acesso à loja.
CREATE OR REPLACE FUNCTION public.compras_pode_gerenciar(p_loja_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'gestor'::app_role)
        AND p_loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  );
$$;

-- Pedido de peças da Manutenção: gestão + mecânico (opera a tela da OS).
CREATE OR REPLACE FUNCTION public.compras_pode_cotar_os(p_loja_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.compras_pode_gerenciar(p_loja_id) OR (
    public.is_active(auth.uid()) AND public.has_role(auth.uid(),'mecanico'::app_role)
    AND p_loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
  );
$$;

-- =========================
-- (A) Policies de escrita por grupo de tabela
-- =========================
DO $$
DECLARE t text;
BEGIN
  -- Requisições: vendedor também escreve (é quem solicita).
  FOREACH t IN ARRAY ARRAY['compras_requisicoes','compras_requisicao_itens'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))))
      WITH CHECK (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))))$p$, t, t);
  END LOOP;

  -- Cotação, pedido, recebimento e estoque: só gestão (gestor/admin/master).
  FOREACH t IN ARRAY ARRAY[
    'compras_cotacoes','compras_cotacao_itens','compras_cotacao_propostas','compras_cotacao_proposta_itens',
    'compras_pedidos','compras_pedido_itens','compras_recebimentos','compras_recebimento_itens',
    'almox_estoque','almox_movimentos'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.compras_pode_gerenciar(loja_id))
      WITH CHECK (public.compras_pode_gerenciar(loja_id))$p$, t, t);
  END LOOP;
END $$;

-- =========================
-- (B)(D)(E) registrar_recebimento
-- =========================
CREATE OR REPLACE FUNCTION public.registrar_recebimento(p_pedido_id uuid, p_nf jsonb, p_itens jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ped public.compras_pedidos; v_rec uuid; v_item jsonb;
  v_pi public.compras_pedido_itens; v_cat uuid; v_qtd numeric;
  v_ja_recebido numeric; v_controle text; v_series jsonb; v_qualquer boolean := false;
  v_total_rec numeric; v_total_ped numeric; v_status text;
BEGIN
  SELECT * INTO v_ped FROM public.compras_pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  -- (B) recebimento é operação de gestão, não basta ter acesso à loja
  IF NOT public.compras_pode_gerenciar(v_ped.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar recebimento nesta loja';
  END IF;
  IF v_ped.status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;

  INSERT INTO public.compras_recebimentos (loja_id, pedido_id, nf_numero, nf_emissao, nf_chave, status)
    VALUES (v_ped.loja_id, p_pedido_id, p_nf->>'numero', NULLIF(p_nf->>'emissao','')::date, p_nf->>'chave', 'parcial')
    RETURNING id INTO v_rec;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_itens,'[]'::jsonb)) LOOP
    v_qtd := COALESCE((v_item->>'quantidade_recebida')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    -- (D) o item precisa pertencer AO pedido informado
    SELECT * INTO v_pi FROM public.compras_pedido_itens
      WHERE id = NULLIF(v_item->>'pedido_item_id','')::uuid AND pedido_id = p_pedido_id
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não pertence a este pedido'; END IF;

    SELECT COALESCE(SUM(quantidade_recebida),0) INTO v_ja_recebido
      FROM public.compras_recebimento_itens WHERE pedido_item_id = v_pi.id;
    IF v_ja_recebido + v_qtd > v_pi.quantidade THEN
      RAISE EXCEPTION 'Quantidade recebida (%) excede o saldo do item % (pedido %, já recebido %)',
        v_qtd, COALESCE(v_pi.sku, v_pi.descricao), v_pi.quantidade, v_ja_recebido;
    END IF;

    v_qualquer := true;
    v_series := COALESCE(v_item->'series', '[]'::jsonb);
    INSERT INTO public.compras_recebimento_itens (recebimento_id, pedido_item_id, loja_id, quantidade_recebida, series, observacao)
      VALUES (v_rec, v_pi.id, v_ped.loja_id, v_qtd, v_series, v_item->>'observacao');

    v_cat := v_pi.item_catalogo_id;
    IF v_cat IS NULL AND v_pi.sku IS NOT NULL AND v_pi.sku <> '' THEN
      -- fallback tolerante a caixa/espaços
      SELECT id INTO v_cat FROM public.almox_catalogo_itens
        WHERE upper(btrim(sku)) = upper(btrim(v_pi.sku)) LIMIT 1;
    END IF;

    IF v_cat IS NOT NULL THEN
      SELECT controle INTO v_controle FROM public.almox_catalogo_itens WHERE id = v_cat;
      INSERT INTO public.almox_estoque (loja_id, item_id, controle, saldo, series, ultima_movimentacao)
        VALUES (v_ped.loja_id, v_cat, COALESCE(v_controle,'SALDO'), v_qtd,
                CASE WHEN v_controle = 'SERIE' THEN v_series ELSE '[]'::jsonb END, now())
      ON CONFLICT (loja_id, item_id) DO UPDATE SET
        controle = COALESCE(v_controle, almox_estoque.controle),
        saldo = almox_estoque.saldo + EXCLUDED.saldo,
        series = CASE WHEN v_controle = 'SERIE'
                      THEN almox_estoque.series || EXCLUDED.series ELSE almox_estoque.series END,
        ultima_movimentacao = now();
      INSERT INTO public.almox_movimentos (loja_id, item_id, tipo, quantidade, custo_unitario, referencia)
        VALUES (v_ped.loja_id, v_cat, 'ENTRADA_PO', v_qtd, v_pi.preco_unit, v_ped.numero);
    END IF;
  END LOOP;

  IF NOT v_qualquer THEN RAISE EXCEPTION 'Informe ao menos um item com quantidade recebida'; END IF;

  SELECT COALESCE(SUM(ri.quantidade_recebida),0) INTO v_total_rec
    FROM public.compras_recebimento_itens ri
    JOIN public.compras_recebimentos r ON r.id = ri.recebimento_id
   WHERE r.pedido_id = p_pedido_id;
  SELECT COALESCE(SUM(quantidade),0) INTO v_total_ped
    FROM public.compras_pedido_itens WHERE pedido_id = p_pedido_id;

  v_status := CASE WHEN v_total_rec >= v_total_ped THEN 'total' ELSE 'parcial' END;
  UPDATE public.compras_pedidos SET status = v_status WHERE id = p_pedido_id;
  UPDATE public.compras_recebimentos SET status = v_status WHERE id = v_rec;
  RETURN v_rec;
END; $$;

-- =========================
-- (B)(E)(F) gerar_pedidos_de_cotacao
-- =========================
CREATE OR REPLACE FUNCTION public.gerar_pedidos_de_cotacao(p_cotacao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cot public.compras_cotacoes; v_tipo text; v_prop public.compras_cotacao_propostas;
  v_pedido uuid; v_first uuid; v_forn uuid;
BEGIN
  SELECT * INTO v_cot FROM public.compras_cotacoes WHERE id = p_cotacao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;
  IF NOT public.compras_pode_gerenciar(v_cot.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para gerar pedido nesta loja';
  END IF;
  IF v_cot.aprovacao IS NULL THEN RAISE EXCEPTION 'Cotação não aprovada'; END IF;
  -- (E) idempotência: já comprada não gera de novo (duplo clique / retry)
  IF v_cot.status = 'comprado' THEN RAISE EXCEPTION 'Cotação já gerou pedido de compra'; END IF;
  IF EXISTS (SELECT 1 FROM public.compras_pedidos WHERE cotacao_id = p_cotacao_id) THEN
    RAISE EXCEPTION 'Já existe pedido de compra para esta cotação';
  END IF;

  v_tipo := v_cot.aprovacao->>'tipo';

  IF v_tipo = 'dividir_por_item' THEN
    -- (F) só itens efetivamente cotados (preco_unit > 0), desempate por pi.id
    FOR v_forn IN
      SELECT DISTINCT w.fornecedor_id FROM (
        SELECT DISTINCT ON (ci.id) cp.fornecedor_id
        FROM public.compras_cotacao_itens ci
        JOIN public.compras_cotacao_proposta_itens pi ON pi.cotacao_item_id = ci.id
        JOIN public.compras_cotacao_propostas cp ON cp.id = pi.proposta_id
        WHERE ci.cotacao_id = p_cotacao_id AND pi.preco_unit > 0
        ORDER BY ci.id, pi.preco_unit ASC, pi.id ASC
      ) w
    LOOP
      INSERT INTO public.compras_pedidos (loja_id, cotacao_id, fornecedor_id, total, status, condicoes_pagamento, prazo_entrega)
        SELECT v_cot.loja_id, p_cotacao_id, v_forn, 0, 'emitido', cp.condicoes_pagamento, cp.prazo_geral_dias
        FROM public.compras_cotacao_propostas cp
        WHERE cp.cotacao_id = p_cotacao_id AND cp.fornecedor_id = v_forn
        LIMIT 1
        RETURNING id INTO v_pedido;
      IF v_first IS NULL THEN v_first := v_pedido; END IF;

      INSERT INTO public.compras_pedido_itens (pedido_id, loja_id, item_catalogo_id, sku, descricao, quantidade, preco_unit, total)
        SELECT v_pedido, ci.loja_id, ci.item_catalogo_id, ci.sku, ci.descricao, ci.quantidade,
               win.preco_unit, win.preco_unit * ci.quantidade
        FROM public.compras_cotacao_itens ci
        JOIN LATERAL (
          SELECT cp.fornecedor_id, pi.preco_unit
          FROM public.compras_cotacao_proposta_itens pi
          JOIN public.compras_cotacao_propostas cp ON cp.id = pi.proposta_id
          WHERE pi.cotacao_item_id = ci.id AND pi.preco_unit > 0
          ORDER BY pi.preco_unit ASC, pi.id ASC LIMIT 1
        ) win ON true
        WHERE ci.cotacao_id = p_cotacao_id AND win.fornecedor_id = v_forn;

      UPDATE public.compras_pedidos
         SET total = COALESCE((SELECT SUM(total) FROM public.compras_pedido_itens WHERE pedido_id = v_pedido), 0)
       WHERE id = v_pedido;
    END LOOP;

    IF v_first IS NULL THEN RAISE EXCEPTION 'Nenhum item cotado com preço válido'; END IF;
    UPDATE public.compras_cotacoes SET status = 'comprado' WHERE id = p_cotacao_id;
    RETURN v_first;
  ELSE
    SELECT * INTO v_prop FROM public.compras_cotacao_propostas
      WHERE cotacao_id = p_cotacao_id ORDER BY total ASC, id ASC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cotação sem propostas'; END IF;

    INSERT INTO public.compras_pedidos (loja_id, cotacao_id, fornecedor_id, total, status, condicoes_pagamento, prazo_entrega)
      VALUES (v_cot.loja_id, p_cotacao_id, v_prop.fornecedor_id, v_prop.total, 'emitido', v_prop.condicoes_pagamento, v_prop.prazo_geral_dias)
      RETURNING id INTO v_pedido;
    INSERT INTO public.compras_pedido_itens (pedido_id, loja_id, item_catalogo_id, sku, descricao, quantidade, preco_unit, total)
      SELECT v_pedido, ci.loja_id, ci.item_catalogo_id, ci.sku, ci.descricao, ci.quantidade,
             COALESCE(pi.preco_unit, 0), COALESCE(pi.preco_unit, 0) * ci.quantidade
      FROM public.compras_cotacao_itens ci
      LEFT JOIN public.compras_cotacao_proposta_itens pi
        ON pi.cotacao_item_id = ci.id AND pi.proposta_id = v_prop.id
      WHERE ci.cotacao_id = p_cotacao_id;

    UPDATE public.compras_cotacoes SET status = 'comprado' WHERE id = p_cotacao_id;
    RETURN v_pedido;
  END IF;
END; $$;

-- =========================
-- (B)(E) criar_cotacao_de_requisicao / direta
-- =========================
CREATE OR REPLACE FUNCTION public.criar_cotacao_de_requisicao(p_requisicao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.compras_requisicoes; v_cot uuid;
BEGIN
  SELECT * INTO v_req FROM public.compras_requisicoes WHERE id = p_requisicao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada'; END IF;
  IF NOT public.compras_pode_gerenciar(v_req.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para abrir cotação nesta loja';
  END IF;
  -- (E) só a partir de 'solicitado'; barra duplo clique e reabertura
  IF v_req.status <> 'solicitado' THEN
    RAISE EXCEPTION 'Requisição precisa estar em "solicitado" (status atual: %)', v_req.status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.compras_requisicao_itens WHERE requisicao_id = p_requisicao_id) THEN
    RAISE EXCEPTION 'Requisição sem itens';
  END IF;

  UPDATE public.compras_requisicoes SET status = 'em_cotacao' WHERE id = p_requisicao_id;
  INSERT INTO public.compras_cotacoes (loja_id, origem, origem_id, sla_interno, status)
    VALUES (v_req.loja_id, 'REQ', p_requisicao_id, now() + interval '5 days', 'em_andamento')
    RETURNING id INTO v_cot;
  INSERT INTO public.compras_cotacao_itens (cotacao_id, loja_id, item_catalogo_id, sku, descricao, unidade, quantidade)
    SELECT v_cot, loja_id, item_catalogo_id, sku, descricao, unidade, quantidade
    FROM public.compras_requisicao_itens WHERE requisicao_id = p_requisicao_id;
  RETURN v_cot;
END; $$;

CREATE OR REPLACE FUNCTION public.criar_cotacao_direta(p_loja_id uuid, p_itens jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cot uuid;
BEGIN
  IF NOT public.compras_pode_gerenciar(p_loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para abrir cotação nesta loja';
  END IF;
  IF COALESCE(jsonb_array_length(COALESCE(p_itens,'[]'::jsonb)), 0) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um item';
  END IF;
  INSERT INTO public.compras_cotacoes (loja_id, origem, origem_id, sla_interno, status)
    VALUES (p_loja_id, 'DIRETA', NULL, now() + interval '5 days', 'em_andamento')
    RETURNING id INTO v_cot;
  INSERT INTO public.compras_cotacao_itens (cotacao_id, loja_id, item_catalogo_id, sku, descricao, unidade, quantidade)
    SELECT v_cot, p_loja_id, NULLIF(i->>'item_catalogo_id','')::uuid, i->>'sku', i->>'descricao',
           COALESCE(i->>'unidade','UN'), COALESCE((i->>'quantidade')::numeric, 1)
    FROM jsonb_array_elements(p_itens) i;
  RETURN v_cot;
END; $$;

-- =========================
-- (C)(E) criar_cotacao_de_os
-- =========================
CREATE OR REPLACE FUNCTION public.criar_cotacao_de_os(p_os_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_loja uuid; v_pedido jsonb; v_cot uuid;
BEGIN
  SELECT loja_id, pedido_pecas INTO v_loja, v_pedido FROM public.ordens_servico WHERE id = p_os_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  -- (C) mecânico opera esta tela; vendedor não altera OS por aqui
  IF NOT public.compras_pode_cotar_os(v_loja) THEN
    RAISE EXCEPTION 'Sem permissão para gerar cotação desta OS';
  END IF;
  IF v_pedido IS NULL OR v_pedido->'itens' IS NULL OR jsonb_array_length(v_pedido->'itens') = 0 THEN
    RAISE EXCEPTION 'OS sem itens no pedido de peças';
  END IF;
  -- (E) uma cotação por OS (barra duplo clique)
  IF EXISTS (SELECT 1 FROM public.compras_cotacoes WHERE origem = 'OS' AND origem_id = p_os_id) THEN
    RAISE EXCEPTION 'Esta OS já possui cotação gerada';
  END IF;

  INSERT INTO public.compras_cotacoes (loja_id, origem, origem_id, sla_interno, status)
    VALUES (v_loja, 'OS', p_os_id, now() + interval '5 days', 'em_andamento')
    RETURNING id INTO v_cot;
  INSERT INTO public.compras_cotacao_itens (cotacao_id, loja_id, sku, descricao, unidade, quantidade)
    SELECT v_cot, v_loja, i->>'cod', COALESCE(i->>'descr','Item'), 'UN', COALESCE((i->>'qtd')::numeric, 1)
    FROM jsonb_array_elements(v_pedido->'itens') i;
  UPDATE public.ordens_servico
     SET pedido_pecas = jsonb_set(pedido_pecas::jsonb, '{status}', '"COMPRADO"'::jsonb)
   WHERE id = p_os_id;
  RETURN v_cot;
END; $$;

-- =========================
-- (B)(G) ajustar_saldo_estoque
-- =========================
CREATE OR REPLACE FUNCTION public.ajustar_saldo_estoque(p_item_id uuid, p_loja_id uuid, p_diferenca numeric, p_justificativa text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_controle text;
BEGIN
  IF NOT public.compras_pode_gerenciar(p_loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para ajustar estoque nesta loja';
  END IF;
  IF p_diferenca IS NULL OR p_diferenca = 0 THEN RAISE EXCEPTION 'Diferença inválida'; END IF;
  SELECT controle INTO v_controle FROM public.almox_catalogo_itens WHERE id = p_item_id;
  IF v_controle IS NULL THEN RAISE EXCEPTION 'Item não encontrado no catálogo'; END IF;

  -- (G) respeita o controle do catálogo em vez de forçar 'SALDO'
  INSERT INTO public.almox_estoque (loja_id, item_id, controle, saldo, ultima_movimentacao)
    VALUES (p_loja_id, p_item_id, v_controle, p_diferenca, now())
  ON CONFLICT (loja_id, item_id) DO UPDATE SET
    controle = v_controle,
    saldo = almox_estoque.saldo + EXCLUDED.saldo,
    ultima_movimentacao = now();
  INSERT INTO public.almox_movimentos (loja_id, item_id, tipo, quantidade, observacao)
    VALUES (p_loja_id, p_item_id, CASE WHEN p_diferenca >= 0 THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END, p_diferenca, p_justificativa);
END; $$;

-- =========================
-- Permissões
-- =========================
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.compras_pode_gerenciar(uuid)',
    'public.compras_pode_cotar_os(uuid)',
    'public.criar_cotacao_de_requisicao(uuid)',
    'public.criar_cotacao_direta(uuid, jsonb)',
    'public.criar_cotacao_de_os(uuid)',
    'public.gerar_pedidos_de_cotacao(uuid)',
    'public.registrar_recebimento(uuid, jsonb, jsonb)',
    'public.ajustar_saldo_estoque(uuid, uuid, numeric, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;
