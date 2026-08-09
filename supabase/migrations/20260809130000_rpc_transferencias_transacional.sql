-- ============================================================================
-- Transferências transacionais (T7/T8 da revisão adversarial).
-- O fluxo era 5+ passos client-side sem transação: falha no meio deixava
-- transferência órfã, erro de saldo era engolido com console.error, e o
-- read-modify-write de saldos_por_loja perdia updates concorrentes.
-- Duas RPCs SECURITY DEFINER (guards espelham as policies de transferencias):
--   criar_transferencia(...)             -> tudo-ou-nada + FOR UPDATE no saldo
--   atualizar_status_transferencia(...)  -> máquina de estados + saldo atômico
-- Bônus corrigidos:
--   • numero via sequence (cliente gerava Date.now()%100000 — colisão fácil)
--   • CANCELADA devolve o saldo reservado na criação (antes vazava p/ sempre)
--   • transição de estado terminal é rejeitada (receber 2x não credita 2x)
-- ============================================================================

-- numero sequencial de verdade
CREATE SEQUENCE IF NOT EXISTS public.transferencias_numero_seq;
SELECT setval(
  'public.transferencias_numero_seq',
  COALESCE((SELECT max(numero) FROM public.transferencias), 0) + 1,
  false
);

-- ---------- helper interno: movimenta saldo de um modelo numa loja ----------
CREATE OR REPLACE FUNCTION public._frota_ajustar_saldo_modelo(
  p_modelo_id uuid,
  p_loja_id uuid,
  p_delta numeric,
  p_evento jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_equip record;
  v_qtd numeric;
BEGIN
  -- FOR UPDATE serializa transferências concorrentes do mesmo modelo
  SELECT id, saldos_por_loja, historico INTO v_equip
    FROM public.equipamentos
   WHERE modelo_id = p_modelo_id AND tipo = 'SALDO'
   LIMIT 1
   FOR UPDATE;

  IF v_equip.id IS NULL THEN
    -- comportamento legado: modelo sem equipamento SALDO não bloqueia o fluxo
    RAISE WARNING 'equipamento SALDO não encontrado para modelo %', p_modelo_id;
    RETURN;
  END IF;

  v_qtd := GREATEST(0,
    COALESCE((v_equip.saldos_por_loja -> p_loja_id::text ->> 'qtd')::numeric, 0) + p_delta);

  UPDATE public.equipamentos
     SET saldos_por_loja = jsonb_set(
           COALESCE(saldos_por_loja, '{}'::jsonb),
           ARRAY[p_loja_id::text],
           jsonb_build_object('qtd', v_qtd),
           true
         ),
         historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(p_evento),
         updated_at = now()
   WHERE id = v_equip.id;
END $$;
REVOKE ALL ON FUNCTION public._frota_ajustar_saldo_modelo(uuid, uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated;

-- ---------- criar_transferencia ----------
CREATE OR REPLACE FUNCTION public.criar_transferencia(
  p_origem_loja_id uuid,
  p_destino_loja_id uuid,
  p_itens jsonb,
  p_motorista text DEFAULT NULL,
  p_veiculo text DEFAULT NULL,
  p_observacoes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := COALESCE(auth.jwt()->>'email', 'Usuário');
  v_bypass boolean;
  v_transf public.transferencias;
  v_item jsonb;
  v_origem_nome text;
  v_destino_nome text;
BEGIN
  -- guards = policy "Staff pode criar transferencias"
  IF NOT public.is_active(v_uid) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  v_bypass := public.is_master(v_uid) OR public.has_role(v_uid, 'admin'::app_role);
  IF NOT (v_bypass OR public.has_role(v_uid, 'gestor'::app_role) OR public.has_role(v_uid, 'vendedor'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para criar transferências';
  END IF;
  IF NOT v_bypass AND NOT EXISTS (
    SELECT 1 FROM public.user_lojas_permitidas WHERE user_id = v_uid AND loja_id = p_origem_loja_id
  ) THEN
    RAISE EXCEPTION 'Sem acesso à loja de origem';
  END IF;
  IF p_origem_loja_id = p_destino_loja_id THEN
    RAISE EXCEPTION 'Origem e destino não podem ser a mesma loja';
  END IF;
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Transferência sem itens';
  END IF;

  SELECT nome INTO v_origem_nome FROM public.lojas WHERE id = p_origem_loja_id;
  SELECT nome INTO v_destino_nome FROM public.lojas WHERE id = p_destino_loja_id;

  INSERT INTO public.transferencias
    (numero, origem_loja_id, destino_loja_id, status, motorista, veiculo, observacoes, created_by)
  VALUES
    (nextval('public.transferencias_numero_seq'), p_origem_loja_id, p_destino_loja_id,
     'CRIADA', p_motorista, p_veiculo, p_observacoes, v_uid)
  RETURNING * INTO v_transf;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
    IF v_item->>'tipo' NOT IN ('SERIAL', 'SALDO') THEN
      RAISE EXCEPTION 'Tipo de item inválido: %', v_item->>'tipo';
    END IF;

    INSERT INTO public.transferencia_itens
      (transferencia_id, tipo, modelo_id, grupo_id, codigo_interno, serie, descricao, quantidade)
    VALUES
      (v_transf.id,
       v_item->>'tipo',
       NULLIF(v_item->>'modelo_id', '')::uuid,
       NULLIF(v_item->>'grupo_id', '')::uuid,
       NULLIF(v_item->>'codigo_interno', ''),
       NULLIF(v_item->>'serie', ''),
       NULLIF(v_item->>'descricao', ''),
       COALESCE((v_item->>'quantidade')::numeric, 1));

    IF v_item->>'tipo' = 'SALDO' AND NULLIF(v_item->>'modelo_id', '') IS NOT NULL THEN
      PERFORM public._frota_ajustar_saldo_modelo(
        (v_item->>'modelo_id')::uuid,
        p_origem_loja_id,
        -COALESCE((v_item->>'quantidade')::numeric, 1),
        jsonb_build_object(
          'id', gen_random_uuid(),
          'timestamp', now(),
          'tipo', 'TRANSFERENCIA_ENVIADA',
          'descricao', format('Transferência de %s unidade(s) enviada para %s',
                              COALESCE(v_item->>'quantidade', '1'), COALESCE(v_destino_nome, 'destino')),
          'usuario', v_email,
          'meta', jsonb_build_object(
            'quantidade', COALESCE((v_item->>'quantidade')::numeric, 1),
            'origemLojaId', p_origem_loja_id, 'origemLojaNome', v_origem_nome,
            'destinoLojaId', p_destino_loja_id, 'destinoLojaNome', v_destino_nome,
            'transferenciaId', v_transf.id, 'transferenciaNumero', v_transf.numero
          )
        )
      );
    END IF;
  END LOOP;

  INSERT INTO public.transferencia_logs (transferencia_id, por_usuario_id, por_usuario_nome, acao, detalhe)
  VALUES (v_transf.id, v_uid, v_email, 'CRIADA',
          format('Transferência criada com %s item(ns)', jsonb_array_length(p_itens)));

  RETURN jsonb_build_object('id', v_transf.id, 'numero', v_transf.numero);
END $$;
REVOKE ALL ON FUNCTION public.criar_transferencia(uuid, uuid, jsonb, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_transferencia(uuid, uuid, jsonb, text, text, text) TO authenticated;

-- ---------- atualizar_status_transferencia ----------
CREATE OR REPLACE FUNCTION public.atualizar_status_transferencia(
  p_transferencia_id uuid,
  p_status text,
  p_recusa jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := COALESCE(auth.jwt()->>'email', 'Usuário');
  v_bypass boolean;
  v_transf public.transferencias;
  v_item record;
  v_loja_credito uuid;
  v_evento_tipo text;
  v_origem_nome text;
  v_destino_nome text;
BEGIN
  IF NOT public.is_active(v_uid) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF p_status NOT IN ('EM_TRANSITO', 'RECEBIDA', 'RECUSADA', 'CANCELADA') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- FOR UPDATE: duas confirmações simultâneas não processam duas vezes
  SELECT * INTO v_transf FROM public.transferencias WHERE id = p_transferencia_id FOR UPDATE;
  IF v_transf.id IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;

  v_bypass := public.is_master(v_uid) OR public.has_role(v_uid, 'admin'::app_role);
  IF NOT v_bypass AND NOT EXISTS (
    SELECT 1 FROM public.user_lojas_permitidas
     WHERE user_id = v_uid AND loja_id IN (v_transf.origem_loja_id, v_transf.destino_loja_id)
  ) THEN
    RAISE EXCEPTION 'Sem acesso às lojas desta transferência';
  END IF;

  -- máquina de estados: terminais não transitam (evita crédito em dobro)
  IF v_transf.status IN ('RECEBIDA', 'RECUSADA', 'CANCELADA') THEN
    RAISE EXCEPTION 'Transferência já está % — transição para % inválida', v_transf.status, p_status;
  END IF;
  IF p_status = 'EM_TRANSITO' AND v_transf.status <> 'CRIADA' THEN
    RAISE EXCEPTION 'Só transferência CRIADA pode ser despachada';
  END IF;

  SELECT nome INTO v_origem_nome FROM public.lojas WHERE id = v_transf.origem_loja_id;
  SELECT nome INTO v_destino_nome FROM public.lojas WHERE id = v_transf.destino_loja_id;

  -- saldo: RECEBIDA credita o destino; RECUSADA/CANCELADA devolvem à origem
  IF p_status = 'RECEBIDA' THEN
    v_loja_credito := v_transf.destino_loja_id;
    v_evento_tipo := 'TRANSFERENCIA_RECEBIDA';
  ELSIF p_status IN ('RECUSADA', 'CANCELADA') THEN
    v_loja_credito := v_transf.origem_loja_id;
    v_evento_tipo := 'TRANSFERENCIA_' || p_status;
  END IF;

  IF v_loja_credito IS NOT NULL THEN
    FOR v_item IN
      SELECT * FROM public.transferencia_itens
       WHERE transferencia_id = p_transferencia_id AND tipo = 'SALDO' AND modelo_id IS NOT NULL
    LOOP
      PERFORM public._frota_ajustar_saldo_modelo(
        v_item.modelo_id,
        v_loja_credito,
        v_item.quantidade,
        jsonb_build_object(
          'id', gen_random_uuid(),
          'timestamp', now(),
          'tipo', v_evento_tipo,
          'descricao', format('Transferência #%s: %s unidade(s) — %s',
                              v_transf.numero, v_item.quantidade, lower(p_status)),
          'usuario', v_email,
          'meta', jsonb_build_object(
            'quantidade', v_item.quantidade,
            'origemLojaId', v_transf.origem_loja_id, 'origemLojaNome', v_origem_nome,
            'destinoLojaId', v_transf.destino_loja_id, 'destinoLojaNome', v_destino_nome,
            'transferenciaId', v_transf.id, 'transferenciaNumero', v_transf.numero
          )
        )
      );
    END LOOP;
  END IF;

  UPDATE public.transferencias
     SET status = p_status,
         recusa = CASE WHEN p_status = 'RECUSADA' THEN p_recusa ELSE recusa END
   WHERE id = p_transferencia_id;

  INSERT INTO public.transferencia_logs (transferencia_id, por_usuario_id, por_usuario_nome, acao, detalhe)
  VALUES (p_transferencia_id, v_uid, v_email, p_status,
          CASE WHEN p_recusa IS NOT NULL THEN format('Motivo: %s', p_recusa->>'motivo') END);
END $$;
REVOKE ALL ON FUNCTION public.atualizar_status_transferencia(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_status_transferencia(uuid, text, jsonb) TO authenticated;
