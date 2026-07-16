-- ============================================================
-- RPC gerar_numero_os — ausente no banco de produção
-- ============================================================
-- A versão original (migration 20251013215523, linhagem 2025) dependia da
-- tabela contadores_documentos, que também não existe na linhagem 2026.
-- Esta versão é autossuficiente: numera pelo maior número já usado na loja.
-- Usada pelo createOS e pelo abrirOSManutencao (ticket #48 — equipamento em
-- manutenção agora abre OS na Área Amarela automaticamente).

CREATE OR REPLACE FUNCTION public.gerar_numero_os(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prox integer;
BEGIN
  -- Acesso: loja vinculada OU admin (master herda via has_role)
  IF NOT EXISTS (
    SELECT 1 FROM user_lojas_permitidas
    WHERE user_id = auth.uid() AND loja_id = p_loja_id
  ) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para gerar OS nesta loja';
  END IF;

  SELECT COALESCE(MAX(NULLIF(regexp_replace(numero, '\D', '', 'g'), '')::integer), 0) + 1
    INTO v_prox
  FROM ordens_servico
  WHERE loja_id = p_loja_id;

  RETURN 'OS-' || LPAD(v_prox::text, 6, '0');
END;
$$;
