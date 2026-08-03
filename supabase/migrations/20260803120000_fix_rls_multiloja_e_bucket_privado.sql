-- ============================================================================
-- Isolamento multi-loja (multi-franqueado) + bucket privado
-- Refs auditoria: A1 (pessoas SELECT), A2 (pessoas INSERT/UPDATE/DELETE),
--                 A3 (centros_custo SELECT + FK), A12 (bucket contratos-anexos)
--
-- Padrão adotado (o mesmo já usado em produtividade_manutencao / ordens_servico
-- na migration 20260613181919):
--   is_master -> superusuário da plataforma (bypass global)
--   admin     -> mantido GLOBAL por ora. Ver A11/G10: decidir se 'admin' vira
--                papel exclusivo da plataforma OU recebe escopo por grupo. Quando
--                decidido, mover 'admin' para DENTRO do bloco escopado por loja.
--                (Só faça isso APÓS auditar quem tem 'admin' — G9 — para não
--                 deixar o admin da plataforma sem acesso.)
--   rh/gestor -> escopados por loja via user_lojas_permitidas (papéis de franqueado)
--
-- Este script NÃO torna pessoas.loja_id NOT NULL (exige backfill/decisão do RH — G8).
-- Registros com loja_id NULL seguem visíveis a master/admin e invisíveis a
-- rh/gestor (fail-closed), sem quebrar ninguém.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A1 — pessoas SELECT: escopo por loja para rh/gestor
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Pessoas visíveis para Admin e RH" ON public.pessoas;
DROP POLICY IF EXISTS "Pessoas visíveis por loja permitida" ON public.pessoas;
CREATE POLICY "Pessoas visíveis por loja permitida"
ON public.pessoas FOR SELECT TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
);

-- ----------------------------------------------------------------------------
-- A2 — pessoas INSERT/UPDATE/DELETE: escopo por loja para rh
-- (gestor não escrevia pessoas antes; mantido assim. admin/master seguem globais.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin e RH podem inserir pessoas" ON public.pessoas;
CREATE POLICY "Admin e RH podem inserir pessoas"
ON public.pessoas FOR INSERT TO authenticated
WITH CHECK (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'rh'::app_role)
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Admin e RH podem atualizar pessoas" ON public.pessoas;
CREATE POLICY "Admin e RH podem atualizar pessoas"
ON public.pessoas FOR UPDATE TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'rh'::app_role)
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
)
WITH CHECK (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'rh'::app_role)
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Admin e RH podem deletar pessoas" ON public.pessoas;
CREATE POLICY "Admin e RH podem deletar pessoas"
ON public.pessoas FOR DELETE TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'rh'::app_role)
      AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
);

-- ----------------------------------------------------------------------------
-- A3 — centros_custo SELECT: escopo por loja. Centro global (loja_id NULL) segue
-- visível a todos os papéis de gestão (é dado de referência compartilhado).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Centros de custo visíveis para Admin e RH" ON public.centros_custo;
DROP POLICY IF EXISTS "Centros de custo visíveis por loja permitida" ON public.centros_custo;
CREATE POLICY "Centros de custo visíveis por loja permitida"
ON public.centros_custo FOR SELECT TO authenticated
USING (
  is_active(auth.uid()) AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
      AND (
        loja_id IS NULL
        OR loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
      )
    )
  )
);

-- A3 — FK centros_custo.loja_id -> lojas.id (a coluna existia sem FK).
-- NOT VALID: não valida linhas legadas (evita falha na aplicação), passa a valer
-- para novas escritas. Rodar VALIDATE CONSTRAINT depois de conciliar os dados.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'centros_custo_loja_id_fkey'
      AND table_name = 'centros_custo'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.centros_custo
      ADD CONSTRAINT centros_custo_loja_id_fkey
      FOREIGN KEY (loja_id) REFERENCES public.lojas(id) NOT VALID;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- A12 — bucket contratos-anexos deixa de ser público.
-- O download no cliente usa createSignedUrl (src/components/contratos/AnexosTab.tsx),
-- então URLs assinadas continuam funcionando com o bucket privado.
-- As policies de RLS por loja já foram endurecidas em migrations de jun/2026.
-- ----------------------------------------------------------------------------
UPDATE storage.buckets
SET public = false,
    file_size_limit = 20971520  -- 20 MB
WHERE id = 'contratos-anexos';
