-- =====================================================================
-- Inventário do Almoxarifado — Contagem Cega
--
-- Substitui o protótipo em useState de ContagemAlmox.tsx por um fluxo real.
-- Separado do inventário de EQUIPAMENTOS (sessoes_contagem/itens_contagem),
-- que continua intocado — domínio, FK e regra de acesso são diferentes.
--
-- Decisões que o schema sustenta:
--  • Contagem cega: quem conta não vê o saldo; saldo_sistema fica na linha,
--    mas a tela de contagem não o exibe e a folha impressa não o imprime.
--  • saldo_sistema é CONGELADO na abertura e o ajuste aplica DELTA
--    (contada − congelado), preservando movimentações ocorridas no meio.
--  • Qualquer um da equipe conta (UPDATE liberado a vendedor+);
--    só gestão processa e mexe no estoque (RPC com compras_pode_gerenciar).
--  • processado por item = idempotência: reprocessar não reaplica ajuste.
-- =====================================================================

-- =========================
-- 1. TABELAS
-- =========================
CREATE TABLE IF NOT EXISTS public.almox_contagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  tipo text NOT NULL DEFAULT 'TODOS' CHECK (tipo IN ('PATRIMONIAL','PECA','CONSUMIVEL','TODOS')),
  grupo text,
  incluir_zerados boolean NOT NULL DEFAULT false,
  -- status enxuto: "em contagem" é derivado do progresso na UI, o que evita
  -- exigir UPDATE no cabeçalho por quem só está contando.
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','processada','cancelada')),
  observacoes text,
  processado_por uuid,
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.almox_contagem_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contagem_id uuid NOT NULL REFERENCES public.almox_contagens(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  item_id uuid NOT NULL REFERENCES public.almox_catalogo_itens(id),
  -- snapshot: o catálogo pode mudar entre a contagem e a auditoria dela
  sku text,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'UN',
  grupo text,
  saldo_sistema numeric NOT NULL DEFAULT 0,
  quantidade_contada numeric,           -- NULL = ainda não contado
  observacao text,
  contado_em timestamptz,
  contado_por uuid,
  acao text CHECK (acao IN ('AJUSTAR','IGNORAR')),
  justificativa text,
  processado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  UNIQUE (contagem_id, item_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_almox_contagens_numero ON public.almox_contagens(loja_id, numero);
CREATE INDEX IF NOT EXISTS idx_almox_contagens_loja ON public.almox_contagens(loja_id);
CREATE INDEX IF NOT EXISTS idx_almox_contagem_itens_contagem ON public.almox_contagem_itens(contagem_id);
CREATE INDEX IF NOT EXISTS idx_almox_contagem_itens_item ON public.almox_contagem_itens(item_id);

-- Numeração CNT-000001 por loja (reusa o trigger genérico do módulo)
DROP TRIGGER IF EXISTS trg_num_contagem ON public.almox_contagens;
CREATE TRIGGER trg_num_contagem BEFORE INSERT ON public.almox_contagens
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_compras('CNT');

-- =========================
-- 2. updated_at + RLS + camada demo
-- =========================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['almox_contagens','almox_contagem_itens'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- SELECT: quem enxerga o módulo na loja
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
      ))$p$, t, t);

    -- WRITE: vendedor TAMBÉM escreve — é quem conta. Diferente do resto do
    -- módulo (gestor+), porque contar não altera estoque; o ajuste é a RPC.
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
      ))
      WITH CHECK (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
      ))$p$, t, t);

    -- Camada demo read-only (obrigatória em toda tabela nova)
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_ins" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_ins" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_upd" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_upd" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_del" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_del" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_demo_readonly ON public.%I', t);
    EXECUTE format($trg$CREATE TRIGGER trg_demo_readonly BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_demo()$trg$, t);
  END LOOP;
END $$;

