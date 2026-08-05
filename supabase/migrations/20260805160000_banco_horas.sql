-- ============================================================================
-- Bloco 4 — Banco de Horas
-- banco_horas_movimentos (saldo corrente automático) + banco_horas_apuracoes.
-- Passivo conhecido: apuração 2x/ano paga o saldo não compensado em holerite.
-- ============================================================================

-- ---------- apurações (períodos de fechamento) ----------
CREATE TABLE IF NOT EXISTS public.banco_horas_apuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  competencia_pagamento text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','apurada','paga')),
  total_horas numeric,
  total_valor numeric,
  apurado_por uuid,
  apurado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banco_horas_apuracoes ENABLE ROW LEVEL SECURITY;

-- ---------- movimentos ----------
CREATE TABLE IF NOT EXISTS public.banco_horas_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  ocorrido_em date NOT NULL DEFAULT current_date,
  tipo text NOT NULL CHECK (tipo IN ('credito','debito','pagamento','expiracao')),
  horas numeric NOT NULL CHECK (horas >= 0),
  saldo_apos numeric,
  origem text NOT NULL DEFAULT 'lancamento_manual'
    CHECK (origem IN ('lancamento_manual','apuracao','compensacao')),
  apuracao_id uuid REFERENCES public.banco_horas_apuracoes(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_bh_mov_pessoa ON public.banco_horas_movimentos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_bh_mov_loja ON public.banco_horas_movimentos(loja_id);
ALTER TABLE public.banco_horas_movimentos ENABLE ROW LEVEL SECURITY;

-- saldo corrente automático (crédito soma, resto subtrai)
CREATE OR REPLACE FUNCTION public.bh_calc_saldo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE prev numeric; delta numeric;
BEGIN
  SELECT COALESCE(
    (SELECT saldo_apos FROM public.banco_horas_movimentos
     WHERE pessoa_id = NEW.pessoa_id
     ORDER BY ocorrido_em DESC, created_at DESC LIMIT 1), 0)
  INTO prev;
  delta := CASE WHEN NEW.tipo = 'credito' THEN NEW.horas ELSE -NEW.horas END;
  NEW.saldo_apos := prev + delta;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_bh_saldo ON public.banco_horas_movimentos;
CREATE TRIGGER trg_bh_saldo BEFORE INSERT ON public.banco_horas_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.bh_calc_saldo();

-- ---------- RLS (RH por loja; colaborador vê o próprio) ----------
DROP POLICY IF EXISTS "bh_mov_select" ON public.banco_horas_movimentos;
CREATE POLICY "bh_mov_select" ON public.banco_horas_movimentos FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "bh_mov_write" ON public.banco_horas_movimentos;
CREATE POLICY "bh_mov_write" ON public.banco_horas_movimentos FOR ALL TO authenticated
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

DROP POLICY IF EXISTS "bh_apur_select" ON public.banco_horas_apuracoes;
CREATE POLICY "bh_apur_select" ON public.banco_horas_apuracoes FOR SELECT TO authenticated
USING (public.is_active(auth.uid()) AND (
  public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)));
DROP POLICY IF EXISTS "bh_apur_write" ON public.banco_horas_apuracoes;
CREATE POLICY "bh_apur_write" ON public.banco_horas_apuracoes FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role));
