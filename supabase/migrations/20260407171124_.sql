
CREATE TABLE public.cobrancas_inter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo_id UUID NOT NULL REFERENCES public.titulos(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  codigo_solicitacao TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  idempotency_key TEXT NOT NULL,
  linha_digitavel TEXT,
  codigo_barras TEXT,
  pix_copia_cola TEXT,
  qr_code_data_url TEXT,
  pdf_url TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_cobrancas_inter_titulo ON public.cobrancas_inter(titulo_id);
CREATE INDEX idx_cobrancas_inter_loja ON public.cobrancas_inter(loja_id);
CREATE INDEX idx_cobrancas_inter_codigo ON public.cobrancas_inter(codigo_solicitacao);
CREATE UNIQUE INDEX idx_cobrancas_inter_idempotency ON public.cobrancas_inter(idempotency_key);

ALTER TABLE public.cobrancas_inter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master pode gerenciar todas cobrancas_inter"
  ON public.cobrancas_inter FOR ALL TO authenticated
  USING (is_master(auth.uid()))
  WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Staff pode ver cobrancas da loja"
  ON public.cobrancas_inter FOR SELECT TO authenticated
  USING (
    is_active(auth.uid()) AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff pode criar cobrancas da loja"
  ON public.cobrancas_inter FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff pode atualizar cobrancas da loja"
  ON public.cobrancas_inter FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
  );

CREATE POLICY "Service pode gerenciar cobrancas_inter"
  ON public.cobrancas_inter FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_cobrancas_inter_updated_at
  BEFORE UPDATE ON public.cobrancas_inter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
;
