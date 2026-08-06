-- ============================================================================
-- Bloco 5 — Holerites (upload/publicação; NÃO gera folha)
-- holerite_lotes + holerites + RLS + bucket privado 'holerites' (isolado por loja).
-- ============================================================================

-- ---------- lotes ----------
CREATE TABLE IF NOT EXISTS public.holerite_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  competencia text NOT NULL,                       -- 'YYYY-MM'
  tipo text NOT NULL DEFAULT 'mensal' CHECK (tipo IN ('mensal','13_1','13_2','ferias','rescisao')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','despublicado')),
  publicado_por uuid,
  publicado_em timestamptz,
  total_colaboradores int NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
DROP TRIGGER IF EXISTS trg_holerite_lotes_updated_at ON public.holerite_lotes;
CREATE TRIGGER trg_holerite_lotes_updated_at BEFORE UPDATE ON public.holerite_lotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.holerite_lotes ENABLE ROW LEVEL SECURITY;

-- ---------- holerites individuais ----------
CREATE TABLE IF NOT EXISTS public.holerites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES public.holerite_lotes(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  competencia text NOT NULL,
  storage_path text NOT NULL,
  nome_arquivo text,
  valor_liquido numeric,
  visualizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (lote_id, pessoa_id)
);
CREATE INDEX IF NOT EXISTS idx_holerites_lote ON public.holerites(lote_id);
CREATE INDEX IF NOT EXISTS idx_holerites_pessoa ON public.holerites(pessoa_id);
ALTER TABLE public.holerites ENABLE ROW LEVEL SECURITY;

-- ---------- RLS ----------
-- lotes: gestão de RH (não expõe ao colaborador; o colaborador vê o holerite dele)
DROP POLICY IF EXISTS "holerite_lotes_select" ON public.holerite_lotes;
CREATE POLICY "holerite_lotes_select" ON public.holerite_lotes FOR SELECT TO authenticated
USING (public.is_active(auth.uid()) AND (
  public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)));
DROP POLICY IF EXISTS "holerite_lotes_write" ON public.holerite_lotes;
CREATE POLICY "holerite_lotes_write" ON public.holerite_lotes FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role));

-- holerites: RH por loja; colaborador vê o próprio SÓ se o lote estiver publicado
DROP POLICY IF EXISTS "holerites_select" ON public.holerites;
CREATE POLICY "holerites_select" ON public.holerites FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR (pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.holerite_lotes l WHERE l.id = holerites.lote_id AND l.status = 'publicado'))
  )
);
DROP POLICY IF EXISTS "holerites_write" ON public.holerites;
CREATE POLICY "holerites_write" ON public.holerites FOR ALL TO authenticated
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

-- ---------- bucket privado 'holerites' (isolado por loja: 1º segmento = loja_id) ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('holerites','holerites', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "holerites_bucket_select" ON storage.objects;
CREATE POLICY "holerites_bucket_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'holerites' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.holerites h JOIN public.holerite_lotes l ON l.id = h.lote_id
               WHERE h.storage_path = storage.objects.name AND l.status = 'publicado'
                 AND h.pessoa_id = (SELECT pessoa_id FROM public.user_profiles WHERE id = auth.uid()))
  )
);
DROP POLICY IF EXISTS "holerites_bucket_write" ON storage.objects;
CREATE POLICY "holerites_bucket_write" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'holerites' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'holerites' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);
