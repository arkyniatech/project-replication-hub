
DROP POLICY IF EXISTS "Authenticated can select" ON public.whatsapp_verifications;
DROP POLICY IF EXISTS "Authenticated can update" ON public.whatsapp_verifications;
DROP POLICY IF EXISTS "Authenticated can insert" ON public.whatsapp_verifications;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_verifications FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_verifications FROM anon;
;
