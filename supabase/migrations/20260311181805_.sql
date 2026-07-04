
-- Create storage bucket for contract attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-anexos', 'contratos-anexos', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload contract attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contratos-anexos');

-- Allow authenticated users to read files (public bucket)
CREATE POLICY "Anyone can read contract attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contratos-anexos');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete contract attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contratos-anexos');
;
