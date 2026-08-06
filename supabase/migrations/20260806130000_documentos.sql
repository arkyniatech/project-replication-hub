-- ============================================================================
-- Bloco 6 — Documentos de RH
-- rh_tipos_documento (com seed) + rh_documentos + RLS. Usa o bucket privado
-- 'rh-documentos' criado na Fundação (isolado por loja).
-- ============================================================================

-- ---------- tipos de documento ----------
CREATE TABLE IF NOT EXISTS public.rh_tipos_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,  -- null = global
  nome text NOT NULL,
  obrigatorio boolean NOT NULL DEFAULT false,
  exige_validade boolean NOT NULL DEFAULT false,
  processo text NOT NULL DEFAULT 'permanente'
    CHECK (processo IN ('admissao','ferias','afastamento','desligamento','permanente')),
  sensivel boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tipodoc_global ON public.rh_tipos_documento(nome) WHERE empresa_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tipodoc_empresa ON public.rh_tipos_documento(empresa_id, nome) WHERE empresa_id IS NOT NULL;
ALTER TABLE public.rh_tipos_documento ENABLE ROW LEVEL SECURITY;

INSERT INTO public.rh_tipos_documento (empresa_id, nome, obrigatorio, exige_validade, processo, sensivel)
SELECT NULL, v.nome, v.obrig, v.validade, v.processo, v.sensivel
FROM (VALUES
  ('RG', true, false, 'admissao', true),
  ('CPF', true, false, 'admissao', true),
  ('CTPS', true, false, 'admissao', true),
  ('Comprovante de residência', true, false, 'admissao', false),
  ('Título de eleitor', false, false, 'admissao', false),
  ('ASO admissional', true, true, 'admissao', true),
  ('ASO periódico', false, true, 'permanente', true),
  ('Contrato de trabalho', true, false, 'admissao', false),
  ('Atestado médico', false, true, 'afastamento', true),
  ('Termo de rescisão', false, false, 'desligamento', false)
) v(nome, obrig, validade, processo, sensivel)
WHERE NOT EXISTS (SELECT 1 FROM public.rh_tipos_documento t WHERE t.empresa_id IS NULL AND t.nome = v.nome);

DROP POLICY IF EXISTS "tipodoc_select" ON public.rh_tipos_documento;
CREATE POLICY "tipodoc_select" ON public.rh_tipos_documento FOR SELECT TO authenticated
USING (public.is_active(auth.uid()));
DROP POLICY IF EXISTS "tipodoc_write" ON public.rh_tipos_documento;
CREATE POLICY "tipodoc_write" ON public.rh_tipos_documento FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role));

-- ---------- documentos ----------
CREATE TABLE IF NOT EXISTS public.rh_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  tipo_documento_id uuid REFERENCES public.rh_tipos_documento(id),
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  storage_path text NOT NULL,
  nome_arquivo text,
  tamanho_bytes bigint,
  mime_type text,
  status text NOT NULL DEFAULT 'enviado'
    CHECK (status IN ('pendente','enviado','validado','rejeitado','vencido')),
  validade_ate date,
  motivo_rejeicao text,
  validado_por uuid,
  validado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rhdoc_pessoa ON public.rh_documentos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rhdoc_loja ON public.rh_documentos(loja_id);
ALTER TABLE public.rh_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rhdoc_select" ON public.rh_documentos;
CREATE POLICY "rhdoc_select" ON public.rh_documentos FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS "rhdoc_write" ON public.rh_documentos;
CREATE POLICY "rhdoc_write" ON public.rh_documentos FOR ALL TO authenticated
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
