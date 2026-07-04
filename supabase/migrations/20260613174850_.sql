DROP POLICY IF EXISTS "Authenticated can read contract attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin pode excluir anexos de contrato" ON storage.objects;

CREATE POLICY "Users can read contract attachments from permitted stores"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contratos-anexos'
  AND public.is_active(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        public.is_master(auth.uid())
        OR c.loja_id IN (
          SELECT ulp.loja_id
          FROM public.user_lojas_permitidas ulp
          WHERE ulp.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Users can upload contract attachments to permitted stores"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contratos-anexos'
  AND public.is_active(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        public.is_master(auth.uid())
        OR c.loja_id IN (
          SELECT ulp.loja_id
          FROM public.user_lojas_permitidas ulp
          WHERE ulp.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Admins can delete contract attachments from permitted stores"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contratos-anexos'
  AND public.is_active(auth.uid())
  AND (
    public.is_master(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
  AND EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        public.is_master(auth.uid())
        OR c.loja_id IN (
          SELECT ulp.loja_id
          FROM public.user_lojas_permitidas ulp
          WHERE ulp.user_id = auth.uid()
        )
      )
  )
);;
