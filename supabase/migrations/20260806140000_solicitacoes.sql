-- ============================================================================
-- Bloco 7 — Solicitações & Aprovações
-- rh_solicitacoes + rh_aprovacoes (com CHECK: reprovação exige motivo, no banco)
-- + trigger que atualiza o status da solicitação na decisão.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rh_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN (
    'ferias','ajuste_ponto','atualizacao_cadastral','beneficio','documento','transferencia','desligamento','outro')),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  titulo text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_aprovacao','aprovada','reprovada','cancelada')),
  referencia_id uuid,
  solicitado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_solic_pessoa ON public.rh_solicitacoes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_solic_loja ON public.rh_solicitacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_solic_status ON public.rh_solicitacoes(status);
DROP TRIGGER IF EXISTS trg_solic_updated_at ON public.rh_solicitacoes;
CREATE TRIGGER trg_solic_updated_at BEFORE UPDATE ON public.rh_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.rh_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.rh_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.rh_solicitacoes(id) ON DELETE CASCADE,
  etapa int NOT NULL DEFAULT 1,
  papel_exigido text,
  aprovador_id uuid,
  decisao text NOT NULL CHECK (decisao IN ('aprovado','reprovado')),
  motivo text,
  decidido_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT motivo_obrigatorio_em_reprovacao
    CHECK (decisao <> 'reprovado' OR (motivo IS NOT NULL AND length(trim(motivo)) > 0))
);
CREATE INDEX IF NOT EXISTS idx_aprov_solic ON public.rh_aprovacoes(solicitacao_id);
ALTER TABLE public.rh_aprovacoes ENABLE ROW LEVEL SECURITY;

-- decisão atualiza o status da solicitação
CREATE OR REPLACE FUNCTION public.trg_aprovacao_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.rh_solicitacoes
    SET status = CASE WHEN NEW.decisao = 'aprovado' THEN 'aprovada' ELSE 'reprovada' END,
        updated_at = now()
    WHERE id = NEW.solicitacao_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_aprovacao_status ON public.rh_aprovacoes;
CREATE TRIGGER trg_aprovacao_status AFTER INSERT ON public.rh_aprovacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_aprovacao_status();

-- ---------- RLS ----------
-- solicitações: RH por loja + colaborador (cria/vê a própria)
DROP POLICY IF EXISTS "solic_select" ON public.rh_solicitacoes;
CREATE POLICY "solic_select" ON public.rh_solicitacoes FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "solic_write" ON public.rh_solicitacoes;
CREATE POLICY "solic_write" ON public.rh_solicitacoes FOR ALL TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);

-- aprovações: só RH/gestão decide
DROP POLICY IF EXISTS "aprov_select" ON public.rh_aprovacoes;
CREATE POLICY "aprov_select" ON public.rh_aprovacoes FOR SELECT TO authenticated
USING (public.is_active(auth.uid()) AND (
  public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)));
DROP POLICY IF EXISTS "aprov_write" ON public.rh_aprovacoes;
CREATE POLICY "aprov_write" ON public.rh_aprovacoes FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role));
