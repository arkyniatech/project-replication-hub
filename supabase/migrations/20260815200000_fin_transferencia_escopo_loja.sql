-- ============================================================================
-- fin_efetivar_transferencia / fin_estornar_transferencia não validam loja.
-- Duas falhas encontradas:
--   1) A RPC checa só is_active + papel do chamador — nunca confere se
--      v_t.loja_id está entre as lojas permitidas do usuário (quando não é
--      master). Um financeiro da Loja A efetiva transferência da Loja B.
--   2) Mesmo confirmando a loja do chamador, nada garante que origem_id e
--      destino_id (as contas movimentadas) pertencem à loja rotulada na
--      transferência — dá para rotular loja A e mover saldo entre contas de
--      B e C.
-- compras_pode_loja NÃO serve aqui: seu predicado de papel é
-- gestor/vendedor/admin/master, e não inclui 'financeiro' — reutilizá-lo
-- travaria usuários financeiro puros fora da própria loja. O papel já é
-- validado pelo IF de permissão no topo de cada função; a checagem abaixo
-- cuida só da segunda dimensão (a loja), via o mesmo predicado de
-- pertencimento usado por compras_pode_loja (user_lojas_permitidas).
-- Não altera nenhuma linha existente de fin_transferencias — só a função.
--
-- A checagem de coerência (2) não cria transferência inefetivável pela tela:
-- NovaTransferenciaModal monta os dois selects a partir de
-- getContasByLoja(lojaAtual.id) e grava a transferência com esse mesmo
-- lojaId, então origem, destino e loja saem sempre da mesma fonte.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fin_efetivar_transferencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_t public.fin_transferencias;
  v_total numeric;
  v_origem_loja uuid;
  v_destino_loja uuid;
BEGIN
  IF NOT public.is_active(v_uid) OR NOT (public.is_master(v_uid)
      OR public.has_role(v_uid, 'admin'::app_role)
      OR public.has_role(v_uid, 'financeiro'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_t FROM public.fin_transferencias WHERE id = p_id FOR UPDATE;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Transferência não encontrada'; END IF;
  IF v_t.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Só transferência PENDENTE pode ser efetivada (atual: %)', v_t.status;
  END IF;

  IF NOT public.is_master(v_uid) AND NOT EXISTS (
    SELECT 1 FROM public.user_lojas_permitidas
     WHERE user_id = v_uid AND loja_id = v_t.loja_id
  ) THEN
    RAISE EXCEPTION 'Sem acesso à loja desta transferência';
  END IF;

  SELECT loja_id INTO v_origem_loja FROM public.contas_financeiras WHERE id = v_t.origem_id;
  SELECT loja_id INTO v_destino_loja FROM public.contas_financeiras WHERE id = v_t.destino_id;
  IF v_origem_loja IS DISTINCT FROM v_t.loja_id OR v_destino_loja IS DISTINCT FROM v_t.loja_id THEN
    RAISE EXCEPTION 'Contas de origem/destino não pertencem à loja da transferência';
  END IF;

  v_total := v_t.valor + COALESCE(v_t.taxa, 0);

  -- trava as duas contas em ordem determinística (evita deadlock)
  PERFORM 1 FROM public.contas_financeiras
   WHERE id IN (v_t.origem_id, v_t.destino_id) ORDER BY id FOR UPDATE;

  UPDATE public.fin_transferencias SET status = 'EFETIVADA' WHERE id = p_id;

  INSERT INTO public.fin_lancamentos (conta_id, loja_id, tipo, valor, data, origem, ref_id, descricao)
  VALUES
    (v_t.origem_id, v_t.loja_id, 'DEBITO', v_total, v_t.data, 'TRANSFERENCIA', p_id::text,
     'Transferência enviada' || COALESCE(' · ' || v_t.descricao, '')),
    (v_t.destino_id, v_t.loja_id, 'CREDITO', v_t.valor, v_t.data, 'TRANSFERENCIA', p_id::text,
     'Transferência recebida' || COALESCE(' · ' || v_t.descricao, ''));

  UPDATE public.contas_financeiras SET saldo_atual = saldo_atual - v_total WHERE id = v_t.origem_id;
  UPDATE public.contas_financeiras SET saldo_atual = saldo_atual + v_t.valor WHERE id = v_t.destino_id;
END $$;
REVOKE ALL ON FUNCTION public.fin_efetivar_transferencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_efetivar_transferencia(uuid) TO authenticated;
-- REVOKE ... FROM PUBLIC também tira o acesso implícito do service_role.
-- Nenhuma Edge Function chama esta RPC hoje (varredura em supabase/functions:
-- só is_master em inter-proxy e zapsign-enviar), mas o grant explícito evita
-- quebra silenciosa se alguma passar a chamar com a service key.
GRANT EXECUTE ON FUNCTION public.fin_efetivar_transferencia(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fin_estornar_transferencia(p_id uuid, p_motivo text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_t public.fin_transferencias;
  v_estorno uuid;
  v_origem_loja uuid;
  v_destino_loja uuid;
BEGIN
  IF NOT public.is_active(v_uid) OR NOT (public.is_master(v_uid)
      OR public.has_role(v_uid, 'admin'::app_role)
      OR public.has_role(v_uid, 'financeiro'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_t FROM public.fin_transferencias WHERE id = p_id FOR UPDATE;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Transferência não encontrada'; END IF;
  IF v_t.status <> 'EFETIVADA' THEN
    RAISE EXCEPTION 'Só transferência EFETIVADA pode ser estornada';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fin_transferencias WHERE estorno_de = p_id) THEN
    RAISE EXCEPTION 'Esta transferência já foi estornada';
  END IF;

  IF NOT public.is_master(v_uid) AND NOT EXISTS (
    SELECT 1 FROM public.user_lojas_permitidas
     WHERE user_id = v_uid AND loja_id = v_t.loja_id
  ) THEN
    RAISE EXCEPTION 'Sem acesso à loja desta transferência';
  END IF;

  SELECT loja_id INTO v_origem_loja FROM public.contas_financeiras WHERE id = v_t.origem_id;
  SELECT loja_id INTO v_destino_loja FROM public.contas_financeiras WHERE id = v_t.destino_id;
  IF v_origem_loja IS DISTINCT FROM v_t.loja_id OR v_destino_loja IS DISTINCT FROM v_t.loja_id THEN
    RAISE EXCEPTION 'Contas de origem/destino não pertencem à loja da transferência';
  END IF;

  INSERT INTO public.fin_transferencias
    (loja_id, origem_id, destino_id, valor, taxa, data, status, descricao, estorno_de)
  VALUES
    (v_t.loja_id, v_t.destino_id, v_t.origem_id, v_t.valor, v_t.taxa, current_date,
     'PENDENTE', format('Estorno · %s', p_motivo), p_id)
  RETURNING id INTO v_estorno;

  PERFORM public.fin_efetivar_transferencia(v_estorno);
  RETURN v_estorno;
END $$;
REVOKE ALL ON FUNCTION public.fin_estornar_transferencia(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_estornar_transferencia(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fin_estornar_transferencia(uuid, text) TO service_role;
