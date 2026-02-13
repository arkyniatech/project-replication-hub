-- ETAPA 2: Storage bucket e policies para anexos de solicitação (CORRIGIDO)

-- 1) Criar bucket para anexos de manutenção
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manutencao-anexos',
  'manutencao-anexos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- 2) Storage policies: Leitura para usuários da loja
CREATE POLICY "Usuários podem ver anexos da sua loja"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'manutencao-anexos' 
  AND EXISTS (
    SELECT 1 FROM user_lojas_permitidas 
    WHERE user_id = auth.uid() 
    AND loja_id::text = (storage.foldername(name))[1]
  )
);

-- 3) Storage policies: Escrita para vendedor/gestor/admin/mecanico
CREATE POLICY "Usuários autorizados podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'manutencao-anexos'
  AND (
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'mecanico'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM user_lojas_permitidas 
    WHERE user_id = auth.uid() 
    AND loja_id::text = (storage.foldername(name))[1]
  )
);

-- 4) Storage policies: Update
CREATE POLICY "Usuários autorizados podem atualizar anexos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'manutencao-anexos'
  AND (
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'mecanico'::app_role)
  )
);

-- 5) Storage policies: Delete (apenas admin/gestor)
CREATE POLICY "Admin/Gestor podem deletar anexos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'manutencao-anexos'
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role)
  )
);