-- ============================================================================
-- Bloco 9 — Alertas / Notificações de RH
-- rh_notificacoes + função gerar_notificacoes_rh() (idempotente).
-- Sem pg_cron ainda: a geração é chamada sob demanda (botão "Atualizar alertas").
-- Quando pg_cron for habilitado, agendar:
--   select cron.schedule('rh-alertas-diario','0 6 * * *',$$select public.gerar_notificacoes_rh()$$);
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rh_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id),
  pessoa_id uuid REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  entidade text,
  entidade_id uuid,
  severidade text NOT NULL DEFAULT 'info' CHECK (severidade IN ('info','alerta','critico')),
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, entidade_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_loja ON public.rh_notificacoes(loja_id);
ALTER TABLE public.rh_notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON public.rh_notificacoes;
CREATE POLICY "notif_select" ON public.rh_notificacoes FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND (loja_id IS NULL OR loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())))
  )
);
DROP POLICY IF EXISTS "notif_write" ON public.rh_notificacoes;
CREATE POLICY "notif_write" ON public.rh_notificacoes FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role));

CREATE OR REPLACE FUNCTION public.gerar_notificacoes_rh() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- férias vencidas (dobro devido)
  INSERT INTO public.rh_notificacoes (loja_id, pessoa_id, tipo, titulo, mensagem, entidade, entidade_id, severidade)
  SELECT fp.loja_id, fp.pessoa_id, 'ferias_vencida', 'Férias vencidas',
         p.nome || ' — período de ' || to_char(fp.aquisicao_inicio,'DD/MM/YYYY') || ' vencido (risco de pagamento em dobro)',
         'ferias_periodo', fp.id, 'critico'
  FROM public.ferias_periodos fp JOIN public.pessoas p ON p.id = fp.pessoa_id
  WHERE fp.status IN ('vencido','dobro_devido')
  ON CONFLICT (tipo, entidade_id) DO NOTHING;

  -- férias a vencer em <= 90 dias
  INSERT INTO public.rh_notificacoes (loja_id, pessoa_id, tipo, titulo, mensagem, entidade, entidade_id, severidade)
  SELECT fp.loja_id, fp.pessoa_id, 'ferias_a_vencer', 'Férias a vencer',
         p.nome || ' — gozar até ' || to_char(fp.concessivo_fim,'DD/MM/YYYY'),
         'ferias_periodo', fp.id, 'alerta'
  FROM public.ferias_periodos fp JOIN public.pessoas p ON p.id = fp.pessoa_id
  WHERE fp.status = 'adquirido' AND fp.concessivo_fim <= current_date + 90
  ON CONFLICT (tipo, entidade_id) DO NOTHING;

  -- documentos vencendo/vencidos em <= 30 dias
  INSERT INTO public.rh_notificacoes (loja_id, pessoa_id, tipo, titulo, mensagem, entidade, entidade_id, severidade)
  SELECT d.loja_id, d.pessoa_id, 'documento_vencendo', 'Documento vencendo',
         p.nome || ' — ' || COALESCE(t.nome,'documento') || ' vence em ' || to_char(d.validade_ate,'DD/MM/YYYY'),
         'rh_documento', d.id, CASE WHEN d.validade_ate < current_date THEN 'critico' ELSE 'alerta' END
  FROM public.rh_documentos d JOIN public.pessoas p ON p.id = d.pessoa_id
  LEFT JOIN public.rh_tipos_documento t ON t.id = d.tipo_documento_id
  WHERE d.validade_ate IS NOT NULL AND d.validade_ate <= current_date + 30 AND d.status <> 'rejeitado'
  ON CONFLICT (tipo, entidade_id) DO NOTHING;

  RETURN (SELECT count(*)::int FROM public.rh_notificacoes WHERE lida_em IS NULL);
END $$;
