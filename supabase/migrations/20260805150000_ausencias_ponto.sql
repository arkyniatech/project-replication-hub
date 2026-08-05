-- ============================================================================
-- Bloco 3 — Ausências & Ponto
-- ausencias (com tipos) + ponto_lancamentos (manual) + RLS +
-- vínculo automático: falta injustificada reduz dias_direito de férias (CLT art.130).
-- ============================================================================

-- ---------- ausencias ----------
CREATE TABLE IF NOT EXISTS public.ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  tipo text NOT NULL CHECK (tipo IN (
    'falta_injustificada','falta_justificada','atestado',
    'licenca_maternidade','licenca_paternidade','acidente_trabalho',
    'afastamento_inss','suspensao','outro')),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  retorno_previsto date,
  retorno_efetivo date,
  dias int GENERATED ALWAYS AS (data_fim - data_inicio + 1) STORED,
  documento_id uuid,
  justificativa text,
  status text NOT NULL DEFAULT 'registrada'
    CHECK (status IN ('registrada','em_afastamento','encerrada','cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CHECK (data_fim >= data_inicio)
);
CREATE INDEX IF NOT EXISTS idx_ausencias_pessoa ON public.ausencias(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_ausencias_loja ON public.ausencias(loja_id);
DROP TRIGGER IF EXISTS trg_ausencias_updated_at ON public.ausencias;
CREATE TRIGGER trg_ausencias_updated_at BEFORE UPDATE ON public.ausencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;

-- ---------- ponto_lancamentos (manual) ----------
CREATE TABLE IF NOT EXISTS public.ponto_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  data date NOT NULL,
  entrada time,
  saida time,
  intervalo_min int NOT NULL DEFAULT 0,
  horas_trabalhadas numeric,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual')),
  justificativa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (pessoa_id, data)
);
CREATE INDEX IF NOT EXISTS idx_ponto_pessoa ON public.ponto_lancamentos(pessoa_id);
ALTER TABLE public.ponto_lancamentos ENABLE ROW LEVEL SECURITY;

-- ---------- RLS (RH por loja; colaborador vê o próprio) ----------
DROP POLICY IF EXISTS "ausencias_select" ON public.ausencias;
CREATE POLICY "ausencias_select" ON public.ausencias FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "ausencias_write" ON public.ausencias;
CREATE POLICY "ausencias_write" ON public.ausencias FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "ponto_select" ON public.ponto_lancamentos;
CREATE POLICY "ponto_select" ON public.ponto_lancamentos FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "ponto_write" ON public.ponto_lancamentos;
CREATE POLICY "ponto_write" ON public.ponto_lancamentos FOR ALL TO authenticated
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

-- ---------- vínculo com Férias: falta injustificada -> dias_direito (CLT art. 130) ----------
CREATE OR REPLACE FUNCTION public.recompute_ferias_faltas(p_pessoa_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  fp record;
  v_faltas int;
BEGIN
  FOR fp IN
    SELECT id, aquisicao_inicio, aquisicao_fim
    FROM public.ferias_periodos
    WHERE pessoa_id = p_pessoa_id AND status NOT IN ('gozado','pago')
  LOOP
    -- soma os dias de falta injustificada que caem dentro da janela aquisitiva
    SELECT COALESCE(SUM(
             GREATEST(0, LEAST(a.data_fim, fp.aquisicao_fim) - GREATEST(a.data_inicio, fp.aquisicao_inicio) + 1)
           ), 0)
      INTO v_faltas
    FROM public.ausencias a
    WHERE a.pessoa_id = p_pessoa_id
      AND a.tipo = 'falta_injustificada'
      AND a.status <> 'cancelada'
      AND a.data_inicio <= fp.aquisicao_fim
      AND a.data_fim   >= fp.aquisicao_inicio;

    UPDATE public.ferias_periodos
      SET faltas_injustificadas = v_faltas,
          dias_direito = CASE
            WHEN v_faltas <= 5  THEN 30
            WHEN v_faltas <= 14 THEN 24
            WHEN v_faltas <= 23 THEN 18
            WHEN v_faltas <= 32 THEN 12
            ELSE 0
          END
      WHERE id = fp.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_ausencia_ferias() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_ferias_faltas(COALESCE(NEW.pessoa_id, OLD.pessoa_id));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_ausencia_ferias ON public.ausencias;
CREATE TRIGGER trg_ausencia_ferias AFTER INSERT OR UPDATE OR DELETE ON public.ausencias
  FOR EACH ROW EXECUTE FUNCTION public.trg_ausencia_ferias();
