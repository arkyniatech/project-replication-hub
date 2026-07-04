
-- 1. Add missing columns to modelos_equipamentos
ALTER TABLE public.modelos_equipamentos
  ADD COLUMN IF NOT EXISTS caucao_padrao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiver_protecao_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_limpeza_padrao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_padding_horas numeric DEFAULT 3,
  ADD COLUMN IF NOT EXISTS tolerancia_atraso_horas numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS multa_diaria_atraso numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS politica_cancelamento text DEFAULT '';

-- 2. Create horimetro_leituras table
CREATE TABLE IF NOT EXISTS public.horimetro_leituras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id),
  contrato_id uuid REFERENCES public.contratos(id),
  tipo_evento text NOT NULL,
  leitura_anterior numeric NOT NULL DEFAULT 0,
  leitura_atual numeric NOT NULL DEFAULT 0,
  horas_trabalhadas numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.horimetro_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leituras visíveis para usuários ativos"
  ON public.horimetro_leituras FOR SELECT
  USING (is_active(auth.uid()));

CREATE POLICY "Staff pode criar leituras"
  ON public.horimetro_leituras FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'vendedor'::app_role) OR
    has_role(auth.uid(), 'gestor'::app_role) OR
    has_role(auth.uid(), 'mecanico'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin pode deletar leituras"
  ON public.horimetro_leituras FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create aditivos_contratuais table
CREATE TABLE IF NOT EXISTS public.aditivos_contratuais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  numero text NOT NULL,
  tipo text NOT NULL DEFAULT 'RENOVACAO',
  descricao text,
  justificativa text,
  valor numeric DEFAULT 0,
  vinculacao text DEFAULT 'CONTRATO',
  status text NOT NULL DEFAULT 'ATIVO',
  criado_por uuid,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.aditivos_contratuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aditivos visíveis para usuários ativos da loja"
  ON public.aditivos_contratuais FOR SELECT
  USING (
    (is_active(auth.uid()) AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff pode criar aditivos"
  ON public.aditivos_contratuais FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor'::app_role) OR
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role)) AND
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Staff pode atualizar aditivos"
  ON public.aditivos_contratuais FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor'::app_role) OR
     has_role(auth.uid(), 'gestor'::app_role) OR
     has_role(auth.uid(), 'admin'::app_role)) AND
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar aditivos"
  ON public.aditivos_contratuais FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
;
