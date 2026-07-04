-- Tabela para armazenar instâncias WhatsApp por loja
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  instance_token text,
  status text NOT NULL DEFAULT 'desconectado',
  phone_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(loja_id)
);

-- Trigger updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Master pode tudo
CREATE POLICY "Master gerencia instâncias WhatsApp"
  ON public.whatsapp_instances FOR ALL
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

-- Admin pode gerenciar nas suas lojas
CREATE POLICY "Admin gerencia instâncias WhatsApp da loja"
  ON public.whatsapp_instances FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

-- Gestores podem ver
CREATE POLICY "Gestor pode ver instâncias WhatsApp"
  ON public.whatsapp_instances FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor'::app_role)
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );;
