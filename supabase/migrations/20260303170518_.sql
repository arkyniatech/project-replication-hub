
CREATE TABLE public.whatsapp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.whatsapp_verifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can insert" ON public.whatsapp_verifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can select" ON public.whatsapp_verifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can update" ON public.whatsapp_verifications
  FOR UPDATE TO authenticated USING (true);
;
