
-- ============================================
-- 1. SESSOES_CONTAGEM
-- ============================================
CREATE TABLE public.sessoes_contagem (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  display_no text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ABERTA',
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacao text,
  criada_por uuid NOT NULL,
  finalizada_em timestamptz,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sessoes_contagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessoes visiveis para usuarios da loja"
  ON public.sessoes_contagem FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (is_active(auth.uid()) AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Gestao pode criar sessoes"
  ON public.sessoes_contagem FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Gestao pode atualizar sessoes"
  ON public.sessoes_contagem FOR UPDATE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Admin pode deletar sessoes"
  ON public.sessoes_contagem FOR DELETE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_sessoes_contagem_updated_at
  BEFORE UPDATE ON public.sessoes_contagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. ITENS_CONTAGEM
-- ============================================
CREATE TABLE public.itens_contagem (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id uuid NOT NULL REFERENCES public.sessoes_contagem(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  tipo text NOT NULL DEFAULT 'SALDO',
  codigo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  grupo_nome text NOT NULL DEFAULT '',
  modelo_nome text NOT NULL DEFAULT '',
  qtd_contada integer,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.itens_contagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens visiveis para usuarios da loja"
  ON public.itens_contagem FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (is_active(auth.uid()) AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Gestao pode criar itens"
  ON public.itens_contagem FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Gestao pode atualizar itens"
  ON public.itens_contagem FOR UPDATE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Admin pode deletar itens"
  ON public.itens_contagem FOR DELETE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_itens_contagem_updated_at
  BEFORE UPDATE ON public.itens_contagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. DIVERGENCIAS_CONTAGEM
-- ============================================
CREATE TABLE public.divergencias_contagem (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id uuid NOT NULL REFERENCES public.sessoes_contagem(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.itens_contagem(id) ON DELETE CASCADE,
  qtd_sistema integer NOT NULL DEFAULT 0,
  qtd_contada integer NOT NULL DEFAULT 0,
  delta integer NOT NULL DEFAULT 0,
  perc numeric NOT NULL DEFAULT 0,
  justificativa text,
  acao text,
  status text NOT NULL DEFAULT 'PENDENTE',
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  exige_aprovacao boolean NOT NULL DEFAULT false,
  aprovacao jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.divergencias_contagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Divergencias visiveis para usuarios da loja"
  ON public.divergencias_contagem FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (is_active(auth.uid()) AND sessao_id IN (
      SELECT id FROM public.sessoes_contagem WHERE loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Gestao pode criar divergencias"
  ON public.divergencias_contagem FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Gestao pode atualizar divergencias"
  ON public.divergencias_contagem FOR UPDATE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Admin pode deletar divergencias"
  ON public.divergencias_contagem FOR DELETE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_divergencias_contagem_updated_at
  BEFORE UPDATE ON public.divergencias_contagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. AJUSTES_CONTAGEM
-- ============================================
CREATE TABLE public.ajustes_contagem (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id uuid NOT NULL REFERENCES public.sessoes_contagem(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.itens_contagem(id) ON DELETE CASCADE,
  delta integer NOT NULL DEFAULT 0,
  motivo text,
  status text NOT NULL DEFAULT 'PROPOSTO',
  criado_por uuid NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ajustes_contagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ajustes visiveis para usuarios da loja"
  ON public.ajustes_contagem FOR SELECT
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (is_active(auth.uid()) AND sessao_id IN (
      SELECT id FROM public.sessoes_contagem WHERE loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "Gestao pode criar ajustes"
  ON public.ajustes_contagem FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Gestao pode atualizar ajustes"
  ON public.ajustes_contagem FOR UPDATE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  );

CREATE POLICY "Admin pode deletar ajustes"
  ON public.ajustes_contagem FOR DELETE
  TO authenticated
  USING (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_ajustes_contagem_updated_at
  BEFORE UPDATE ON public.ajustes_contagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
;
