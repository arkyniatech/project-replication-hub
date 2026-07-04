ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS zapsign_doc_token text,
  ADD COLUMN IF NOT EXISTS zapsign_status text,
  ADD COLUMN IF NOT EXISTS zapsign_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS zapsign_sign_url text;;
