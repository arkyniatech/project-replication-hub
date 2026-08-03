-- ============================================================================
-- A9: escopar grupos_lojas (estava USING(true) — todo autenticado listava os
--     grupos de TODOS os franqueados) + B2 defensivo: reasseverar RLS ligada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A9 — grupos_lojas SELECT: master/admin veem todos; os demais veem apenas os
-- grupos a que estão vinculados (via user_grupos direto OU via loja permitida).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Grupos visíveis para autenticados" ON public.grupos_lojas;
DROP POLICY IF EXISTS "Grupos visíveis por vínculo" ON public.grupos_lojas;
CREATE POLICY "Grupos visíveis por vínculo"
ON public.grupos_lojas FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  -- vínculo direto usuário -> grupo
  OR id IN (SELECT grupo_id FROM public.user_grupos WHERE user_id = auth.uid())
  -- vínculo via loja permitida (lojas.grupo_id)
  OR id IN (
    SELECT l.grupo_id FROM public.lojas l
    WHERE l.grupo_id IS NOT NULL
      AND l.id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
  )
);

-- ----------------------------------------------------------------------------
-- B2 (defensivo) — reasseverar RLS ligada nas tabelas sensíveis. Idempotente:
-- se já estiver habilitada (o esperado, via 20260211183731/20260101043131) é no-op.
-- Rede de segurança contra 20260101043102_disable_rls_temp.sql, caso o estado
-- do banco vivo tenha divergido das migrations.
-- ----------------------------------------------------------------------------
ALTER TABLE public.pessoas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
