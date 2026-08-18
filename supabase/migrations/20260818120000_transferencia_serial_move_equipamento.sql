-- ============================================================================
-- RELAY 39 — Transferência de SERIALIZADO passa a mover o equipamento.
-- ============================================================================
-- SINTOMA (RELAY 37/38, item 9.8): transferência #3 concluiu como RECEBIDA,
-- Águas de Lindóia -> Ouro Fino, e o equipamento LA501982561 continuou com
-- loja_atual_id = Águas de Lindóia. O ativo não se moveu.
--
-- CAUSA ESTRUTURAL: transferencia_itens não tinha equipamento_id. O item
-- serializado era referenciado só por codigo_interno, em TEXTO, sem FK — a RPC
-- não conseguia endereçar a linha de equipamentos. E o loop de saldo cobre
-- exclusivamente `tipo = 'SALDO' AND modelo_id IS NOT NULL`, então o SERIAL
-- nunca era tocado por nada.
--
-- BUG IRMÃO: como o equipamento nunca saía de DISPONIVEL, o filtro que já
-- existe em NovaTransferenciaModal.tsx:56-59 (lista só DISPONIVEL) não barrava
-- nada — o LA252028090 chegou a ficar em duas transferências ao mesmo tempo,
-- #2 (RECUSADA) e #4 (EM_TRANSITO). Marcar EM_TRANSPORTE fecha isso no ponto
-- certo, sem tocar na UI.
--
-- POR QUE equipamento_id E NÃO UPDATE POR codigo_interno:
--   • codigo_interno É único no banco (equipamentos_codigo_interno_key,
--     verificado; 0 duplicatas), então o UPDATE por texto funcionaria hoje.
--   • Mas transferencia_itens seria a ÚNICA tabela da casa referenciando
--     equipamento por texto: contrato_itens, ordens_servico e
--     horimetro_leituras todas carregam equipamento_id com FK.
--   • E codigo_interno ainda é gerado com Math.random() (item 9.12, próximo
--     relay) — ele vai mudar de forma, e uma referência por texto viraria
--     órfã silenciosa na renomeação.
--
-- ON DELETE RESTRICT, replicando contrato_itens.equipamento_id
-- (20260101043343_create_contratos.sql:147). É o padrão da casa para as FKs
-- que apontam para equipamentos a partir de um registro histórico:
--     contrato_itens.equipamento_id   -> ON DELETE RESTRICT
--     ordens_servico.equipamento_id   -> ON DELETE RESTRICT
-- (horimetro_leituras usa CASCADE, mas ali a leitura não faz sentido sem o
-- equipamento; uma transferência é registro histórico — apagar o equipamento
-- não deve apagar a trilha de que ele foi transferido.)
--
-- Integridade medida antes de escrever: 14 equipamentos, 3 itens de
-- transferência, 3/3 casando por codigo_interno, 0 órfãs. O bloco de guarda
-- revalida no momento da aplicação e aborta se algo mudou.
-- ============================================================================

-- ---------- 1) coluna nullable (as linhas antigas nascem sem) ----------
ALTER TABLE public.transferencia_itens
  ADD COLUMN IF NOT EXISTS equipamento_id uuid;

-- ---------- 2) backfill por codigo_interno, ANTES da FK ----------
UPDATE public.transferencia_itens ti
   SET equipamento_id = e.id
  FROM public.equipamentos e
 WHERE ti.equipamento_id IS NULL
   AND ti.tipo = 'SERIAL'
   AND ti.codigo_interno IS NOT NULL
   AND e.codigo_interno = ti.codigo_interno;

-- ---------- 3) guarda: aborta se algum SERIAL não casou ----------
-- Mesmo padrão de 20260815140000_fk_user_lojas_permitidas_loja.sql: revalida na
-- aplicação em vez de confiar na medição feita no desenho.
DO $$
DECLARE
  v_sem_match integer;
  v_orfas     integer;
