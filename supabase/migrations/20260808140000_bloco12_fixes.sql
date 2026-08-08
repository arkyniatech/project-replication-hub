-- ============================================================================
-- Correções do Bloco 12 (revisão de código pós-deploy):
--   1) created_by DEFAULT auth.uid() nas 9 tabelas novas — auditoria de quem
--      criou vaga/admissão/desligamento etc. (estava sempre NULL).
--   2) UNIQUE parcial em rh_beneficio_vinculos: 1 vínculo ATIVO por
--      (benefício, pessoa) — dois cliques duplicavam VR/plano.
--   3) Bucket privado 'comprovantes-pagamento' (isolado por loja) — o
--      PagarModal gravava só o NOME do arquivo em comprovante_url.
-- ============================================================================

-- ---------- 1) created_by DEFAULT auth.uid() ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rh_vagas','rh_candidatos','rh_admissoes','rh_beneficios',
    'rh_beneficio_elegibilidade','rh_beneficio_vinculos',
    'rh_aso_exames','rh_treinamentos','rh_desligamentos'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_by SET DEFAULT auth.uid()', t);
  END LOOP;
END $$;

-- ---------- 2) vínculo de benefício ativo é único por (benefício, pessoa) ----------
CREATE UNIQUE INDEX IF NOT EXISTS uq_rh_benef_vinc_ativo
  ON public.rh_beneficio_vinculos (beneficio_id, pessoa_id)
  WHERE status = 'ativo';

-- ---------- 3) bucket privado de comprovantes de pagamento ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('comprovantes-pagamento','comprovantes-pagamento', false, 10485760,
        ARRAY['application/pdf','image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "comprovantes_bucket_select" ON storage.objects;
CREATE POLICY "comprovantes_bucket_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes-pagamento' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'financeiro'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);
DROP POLICY IF EXISTS "comprovantes_bucket_write" ON storage.objects;
CREATE POLICY "comprovantes_bucket_write" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'comprovantes-pagamento' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'financeiro'::app_role)
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'comprovantes-pagamento' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'financeiro'::app_role)
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);
