
-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create inter_credentials table for multi-tenant Inter banking integration
CREATE TABLE public.inter_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_secret_encrypted text NOT NULL,
  certificado_pem_encrypted text,
  chave_privada_pem_encrypted text,
  ambiente text NOT NULL DEFAULT 'sandbox' CHECK (ambiente IN ('sandbox', 'producao')),
  escopos text[] NOT NULL DEFAULT ARRAY['boleto-cobranca.read', 'boleto-cobranca.write'],
  webhook_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (loja_id)
);

-- Enable RLS
ALTER TABLE public.inter_credentials ENABLE ROW LEVEL SECURITY;

-- Only master/admin can read credentials of their lojas
CREATE POLICY "Master pode gerenciar todas credentials"
  ON public.inter_credentials FOR ALL
  TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Admin pode ver credentials das suas lojas"
  ON public.inter_credentials FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode inserir credentials das suas lojas"
  ON public.inter_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode atualizar credentials das suas lojas"
  ON public.inter_credentials FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar credentials das suas lojas"
  ON public.inter_credentials FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_inter_credentials_updated_at
  BEFORE UPDATE ON public.inter_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create inter_webhook_events table to track webhook events
CREATE TABLE public.inter_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id),
  tipo text NOT NULL,
  codigo_solicitacao text NOT NULL,
  nosso_numero text,
  status text NOT NULL,
  valor numeric,
  data_evento timestamptz NOT NULL DEFAULT now(),
  payload jsonb DEFAULT '{}'::jsonb,
  processado boolean NOT NULL DEFAULT false,
  tentativas integer NOT NULL DEFAULT 0,
  ultima_tentativa timestamptz,
  erro text,
  titulo_id uuid REFERENCES public.titulos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inter_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master pode ver todos webhook events"
  ON public.inter_webhook_events FOR ALL
  TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Admin pode ver webhook events das suas lojas"
  ON public.inter_webhook_events FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

-- Service role needs to insert webhook events (from edge function)
CREATE POLICY "Service pode inserir webhook events"
  ON public.inter_webhook_events FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service pode atualizar webhook events"
  ON public.inter_webhook_events FOR UPDATE
  TO service_role
  USING (true);
;