BEGIN
  SELECT count(*)
    INTO v_sem_match
    FROM public.transferencia_itens ti
   WHERE ti.tipo = 'SERIAL'
     AND ti.codigo_interno IS NOT NULL
     AND ti.equipamento_id IS NULL;

  IF v_sem_match > 0 THEN
    RAISE EXCEPTION
      'Abortado: % item(ns) SERIAL com codigo_interno que não casa com nenhum equipamento. Resolva os órfãos antes de criar a FK.',
      v_sem_match;
  END IF;

  -- cinto e suspensório: nenhum equipamento_id preenchido pode apontar para fora
  SELECT count(*)
    INTO v_orfas
    FROM public.transferencia_itens ti
   WHERE ti.equipamento_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.equipamentos e WHERE e.id = ti.equipamento_id);

  IF v_orfas > 0 THEN
    RAISE EXCEPTION
      'Abortado: % linha(s) em transferencia_itens com equipamento_id inexistente.',
      v_orfas;
  END IF;
END $$;

-- ---------- 4) FK ----------
ALTER TABLE public.transferencia_itens
  DROP CONSTRAINT IF EXISTS transferencia_itens_equipamento_id_fkey;

ALTER TABLE public.transferencia_itens
  ADD CONSTRAINT transferencia_itens_equipamento_id_fkey
  FOREIGN KEY (equipamento_id)
  REFERENCES public.equipamentos(id)
  ON DELETE RESTRICT;

-- ---------- 5) índice ----------
-- Sem ele, a checagem de FK no DELETE de um equipamento faz seq scan em
-- transferencia_itens, e o embed equipamento:equipamentos(...) via PostgREST
-- fica sem índice do lado da referência.
CREATE INDEX IF NOT EXISTS idx_transferencia_itens_equipamento
  ON public.transferencia_itens(equipamento_id)
  WHERE equipamento_id IS NOT NULL;

COMMENT ON COLUMN public.transferencia_itens.equipamento_id IS
  'Equipamento serializado transferido. NULL para itens tipo SALDO (que usam modelo_id) e para as linhas anteriores ao RELAY 39. RESTRICT: a transferência é registro histórico e não deve sumir com o equipamento.';

