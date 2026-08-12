-- =====================================================================
-- Ticket #50 — correções do code-review
-- (1) recebimento resolve catálogo por SKU quando item_catalogo_id é NULL
-- (2) gerar_pedidos respeita "dividir_por_item" (1 PO por fornecedor vencedor)
-- (3) recebimento valida saldo a receber (não deixa receber além do pedido)
-- (4) recebimento grava série/controle corretos no estoque
-- (6) UNIQUE (loja_id, numero) evita numeração duplicada em concorrência
-- Sem alteração de schema de colunas → não precisa regenerar types.
-- =====================================================================

-- (6) Unicidade de número por loja
CREATE UNIQUE INDEX IF NOT EXISTS uidx_compras_requisicoes_numero ON public.compras_requisicoes(loja_id, numero);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_compras_cotacoes_numero ON public.compras_cotacoes(loja_id, numero);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_compras_pedidos_numero ON public.compras_pedidos(loja_id, numero);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_compras_recebimentos_numero ON public.compras_recebimentos(loja_id, numero);

-- (1)(3)(4) Recebimento transacional corrigido
CREATE OR REPLACE FUNCTION public.registrar_recebimento(p_pedido_id uuid, p_nf jsonb, p_itens jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ped public.compras_pedidos; v_rec uuid; v_item jsonb;
  v_pi public.compras_pedido_itens; v_cat uuid; v_qtd numeric;
  v_ja_recebido numeric; v_controle text; v_series jsonb;
  v_total_rec numeric; v_total_ped numeric; v_status text;
BEGIN
  SELECT * INTO v_ped FROM public.compras_pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.compras_pode_loja(v_ped.loja_id) THEN RAISE EXCEPTION 'Sem acesso à loja deste pedido'; END IF;

  INSERT INTO public.compras_recebimentos (loja_id, pedido_id, nf_numero, nf_emissao, nf_chave, status)
    VALUES (v_ped.loja_id, p_pedido_id, p_nf->>'numero', NULLIF(p_nf->>'emissao','')::date, p_nf->>'chave', 'parcial')
    RETURNING id INTO v_rec;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_itens,'[]'::jsonb)) LOOP
    v_qtd := COALESCE((v_item->>'quantidade_recebida')::numeric, 0);
    IF v_qtd <= 0 THEN CONTINUE; END IF;

    SELECT * INTO v_pi FROM public.compras_pedido_itens WHERE id = NULLIF(v_item->>'pedido_item_id','')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item do pedido inválido'; END IF;

    -- (3) não permite receber além do saldo do item
    SELECT COALESCE(SUM(quantidade_recebida),0) INTO v_ja_recebido
      FROM public.compras_recebimento_itens WHERE pedido_item_id = v_pi.id;
    IF v_ja_recebido + v_qtd > v_pi.quantidade THEN
      RAISE EXCEPTION 'Quantidade recebida (%) excede o saldo do item % (pedido %, já recebido %)',
        v_qtd, COALESCE(v_pi.sku, v_pi.descricao), v_pi.quantidade, v_ja_recebido;
    END IF;

    v_series := COALESCE(v_item->'series', '[]'::jsonb);
    INSERT INTO public.compras_recebimento_itens (recebimento_id, pedido_item_id, loja_id, quantidade_recebida, series, observacao)
      VALUES (v_rec, v_pi.id, v_ped.loja_id, v_qtd, v_series, v_item->>'observacao');

    -- (1) resolve catálogo: item_catalogo_id do pedido, senão casa por SKU
    v_cat := v_pi.item_catalogo_id;
    IF v_cat IS NULL AND v_pi.sku IS NOT NULL AND v_pi.sku <> '' THEN
      SELECT id INTO v_cat FROM public.almox_catalogo_itens WHERE sku = v_pi.sku LIMIT 1;
    END IF;

    IF v_cat IS NOT NULL THEN
      SELECT controle INTO v_controle FROM public.almox_catalogo_itens WHERE id = v_cat;
      -- (4) controle e série corretos
      INSERT INTO public.almox_estoque (loja_id, item_id, controle, saldo, series, ultima_movimentacao)
        VALUES (v_ped.loja_id, v_cat, COALESCE(v_controle,'SALDO'), v_qtd,
                CASE WHEN v_controle = 'SERIE' THEN v_series ELSE '[]'::jsonb END, now())
      ON CONFLICT (loja_id, item_id) DO UPDATE SET
        saldo = almox_estoque.saldo + EXCLUDED.saldo,
        series = CASE WHEN almox_estoque.controle = 'SERIE'
                      THEN almox_estoque.series || EXCLUDED.series ELSE almox_estoque.series END,
        ultima_movimentacao = now();
      INSERT INTO public.almox_movimentos (loja_id, item_id, tipo, quantidade, referencia)
        VALUES (v_ped.loja_id, v_cat, 'ENTRADA_PO', v_qtd, v_ped.numero);
    END IF;
  END LOOP;

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

-- (2) Geração de pedidos respeitando o tipo de aprovação
CREATE OR REPLACE FUNCTION public.gerar_pedidos_de_cotacao(p_cotacao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cot public.compras_cotacoes; v_tipo text; v_prop public.compras_cotacao_propostas;
  v_pedido uuid; v_first uuid; v_forn uuid;
BEGIN
  SELECT * INTO v_cot FROM public.compras_cotacoes WHERE id = p_cotacao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;
  IF NOT public.compras_pode_loja(v_cot.loja_id) THEN RAISE EXCEPTION 'Sem acesso à loja desta cotação'; END IF;
  IF v_cot.aprovacao IS NULL THEN RAISE EXCEPTION 'Cotação não aprovada'; END IF;

  v_tipo := v_cot.aprovacao->>'tipo';

  IF v_tipo = 'dividir_por_item' THEN
    -- vencedor por item = menor preço unitário; um PO por fornecedor vencedor
    FOR v_forn IN
      SELECT DISTINCT w.fornecedor_id FROM (
        SELECT DISTINCT ON (ci.id) cp.fornecedor_id
        FROM public.compras_cotacao_itens ci
        JOIN public.compras_cotacao_proposta_itens pi ON pi.cotacao_item_id = ci.id
        JOIN public.compras_cotacao_propostas cp ON cp.id = pi.proposta_id
        WHERE ci.cotacao_id = p_cotacao_id
        ORDER BY ci.id, pi.preco_unit ASC
      ) w
    LOOP
      INSERT INTO public.compras_pedidos (loja_id, cotacao_id, fornecedor_id, total, status)
        VALUES (v_cot.loja_id, p_cotacao_id, v_forn, 0, 'emitido')
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
          WHERE pi.cotacao_item_id = ci.id
          ORDER BY pi.preco_unit ASC LIMIT 1
        ) win ON true
        WHERE ci.cotacao_id = p_cotacao_id AND win.fornecedor_id = v_forn;

      UPDATE public.compras_pedidos
         SET total = COALESCE((SELECT SUM(total) FROM public.compras_pedido_itens WHERE pedido_id = v_pedido), 0)
       WHERE id = v_pedido;
    END LOOP;

    IF v_first IS NULL THEN RAISE EXCEPTION 'Cotação sem propostas'; END IF;
    UPDATE public.compras_cotacoes SET status = 'comprado' WHERE id = p_cotacao_id;
    RETURN v_first;
  ELSE
    -- fornecedor_unico: melhor proposta pelo menor total
    SELECT * INTO v_prop FROM public.compras_cotacao_propostas
      WHERE cotacao_id = p_cotacao_id ORDER BY total ASC LIMIT 1;
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
