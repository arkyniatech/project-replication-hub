-- ============================================================================
-- Job diário de RH (pg_cron) — atualiza status de férias + gera alertas.
-- Agendar (fora da migration, uma vez, já com pg_cron habilitado):
--   select cron.schedule('rh-job-diario','0 6 * * *', $$select public.job_rh_diario()$$);
-- ============================================================================

-- Recalcula o status dos períodos de férias pela data corrente
-- (só os estados automáticos; não mexe em gozado/pago/programado/etc.)
CREATE OR REPLACE FUNCTION public.atualizar_status_ferias() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.ferias_periodos SET status = CASE
    WHEN current_date <= aquisicao_fim THEN 'em_aquisicao'
    WHEN current_date <  concessivo_fim THEN 'adquirido'
    ELSE 'vencido'
  END
  WHERE status IN ('em_aquisicao','adquirido','vencido');
$$;

-- Job diário: 1) atualiza status de férias  2) gera as notificações. Retorna nº de alertas não lidos.
CREATE OR REPLACE FUNCTION public.job_rh_diario() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.atualizar_status_ferias();
  RETURN public.gerar_notificacoes_rh();
END $$;
