-- ============================================================================
-- Bloco 2 — Férias (estrutura)
-- ferias_periodos (períodos aquisitivos) + ferias_agendamentos + RLS +
-- função que gera os períodos aquisitivos automaticamente + trigger no vínculo.
-- Convenção C3: tabelas de evento carregam o próprio escopo (empresa/loja/cc).
-- ============================================================================

-- ---------- ferias_periodos ----------
CREATE TABLE IF NOT EXISTS public.ferias_periodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  aquisicao_inicio date NOT NULL,
  aquisicao_fim date NOT NULL,
  concessivo_fim date NOT NULL,
  dias_direito int NOT NULL DEFAULT 30,
  faltas_injustificadas int NOT NULL DEFAULT 0,
  dias_gozados int NOT NULL DEFAULT 0,
  dias_vendidos_abono int NOT NULL DEFAULT 0,
  dias_saldo int GENERATED ALWAYS AS (dias_direito - dias_gozados - dias_vendidos_abono) STORED,
  status text NOT NULL DEFAULT 'em_aquisicao'
    CHECK (status IN ('em_aquisicao','adquirido','programado','parcialmente_gozado','gozado','pago','vencido','dobro_devido')),
  pagamento_dobro_devido boolean NOT NULL DEFAULT false,
  valor_pago numeric,
  antecipou_13 boolean NOT NULL DEFAULT false,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pessoa_id, aquisicao_inicio)
);
CREATE INDEX IF NOT EXISTS idx_ferias_periodos_pessoa ON public.ferias_periodos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_ferias_periodos_loja ON public.ferias_periodos(loja_id);
CREATE INDEX IF NOT EXISTS idx_ferias_periodos_status ON public.ferias_periodos(status);
DROP TRIGGER IF EXISTS trg_ferias_periodos_updated_at ON public.ferias_periodos;
CREATE TRIGGER trg_ferias_periodos_updated_at BEFORE UPDATE ON public.ferias_periodos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.ferias_periodos ENABLE ROW LEVEL SECURITY;

-- ---------- ferias_agendamentos ----------
CREATE TABLE IF NOT EXISTS public.ferias_agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id uuid NOT NULL REFERENCES public.ferias_periodos(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias int NOT NULL,
  abono_pecuniario_dias int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'solicitado'
    CHECK (status IN ('solicitado','aprovado','reprovado','cancelado','gozado')),
  aprovado_por uuid,
  aprovado_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_ferias_agend_periodo ON public.ferias_agendamentos(periodo_id);
CREATE INDEX IF NOT EXISTS idx_ferias_agend_pessoa ON public.ferias_agendamentos(pessoa_id);
ALTER TABLE public.ferias_agendamentos ENABLE ROW LEVEL SECURITY;

-- ---------- RLS (RH por loja; colaborador vê o próprio) ----------
-- helper de escopo repetido inline pra manter tudo explícito.
DROP POLICY IF EXISTS "ferias_periodos_select" ON public.ferias_periodos;
CREATE POLICY "ferias_periodos_select" ON public.ferias_periodos FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "ferias_periodos_write" ON public.ferias_periodos;
CREATE POLICY "ferias_periodos_write" ON public.ferias_periodos FOR ALL TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
)
WITH CHECK (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "ferias_agend_select" ON public.ferias_agendamentos;
CREATE POLICY "ferias_agend_select" ON public.ferias_agendamentos FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "ferias_agend_write" ON public.ferias_agendamentos;
CREATE POLICY "ferias_agend_write" ON public.ferias_agendamentos FOR ALL TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
)
WITH CHECK (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);

-- ---------- função: gera períodos aquisitivos da admissão até hoje ----------
CREATE OR REPLACE FUNCTION public.gerar_ferias_periodos(p_pessoa_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v record;
  n int := 0;
  ini date; fim date; conc date;
BEGIN
  SELECT pv.id AS vinculo_id, pv.empresa_id, pv.loja_id, pv.cc_id, pv.data_admissao
    INTO v
  FROM public.pessoa_vinculo pv
  WHERE pv.pessoa_id = p_pessoa_id AND pv.vigencia_fim IS NULL
  LIMIT 1;

  IF v.data_admissao IS NULL OR v.loja_id IS NULL THEN RETURN; END IF;

  LOOP
    ini := (v.data_admissao + (n || ' years')::interval)::date;
    EXIT WHEN ini > current_date;
    fim  := (v.data_admissao + ((n + 1) || ' years')::interval)::date - 1;
    conc := (v.data_admissao + ((n + 2) || ' years')::interval)::date;
    INSERT INTO public.ferias_periodos
      (pessoa_id, vinculo_id, empresa_id, loja_id, cc_id, aquisicao_inicio, aquisicao_fim, concessivo_fim, status)
    VALUES (p_pessoa_id, v.vinculo_id, v.empresa_id, v.loja_id, v.cc_id, ini, fim, conc,
      CASE
        WHEN current_date <= fim  THEN 'em_aquisicao'
        WHEN current_date <  conc THEN 'adquirido'
        ELSE 'vencido'
      END)
    ON CONFLICT (pessoa_id, aquisicao_inicio) DO NOTHING;
    n := n + 1;
  END LOOP;
END $$;

-- ---------- trigger: ao criar/atualizar vínculo, garante os períodos ----------
CREATE OR REPLACE FUNCTION public.trg_ferias_do_vinculo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.gerar_ferias_periodos(NEW.pessoa_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ferias_vinculo ON public.pessoa_vinculo;
CREATE TRIGGER trg_ferias_vinculo AFTER INSERT ON public.pessoa_vinculo
  FOR EACH ROW EXECUTE FUNCTION public.trg_ferias_do_vinculo();
