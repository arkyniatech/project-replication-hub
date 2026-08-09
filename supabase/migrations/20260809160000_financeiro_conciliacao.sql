-- ============================================================================
-- Lote laranja 2, módulo 1: FINANCEIRO (transferências entre contas,
-- lançamentos e conciliação bancária) sai do localStorage.
-- Contas seguem na tabela EXISTENTE contas_financeiras (shape 1:1 com a UI).
-- Efetivar/estornar transferência são RPCs atômicas (status + 2 lançamentos
-- + 2 saldos com FOR UPDATE) — dinheiro não fica meio-gravado.
-- Dados legados do navegador NÃO são migrados (eram seed/mock do store).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fin_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  origem_id uuid NOT NULL REFERENCES public.contas_financeiras(id),
  destino_id uuid NOT NULL REFERENCES public.contas_financeiras(id),
  valor numeric NOT NULL CHECK (valor > 0),
  taxa numeric NOT NULL DEFAULT 0,
  data date NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EFETIVADA','CANCELADA')),
  ref text,
  descricao text,
  anexo text,
  centros_custo text,
  observacoes text,
  estorno_de uuid REFERENCES public.fin_transferencias(id),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (origem_id <> destino_id)
);
CREATE INDEX IF NOT EXISTS idx_fin_transf_loja ON public.fin_transferencias(loja_id);

CREATE TABLE IF NOT EXISTS public.fin_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas_financeiras(id) ON DELETE CASCADE,
  loja_id uuid REFERENCES public.lojas(id),
  tipo text NOT NULL CHECK (tipo IN ('DEBITO','CREDITO')),
  valor numeric NOT NULL,
  data date NOT NULL,
  origem text NOT NULL DEFAULT 'MANUAL' CHECK (origem IN ('TRANSFERENCIA','AJUSTE','MANUAL')),
  ref_id text,
  cc text,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_fin_lanc_conta ON public.fin_lancamentos(conta_id);

CREATE TABLE IF NOT EXISTS public.fin_conciliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  conta_id uuid NOT NULL REFERENCES public.contas_financeiras(id) ON DELETE CASCADE,
  periodo_ini date NOT NULL,
  periodo_fim date NOT NULL,
  saldo_inicial_extrato numeric NOT NULL DEFAULT 0,
  saldo_final_extrato numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','FECHADA')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (periodo_fim >= periodo_ini)
);
CREATE INDEX IF NOT EXISTS idx_fin_conc_loja ON public.fin_conciliacoes(loja_id);

CREATE TABLE IF NOT EXISTS public.fin_extrato_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conciliacao_id uuid NOT NULL REFERENCES public.fin_conciliacoes(id) ON DELETE CASCADE,
  data date NOT NULL,
  historico text NOT NULL DEFAULT '',
  valor numeric NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('C','D')),
  doc text,
  saldo numeric,
  pareado boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_fin_extrato_conc ON public.fin_extrato_linhas(conciliacao_id);

CREATE TABLE IF NOT EXISTS public.fin_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conciliacao_id uuid NOT NULL REFERENCES public.fin_conciliacoes(id) ON DELETE CASCADE,
  extrato_id uuid NOT NULL REFERENCES public.fin_extrato_linhas(id) ON DELETE CASCADE,
  lancamento_id uuid NOT NULL REFERENCES public.fin_lancamentos(id) ON DELETE CASCADE,
  modo text NOT NULL DEFAULT 'MANUAL' CHECK (modo IN ('AUTO','MANUAL')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_matches_conc ON public.fin_matches(conciliacao_id);

-- ---------- RLS + proteções do demo (policies restritivas + trigger) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fin_transferencias','fin_lancamentos','fin_conciliacoes','fin_extrato_linhas','fin_matches'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid())
        OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'financeiro'::app_role)
        OR public.has_role(auth.uid(),'gestor'::app_role)))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid())
        OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'financeiro'::app_role)))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid())
        OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'financeiro'::app_role)))$p$, t, t);
    -- demo somente-leitura: camada RLS + camada trigger (definer não escapa)
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_ins" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_ins" ON public.%I AS RESTRICTIVE
      FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_upd" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_upd" ON public.%I AS RESTRICTIVE
      FOR UPDATE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_del" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_del" ON public.%I AS RESTRICTIVE
      FOR DELETE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_demo_readonly ON public.%I', t);
    EXECUTE format($trg$CREATE TRIGGER trg_demo_readonly
      BEFORE INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_demo()$trg$, t);
  END LOOP;
END $$;

-- ---------- RPCs atômicas ----------
CREATE OR REPLACE FUNCTION public.fin_efetivar_transferencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_t public.fin_transferencias;
  v_total numeric;
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

CREATE OR REPLACE FUNCTION public.fin_estornar_transferencia(p_id uuid, p_motivo text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_t public.fin_transferencias;
  v_estorno uuid;
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