-- ============================================================================
-- 6) helper interno: move um equipamento SERIALIZADO
-- ============================================================================
-- Espelha _frota_ajustar_saldo_modelo: mesma estratégia de FOR UPDATE e mesmo
-- formato de evento no historico. A especificação do ciclo veio do store
-- Zustand legado (equipamentosStore.ts:260-338), que já fazia isto certo antes
-- da migração para o Supabase e ficou órfão.
--
--   p_nova_loja_id NULL  -> só mexe no status (despacho, recusa, cancelamento)
--   p_nova_loja_id setado-> move o ativo (recebimento)
CREATE OR REPLACE FUNCTION public._frota_mover_equipamento_serial(
  p_equipamento_id uuid,
  p_novo_status text,
  p_nova_loja_id uuid,
  p_evento jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_equip record;
BEGIN
  IF p_equipamento_id IS NULL THEN
    RETURN;
  END IF;

  -- FOR UPDATE serializa transferências concorrentes do mesmo equipamento
  SELECT id, status_global, loja_atual_id INTO v_equip
    FROM public.equipamentos
   WHERE id = p_equipamento_id
   FOR UPDATE;

  IF v_equip.id IS NULL THEN
    -- comportamento legado do helper de saldo: não bloqueia o fluxo
    RAISE WARNING 'equipamento % não encontrado ao mover serializado', p_equipamento_id;
    RETURN;
  END IF;

  UPDATE public.equipamentos
     SET status_global  = COALESCE(p_novo_status, status_global),
         loja_atual_id  = COALESCE(p_nova_loja_id, loja_atual_id),
         historico      = COALESCE(historico, '[]'::jsonb) || jsonb_build_array(p_evento),
         updated_at     = now()
   WHERE id = p_equipamento_id;
END $$;
REVOKE ALL ON FUNCTION public._frota_mover_equipamento_serial(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 7) criar_transferencia — grava equipamento_id e reserva o serializado
-- ============================================================================
-- Assinatura INALTERADA (p_itens é jsonb; a chave nova entra dentro dele).
-- Todo o resto do corpo é o de 20260809130000, preservado: guards de papel e
-- escopo de loja, origem <> destino, transferência sem itens, sequence do
-- numero, FOR UPDATE no saldo e trilha em transferencia_logs.
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
  v_equip_id uuid;
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

    v_equip_id := NULLIF(v_item->>'equipamento_id', '')::uuid;

    -- Fallback por codigo_interno: cliente antigo (bundle em cache) não manda
    -- equipamento_id. codigo_interno é UNIQUE, então a resolução é determinística.
    IF v_equip_id IS NULL AND v_item->>'tipo' = 'SERIAL'
       AND NULLIF(v_item->>'codigo_interno', '') IS NOT NULL THEN
      SELECT id INTO v_equip_id
        FROM public.equipamentos
       WHERE codigo_interno = v_item->>'codigo_interno';
    END IF;

    -- Um serializado só pode estar em uma transferência por vez. A UI já
    -- filtra por DISPONIVEL, mas o filtro nunca barrou nada porque o status
    -- não mudava; aqui é a barreira de verdade, à prova de corrida.
    IF v_item->>'tipo' = 'SERIAL' AND v_equip_id IS NOT NULL THEN
      PERFORM 1 FROM public.equipamentos
        WHERE id = v_equip_id AND status_global = 'DISPONIVEL'
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipamento % não está disponível para transferência',
          COALESCE(v_item->>'codigo_interno', v_equip_id::text);
      END IF;
    END IF;

    INSERT INTO public.transferencia_itens
      (transferencia_id, tipo, modelo_id, grupo_id, codigo_interno, serie, descricao, quantidade, equipamento_id)
    VALUES
      (v_transf.id,
       v_item->>'tipo',
       NULLIF(v_item->>'modelo_id', '')::uuid,
       NULLIF(v_item->>'grupo_id', '')::uuid,
       NULLIF(v_item->>'codigo_interno', ''),
       NULLIF(v_item->>'serie', ''),
       NULLIF(v_item->>'descricao', ''),
       COALESCE((v_item->>'quantidade')::numeric, 1),
       v_equip_id);

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

    -- SERIAL: reserva na CRIAÇÃO, espelhando o débito de saldo acima. O ativo
    -- está comprometido a partir daqui; a loja só muda no recebimento.
    ELSIF v_item->>'tipo' = 'SERIAL' AND v_equip_id IS NOT NULL THEN
      PERFORM public._frota_mover_equipamento_serial(
        v_equip_id,
        'EM_TRANSPORTE',
        NULL,
        jsonb_build_object(
          'id', gen_random_uuid(),
          'timestamp', now(),
          'tipo', 'TRANSFERENCIA_ENVIADA',
          'descricao', format('Transferência #%s enviada para %s',
                              v_transf.numero, COALESCE(v_destino_nome, 'destino')),
          'usuario', v_email,
          'meta', jsonb_build_object(
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

-- ============================================================================
-- 8) atualizar_status_transferencia — devolve/move o serializado
-- ============================================================================
-- Assinatura INALTERADA. Corpo de 20260809130000 preservado: escopo de loja,
-- FOR UPDATE na transferência, bloqueio de estado terminal, guarda do despacho,
-- loop de saldo e trilha em transferencia_logs. O que entra é o loop de SERIAL.
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
  v_serial_loja uuid;
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

    -- SERIAL: RECEBIDA move o ativo para o destino; RECUSADA/CANCELADA apenas
    -- liberam na origem (loja_atual_id nunca chegou a mudar). Os dois casos
    -- devolvem o equipamento para DISPONIVEL.
    -- v_loja_credito já é NULL em EM_TRANSITO, então o despacho não mexe no
    -- ativo — ele foi reservado lá na criação.
    v_serial_loja := CASE WHEN p_status = 'RECEBIDA' THEN v_transf.destino_loja_id ELSE NULL END;

    FOR v_item IN
      SELECT * FROM public.transferencia_itens
       WHERE transferencia_id = p_transferencia_id AND tipo = 'SERIAL' AND equipamento_id IS NOT NULL
    LOOP
      PERFORM public._frota_mover_equipamento_serial(
        v_item.equipamento_id,
        'DISPONIVEL',
        v_serial_loja,
        jsonb_build_object(
          'id', gen_random_uuid(),
          'timestamp', now(),
          'tipo', v_evento_tipo,
          'descricao', CASE
            WHEN p_status = 'RECEBIDA'
              THEN format('Transferência #%s recebida em %s', v_transf.numero, COALESCE(v_destino_nome, 'destino'))
            ELSE format('Transferência #%s %s — devolvido a %s',
                        v_transf.numero, lower(p_status), COALESCE(v_origem_nome, 'origem'))
          END,
          'usuario', v_email,
          'meta', jsonb_build_object(
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