-- =========================
-- 3. RPC — abrir contagem (materializa itens com saldo congelado)
-- =========================
CREATE OR REPLACE FUNCTION public.abrir_contagem_almox(
  p_loja_id uuid,
  p_tipo text DEFAULT 'TODOS',
  p_grupo text DEFAULT NULL,
  p_incluir_zerados boolean DEFAULT false,
  p_observacoes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_qtd integer;
BEGIN
  IF NOT public.compras_pode_gerenciar(p_loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para abrir contagem nesta loja';
  END IF;

  INSERT INTO public.almox_contagens (loja_id, tipo, grupo, incluir_zerados, observacoes, status)
    VALUES (p_loja_id, COALESCE(p_tipo,'TODOS'), NULLIF(btrim(COALESCE(p_grupo,'')),''), COALESCE(p_incluir_zerados,false), p_observacoes, 'aberta')
    RETURNING id INTO v_id;

  -- snapshot do catálogo + saldo congelado no momento da abertura
  INSERT INTO public.almox_contagem_itens (contagem_id, loja_id, item_id, sku, descricao, unidade, grupo, saldo_sistema)
    SELECT v_id, p_loja_id, ci.id, ci.sku, ci.descricao, ci.unidade, ci.grupo, COALESCE(e.saldo, 0)
      FROM public.almox_catalogo_itens ci
      LEFT JOIN public.almox_estoque e ON e.item_id = ci.id AND e.loja_id = p_loja_id
     WHERE ci.ativo
       AND (COALESCE(p_tipo,'TODOS') = 'TODOS' OR ci.tipo = p_tipo)
       AND (NULLIF(btrim(COALESCE(p_grupo,'')),'') IS NULL OR ci.grupo = p_grupo)
       AND (COALESCE(p_incluir_zerados,false) OR COALESCE(e.saldo, 0) <> 0);

  SELECT count(*) INTO v_qtd FROM public.almox_contagem_itens WHERE contagem_id = v_id;
  IF v_qtd = 0 THEN
    RAISE EXCEPTION 'Nenhum item do catálogo atende a esses filtros';
  END IF;

  RETURN v_id;
END; $$;

-- =========================
-- 4. RPC — processar contagem (transacional + idempotente)
-- =========================
CREATE OR REPLACE FUNCTION public.processar_contagem_almox(p_contagem_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cont public.almox_contagens; v_item record;
  v_delta numeric; v_controle text; v_aplicados integer := 0;
BEGIN
  SELECT * INTO v_cont FROM public.almox_contagens WHERE id = p_contagem_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contagem não encontrada'; END IF;
  IF NOT public.compras_pode_gerenciar(v_cont.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para processar contagem nesta loja';
  END IF;
  IF v_cont.status <> 'aberta' THEN
    RAISE EXCEPTION 'Contagem já está %', v_cont.status;
  END IF;

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

    -- delta zero não é erro: só não gera movimento (ajustar_saldo_estoque
    -- lançaria exceção nesse caso, por isso o ajuste é feito aqui).
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

  RETURN v_aplicados;
END; $$;

-- =========================
-- 5. RPC — cancelar contagem
-- =========================
CREATE OR REPLACE FUNCTION public.cancelar_contagem_almox(p_contagem_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cont public.almox_contagens;
BEGIN
  SELECT * INTO v_cont FROM public.almox_contagens WHERE id = p_contagem_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contagem não encontrada'; END IF;
  IF NOT public.compras_pode_gerenciar(v_cont.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar contagem nesta loja';
  END IF;
  IF v_cont.status = 'processada' THEN
    RAISE EXCEPTION 'Contagem já processada não pode ser cancelada';
  END IF;
  UPDATE public.almox_contagens SET status = 'cancelada' WHERE id = p_contagem_id;
END; $$;

-- =========================
-- 6. Permissões
-- =========================
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.abrir_contagem_almox(uuid, text, text, boolean, text)',
    'public.processar_contagem_almox(uuid)',
    'public.cancelar_contagem_almox(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

COMMENT ON TABLE public.almox_contagens IS
  'Sessões de contagem cega do almoxarifado. Separado de sessoes_contagem, que é o inventário de equipamentos.';
COMMENT ON COLUMN public.almox_contagem_itens.saldo_sistema IS
  'Saldo congelado na abertura. O ajuste aplica (quantidade_contada - saldo_sistema) como delta, preservando movimentações ocorridas durante a contagem.';
