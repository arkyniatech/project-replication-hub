-- =====================================================================
-- Correções da revisão do Inventário / Contagem Cega (PR #5)
--
-- (A) RLS: a policy FOR ALL dava a vendedor INSERT/DELETE e permitia
--     reescrever saldo_sistema/acao/justificativa/processado — o que
--     derrubava o invariante do snapshot congelado e contornava o guard
--     das RPCs. Agora vendedor só faz UPDATE dos campos de contagem.
-- (B) processar_contagem_almox recusava fechar com divergências ainda
--     sem decisão, que eram silenciosamente descartadas sem volta.
-- (C) abrir_contagem_almox permitia duas contagens abertas sobre os
--     mesmos itens; cada uma aplicaria seu próprio delta, corrigindo o
--     estoque duas vezes.
-- (D) quantidade_contada aceitava negativo, levando o saldo abaixo de zero.
-- (E) itens com controle SERIE saíam do processamento com saldo alterado
--     e a lista de séries intacta — quantidade e rastreio desencontrados.
-- =====================================================================

-- =========================
-- (D) Quantidade não pode ser negativa
-- =========================
UPDATE public.almox_contagem_itens SET quantidade_contada = NULL WHERE quantidade_contada < 0;

ALTER TABLE public.almox_contagem_itens
  DROP CONSTRAINT IF EXISTS almox_contagem_itens_qtd_nao_negativa;
ALTER TABLE public.almox_contagem_itens
  ADD CONSTRAINT almox_contagem_itens_qtd_nao_negativa
  CHECK (quantidade_contada IS NULL OR quantidade_contada >= 0);

-- =========================
-- (A) RLS por operação
-- =========================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['almox_contagens','almox_contagem_itens'] LOOP
    -- a policy FOR ALL anterior cobria INSERT/UPDATE/DELETE para vendedor
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);

    -- criar e apagar contagem é ato de gestão (as RPCs são SECURITY DEFINER
    -- e seguem funcionando; isto fecha o acesso direto via PostgREST)
    EXECUTE format('DROP POLICY IF EXISTS "%s_ins" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_ins" ON public.%I FOR INSERT TO authenticated
      WITH CHECK (public.compras_pode_gerenciar(loja_id))$p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_del" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_del" ON public.%I FOR DELETE TO authenticated
      USING (public.compras_pode_gerenciar(loja_id))$p$, t, t);
  END LOOP;

  -- UPDATE do cabeçalho: só gestão (status/processado_por são dela)
  EXECUTE $p$DROP POLICY IF EXISTS "almox_contagens_upd" ON public.almox_contagens$p$;
  EXECUTE $p$CREATE POLICY "almox_contagens_upd" ON public.almox_contagens FOR UPDATE TO authenticated
    USING (public.compras_pode_gerenciar(loja_id))
    WITH CHECK (public.compras_pode_gerenciar(loja_id))$p$;

  -- UPDATE dos itens: vendedor TAMBÉM pode, é quem digita a contagem.
  -- As colunas sensíveis (saldo_sistema, processado) são protegidas pelo
  -- trigger abaixo, não pela policy — RLS não distingue coluna.
  EXECUTE $p$DROP POLICY IF EXISTS "almox_contagem_itens_upd" ON public.almox_contagem_itens$p$;
  EXECUTE $p$CREATE POLICY "almox_contagem_itens_upd" ON public.almox_contagem_itens FOR UPDATE TO authenticated
    USING (public.is_active(auth.uid()) AND (
      public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
      OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
          AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    ))
    WITH CHECK (public.is_active(auth.uid()) AND (
      public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
      OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
          AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    ))$p$;
END $$;

-- (A) O snapshot é o que dá sentido à divergência: ninguém reescreve por fora.
-- Só as RPCs (SECURITY DEFINER, dono da função) mexem em saldo_sistema/processado.
CREATE OR REPLACE FUNCTION public.trg_contagem_item_protege_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('almox.processando_contagem', true) = 'on' THEN
    RETURN NEW;   -- chamada vinda de processar_contagem_almox
  END IF;

  IF NEW.saldo_sistema IS DISTINCT FROM OLD.saldo_sistema THEN
    RAISE EXCEPTION 'O saldo do sistema é congelado na abertura e não pode ser alterado';
  END IF;
  IF NEW.processado IS DISTINCT FROM OLD.processado THEN
    RAISE EXCEPTION 'A marca de processado é definida apenas pelo processamento da contagem';
  END IF;
  IF NEW.contagem_id IS DISTINCT FROM OLD.contagem_id OR NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    RAISE EXCEPTION 'Vínculo do item da contagem não pode ser alterado';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_contagem_protege_snapshot ON public.almox_contagem_itens;
CREATE TRIGGER trg_contagem_protege_snapshot
  BEFORE UPDATE ON public.almox_contagem_itens
  FOR EACH ROW EXECUTE FUNCTION public.trg_contagem_item_protege_snapshot();

