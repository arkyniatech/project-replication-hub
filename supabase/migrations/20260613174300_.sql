DROP POLICY IF EXISTS "Anyone can read contract attachments" ON storage.objects;

CREATE POLICY "Authenticated can read contract attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contratos-anexos');;
