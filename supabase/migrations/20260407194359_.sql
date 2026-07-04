
-- ===========================================
-- TABLE: contas_financeiras
-- ===========================================
CREATE TABLE public.contas_financeiras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  codigo text NOT NULL DEFAULT '',
  nome text NOT NULL,
  banco text,
  agencia text,
  numero text,
  tipo text NOT NULL DEFAULT 'BANCO',
  moeda text NOT NULL DEFAULT 'BRL',
  saldo_atual numeric NOT NULL DEFAULT 0,
  bloqueios numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contas visíveis para usuários da loja"
ON public.contas_financeiras FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (is_active(auth.uid()) AND loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Financeiro pode criar contas"
ON public.contas_financeiras FOR INSERT TO authenticated
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
   OR has_role(auth.uid(), 'financeiro'::app_role)
   OR has_role(auth.uid(), 'gestor'::app_role))
  AND loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Financeiro pode atualizar contas"
ON public.contas_financeiras FOR UPDATE TO authenticated
USING (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
   OR has_role(auth.uid(), 'financeiro'::app_role)
   OR has_role(auth.uid(), 'gestor'::app_role))
  AND loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin pode deletar contas"
ON public.contas_financeiras FOR DELETE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_contas_financeiras_updated_at
BEFORE UPDATE ON public.contas_financeiras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- TABLE: movimentos_pagar
-- ===========================================
CREATE TABLE public.movimentos_pagar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcela_id uuid NOT NULL REFERENCES public.parcelas_pagar(id),
  titulo_id uuid NOT NULL REFERENCES public.titulos_pagar(id),
  conta_id uuid NOT NULL REFERENCES public.contas_financeiras(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  valor_bruto numeric NOT NULL DEFAULT 0,
  juros numeric NOT NULL DEFAULT 0,
  multa numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  valor_liquido numeric GENERATED ALWAYS AS (valor_bruto + juros + multa - desconto) STORED,
  forma text NOT NULL DEFAULT 'PIX',
  comprovante_url text,
  observacoes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentos_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movimentos visíveis para usuários da loja"
ON public.movimentos_pagar FOR SELECT TO authenticated
USING (
  is_master(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (is_active(auth.uid()) AND loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Financeiro pode registrar pagamentos"
ON public.movimentos_pagar FOR INSERT TO authenticated
WITH CHECK (
  (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
   OR has_role(auth.uid(), 'financeiro'::app_role)
   OR has_role(auth.uid(), 'gestor'::app_role))
  AND loja_id IN (
    SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin pode deletar movimentos"
ON public.movimentos_pagar FOR DELETE TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
;
