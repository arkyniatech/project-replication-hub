-- =========================
-- 1. Campos patrimoniais
-- =========================
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS valor_aquisicao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_aquisicao date,
  ADD COLUMN IF NOT EXISTS vida_util_meses integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS condicao text DEFAULT 'BOM',
  ADD COLUMN IF NOT EXISTS ano_fabricacao integer;

-- =========================
-- 2. Transferencias
-- =========================
CREATE TABLE IF NOT EXISTS public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL,
  origem_loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
  destino_loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'CRIADA' CHECK (status IN ('CRIADA','EM_TRANSITO','RECEBIDA','RECUSADA','CANCELADA')),
  motorista text,
  veiculo text,
  observacoes text,
  recusa jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transferencias visiveis para usuarios das lojas"
  ON public.transferencias FOR SELECT TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
    OR (is_active(auth.uid()) AND (
      origem_loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
      OR destino_loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
    ))
  );

CREATE POLICY "Staff pode criar transferencias"
  ON public.transferencias FOR INSERT TO authenticated
  WITH CHECK (
    is_active(auth.uid()) AND (
      is_master(auth.uid())
      OR has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'gestor'::app_role)
      OR has_role(auth.uid(),'vendedor'::app_role)
    ) AND (
      origem_loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Staff pode atualizar transferencias"
  ON public.transferencias FOR UPDATE TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
    OR (is_active(auth.uid()) AND (
      origem_loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
      OR destino_loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
    ))
  );

CREATE POLICY "Master/Admin pode deletar transferencias"
  ON public.transferencias FOR DELETE TO authenticated
  USING (is_master(auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_transferencias_updated_at
  BEFORE UPDATE ON public.transferencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3. Transferencia itens
-- =========================
CREATE TABLE IF NOT EXISTS public.transferencia_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transferencia_id uuid NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('SERIALIZADO','SALDO')),
  codigo_interno text,
  modelo_id uuid REFERENCES public.modelos_equipamentos(id),
  grupo_id uuid REFERENCES public.grupos_equipamentos(id),
  descricao text,
  serie text,
  quantidade integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transferencia_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens visiveis com a transferencia"
  ON public.transferencia_itens FOR SELECT TO authenticated
  USING (
    transferencia_id IN (SELECT id FROM public.transferencias)
  );

CREATE POLICY "Staff pode criar itens de transferencia"
  ON public.transferencia_itens FOR INSERT TO authenticated
  WITH CHECK (
    is_active(auth.uid()) AND (
      is_master(auth.uid())
      OR has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'gestor'::app_role)
      OR has_role(auth.uid(),'vendedor'::app_role)
    )
  );

CREATE POLICY "Staff pode atualizar itens"
  ON public.transferencia_itens FOR UPDATE TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'gestor'::app_role)
    OR has_role(auth.uid(),'vendedor'::app_role)
  );

CREATE POLICY "Master/Admin pode deletar itens"
  ON public.transferencia_itens FOR DELETE TO authenticated
  USING (is_master(auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

-- =========================
-- 4. Logs
-- =========================
CREATE TABLE IF NOT EXISTS public.transferencia_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transferencia_id uuid NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
  por_usuario_id uuid REFERENCES auth.users(id),
  por_usuario_nome text,
  acao text NOT NULL,
  detalhe text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transferencia_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Logs visiveis para autenticados"
  ON public.transferencia_logs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff pode inserir logs"
  ON public.transferencia_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================
-- 5. View depreciacao
-- =========================
CREATE OR REPLACE VIEW public.equipamentos_depreciacao AS
SELECT
  e.id,
  e.codigo_interno,
  COALESCE(m.nome_comercial,'') AS modelo_nome,
  COALESCE(g.nome,'') AS grupo_nome,
  COALESCE(e.valor_aquisicao,0) AS valor_aquisicao,
  e.data_aquisicao,
  COALESCE(e.vida_util_meses,60) AS vida_util_meses,
  CASE
    WHEN e.data_aquisicao IS NULL THEN 0
    ELSE GREATEST(0, EXTRACT(YEAR FROM age(now(), e.data_aquisicao))*12 + EXTRACT(MONTH FROM age(now(), e.data_aquisicao)))::int
  END AS meses_uso,
  CASE
    WHEN COALESCE(e.vida_util_meses,0) > 0 THEN COALESCE(e.valor_aquisicao,0) / e.vida_util_meses
    ELSE 0
  END AS depreciacao_mensal,
  LEAST(
    COALESCE(e.valor_aquisicao,0),
    CASE
      WHEN e.data_aquisicao IS NULL OR COALESCE(e.vida_util_meses,0) = 0 THEN 0
      ELSE (COALESCE(e.valor_aquisicao,0) / e.vida_util_meses)
           * GREATEST(0, EXTRACT(YEAR FROM age(now(), e.data_aquisicao))*12 + EXTRACT(MONTH FROM age(now(), e.data_aquisicao)))
    END
  ) AS depreciacao_acumulada,
  GREATEST(
    0,
    COALESCE(e.valor_aquisicao,0) - LEAST(
      COALESCE(e.valor_aquisicao,0),
      CASE
        WHEN e.data_aquisicao IS NULL OR COALESCE(e.vida_util_meses,0) = 0 THEN 0
        ELSE (COALESCE(e.valor_aquisicao,0) / e.vida_util_meses)
             * GREATEST(0, EXTRACT(YEAR FROM age(now(), e.data_aquisicao))*12 + EXTRACT(MONTH FROM age(now(), e.data_aquisicao)))
      END
    )
  ) AS valor_contabil,
  0::numeric AS valor_residual,
  CASE
    WHEN COALESCE(e.valor_aquisicao,0) = 0 THEN 0
    ELSE LEAST(100, ROUND(
      (LEAST(
        COALESCE(e.valor_aquisicao,0),
        CASE
          WHEN e.data_aquisicao IS NULL OR COALESCE(e.vida_util_meses,0) = 0 THEN 0
          ELSE (COALESCE(e.valor_aquisicao,0) / e.vida_util_meses)
               * GREATEST(0, EXTRACT(YEAR FROM age(now(), e.data_aquisicao))*12 + EXTRACT(MONTH FROM age(now(), e.data_aquisicao)))
        END
      ) / e.valor_aquisicao) * 100, 2))
  END AS percentual_depreciado
FROM public.equipamentos e
LEFT JOIN public.modelos_equipamentos m ON m.id = e.modelo_id
LEFT JOIN public.grupos_equipamentos g ON g.id = e.grupo_id
WHERE e.ativo = true;

GRANT SELECT ON public.equipamentos_depreciacao TO authenticated;;