-- =========================
-- (C) Uma contagem aberta por vez, por loja
-- =========================
CREATE OR REPLACE FUNCTION public.abrir_contagem_almox(
  p_loja_id uuid,
  p_tipo text DEFAULT 'TODOS',
  p_grupo text DEFAULT NULL,
  p_incluir_zerados boolean DEFAULT false,
  p_observacoes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_qtd integer; v_aberta text;
BEGIN
  IF NOT public.compras_pode_gerenciar(p_loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para abrir contagem nesta loja';
  END IF;

  -- Duas contagens abertas congelam o mesmo saldo e cada uma aplicaria seu
  -- próprio delta ao processar, corrigindo o estoque em dobro.
  SELECT numero INTO v_aberta FROM public.almox_contagens
   WHERE loja_id = p_loja_id AND status = 'aberta' LIMIT 1;
  IF v_aberta IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe a contagem % aberta nesta loja. Processe ou cancele antes de abrir outra.', v_aberta;
  END IF;

  INSERT INTO public.almox_contagens (loja_id, tipo, grupo, incluir_zerados, observacoes, status)
    VALUES (p_loja_id, COALESCE(p_tipo,'TODOS'), NULLIF(btrim(COALESCE(p_grupo,'')),''), COALESCE(p_incluir_zerados,false), p_observacoes, 'aberta')
    RETURNING id INTO v_id;

  -- (E) Itens com controle SERIE ficam de fora: contá-los exige conferir os
  -- números de série, não a quantidade. Ajustar só o saldo deixaria a lista
  -- de séries desencontrada do total.
  INSERT INTO public.almox_contagem_itens (contagem_id, loja_id, item_id, sku, descricao, unidade, grupo, saldo_sistema)
    SELECT v_id, p_loja_id, ci.id, ci.sku, ci.descricao, ci.unidade, ci.grupo, COALESCE(e.saldo, 0)
      FROM public.almox_catalogo_itens ci
      LEFT JOIN public.almox_estoque e ON e.item_id = ci.id AND e.loja_id = p_loja_id
     WHERE ci.ativo
       AND ci.controle <> 'SERIE'
       AND (COALESCE(p_tipo,'TODOS') = 'TODOS' OR ci.tipo = p_tipo)
       AND (NULLIF(btrim(COALESCE(p_grupo,'')),'') IS NULL OR ci.grupo = p_grupo)
       AND (COALESCE(p_incluir_zerados,false) OR COALESCE(e.saldo, 0) <> 0);

  SELECT count(*) INTO v_qtd FROM public.almox_contagem_itens WHERE contagem_id = v_id;
  IF v_qtd = 0 THEN
    RAISE EXCEPTION 'Nenhum item por saldo atende a esses filtros (itens controlados por série não entram na contagem)';
  END IF;

  RETURN v_id;
END; $$;

-- =========================
-- (B) Não fechar com divergência pendente de decisão
-- =========================
CREATE OR REPLACE FUNCTION public.processar_contagem_almox(p_contagem_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cont public.almox_contagens; v_item record;
  v_delta numeric; v_controle text; v_aplicados integer := 0; v_pendentes integer;
BEGIN
  SELECT * INTO v_cont FROM public.almox_contagens WHERE id = p_contagem_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contagem não encontrada'; END IF;
  IF NOT public.compras_pode_gerenciar(v_cont.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para processar contagem nesta loja';
  END IF;
  IF v_cont.status <> 'aberta' THEN
    RAISE EXCEPTION 'Contagem já está %', v_cont.status;
  END IF;

  -- Divergência sem decisão seria descartada em silêncio, e a contagem não
  -- pode ser reaberta depois de processada.
  SELECT count(*) INTO v_pendentes
    FROM public.almox_contagem_itens
   WHERE contagem_id = p_contagem_id
     AND quantidade_contada IS NOT NULL
     AND quantidade_contada <> saldo_sistema
     AND acao IS NULL;
  IF v_pendentes > 0 THEN
    RAISE EXCEPTION 'Há % divergência(s) sem decisão. Marque cada uma como Ajustar ou Ignorar antes de processar.', v_pendentes;
  END IF;

  PERFORM set_config('almox.processando_contagem', 'on', true);

  FOR v_item IN
    SELECT * FROM public.almox_contagem_itens
     WHERE contagem_id = p_contagem_id
       AND acao = 'AJUSTAR'
       AND quantidade_contada IS NOT NULL
       AND NOT processado
     FOR UPDATE
  LOOP
    IF COALESCE(btrim(v_item.justificativa),'') = '' THEN
      RAISE EXCEPTION 'Item % está marcado para ajustar sem justificativa', COALESCE(v_item.sku, v_item.descricao);
    END IF;

    v_delta := v_item.quantidade_contada - v_item.saldo_sistema;

    IF v_delta <> 0 THEN
      SELECT controle INTO v_controle FROM public.almox_catalogo_itens WHERE id = v_item.item_id;

      INSERT INTO public.almox_estoque (loja_id, item_id, controle, saldo, ultima_movimentacao)
        VALUES (v_cont.loja_id, v_item.item_id, COALESCE(v_controle,'SALDO'), v_delta, now())
      ON CONFLICT (loja_id, item_id) DO UPDATE SET
        controle = COALESCE(v_controle, almox_estoque.controle),
        saldo = almox_estoque.saldo + EXCLUDED.saldo,
        ultima_movimentacao = now();

      INSERT INTO public.almox_movimentos (loja_id, item_id, tipo, quantidade, referencia, observacao)
        VALUES (v_cont.loja_id, v_item.item_id,
                CASE WHEN v_delta > 0 THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END,
                v_delta, v_cont.numero, v_item.justificativa);

      v_aplicados := v_aplicados + 1;
    END IF;

    UPDATE public.almox_contagem_itens SET processado = true WHERE id = v_item.id;
  END LOOP;

  UPDATE public.almox_contagens
     SET status = 'processada', processado_por = auth.uid(), processado_em = now()
   WHERE id = p_contagem_id;

  PERFORM set_config('almox.processando_contagem', 'off', true);
  RETURN v_aplicados;
END; $$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.abrir_contagem_almox(uuid, text, text, boolean, text)',
    'public.processar_contagem_almox(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;
