
-- Add missing column is_padrao to obras
ALTER TABLE public.obras
ADD COLUMN IF NOT EXISTS is_padrao boolean DEFAULT false;

-- Add missing column codigo_numerico to lojas
ALTER TABLE public.lojas
ADD COLUMN IF NOT EXISTS codigo_numerico integer;

-- Create titulos table for contas a receber
CREATE TABLE IF NOT EXISTS public.titulos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  contrato_id uuid REFERENCES public.contratos(id),
  fatura_id uuid REFERENCES public.faturas(id),
  aditivo_id uuid,
  categoria text,
  subcategoria text,
  emissao timestamp with time zone NOT NULL DEFAULT now(),
  vencimento timestamp with time zone NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  pago numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  forma text,
  status text NOT NULL DEFAULT 'ABERTO',
  origem text,
  timeline jsonb DEFAULT '[]'::jsonb,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.titulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Titulos visíveis para usuários ativos da loja"
  ON public.titulos FOR SELECT
  USING (
    (is_active(auth.uid()) AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff pode criar titulos"
  ON public.titulos FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  );

CREATE POLICY "Staff pode atualizar titulos"
  ON public.titulos FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  );

CREATE POLICY "Admin pode deletar titulos"
  ON public.titulos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create recebimentos table
CREATE TABLE IF NOT EXISTS public.recebimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo_id uuid NOT NULL REFERENCES public.titulos(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  data timestamp with time zone NOT NULL DEFAULT now(),
  forma text NOT NULL,
  valor_bruto numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  juros_multa numeric NOT NULL DEFAULT 0,
  valor_liquido numeric NOT NULL DEFAULT 0,
  usuario text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recebimentos visíveis para usuários ativos da loja"
  ON public.recebimentos FOR SELECT
  USING (
    (is_active(auth.uid()) AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff pode criar recebimentos"
  ON public.recebimentos FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND (loja_id IN (
      SELECT user_lojas_permitidas.loja_id
      FROM user_lojas_permitidas
      WHERE user_lojas_permitidas.user_id = auth.uid()
    ))
  );

CREATE POLICY "Admin pode deletar recebimentos"
  ON public.recebimentos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
;
