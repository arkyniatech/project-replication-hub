-- 1. Fix equipamentos INSERT policy to include master
DROP POLICY IF EXISTS "Active staff can create equipment" ON public.equipamentos;
CREATE POLICY "Active staff can create equipment"
ON public.equipamentos
FOR INSERT
TO authenticated
WITH CHECK (
  is_active(auth.uid())
  AND (
    is_master(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'vendedor'::app_role)
  )
  AND (loja_atual_id IN (
    SELECT user_lojas_permitidas.loja_id
    FROM user_lojas_permitidas
    WHERE user_lojas_permitidas.user_id = auth.uid()
  ))
);

-- 2. Add GPS to obras
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- 3. Add dia_vencimento_padrao and negociacao_pontual to clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS dia_vencimento_padrao integer CHECK (dia_vencimento_padrao IS NULL OR (dia_vencimento_padrao BETWEEN 1 AND 31)),
  ADD COLUMN IF NOT EXISTS negociacao_pontual jsonb DEFAULT '{}'::jsonb;

-- 4. Marcas de equipamentos
CREATE TABLE IF NOT EXISTS public.marcas_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.marcas_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marcas visíveis para autenticados"
ON public.marcas_equipamentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master/Admin podem criar marcas"
ON public.marcas_equipamentos FOR INSERT
TO authenticated
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master/Admin podem atualizar marcas"
ON public.marcas_equipamentos FOR UPDATE
TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master/Admin podem deletar marcas"
ON public.marcas_equipamentos FOR DELETE
TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_marcas_updated
BEFORE UPDATE ON public.marcas_equipamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Variações de equipamento (Tensão, Combustível, Capacidade, Estado)
CREATE TABLE IF NOT EXISTS public.variacoes_equipamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('TENSAO','COMBUSTIVEL','CAPACIDADE','ESTADO')),
  valor text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, valor)
);

ALTER TABLE public.variacoes_equipamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variações visíveis para autenticados"
ON public.variacoes_equipamento FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master/Admin podem criar variações"
ON public.variacoes_equipamento FOR INSERT
TO authenticated
WITH CHECK (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master/Admin podem atualizar variações"
ON public.variacoes_equipamento FOR UPDATE
TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Master/Admin podem deletar variações"
ON public.variacoes_equipamento FOR DELETE
TO authenticated
USING (is_master(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_variacoes_updated
BEFORE UPDATE ON public.variacoes_equipamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed valores iniciais comuns
INSERT INTO public.variacoes_equipamento (tipo, valor, ordem) VALUES
  ('TENSAO', '110V', 1),
  ('TENSAO', '220V', 2),
  ('TENSAO', '380V', 3),
  ('TENSAO', '440V', 4),
  ('TENSAO', 'Bivolt', 5),
  ('COMBUSTIVEL', 'Gasolina', 1),
  ('COMBUSTIVEL', 'Diesel', 2),
  ('COMBUSTIVEL', 'Elétrico', 3),
  ('COMBUSTIVEL', 'GLP', 4),
  ('ESTADO', 'Novo', 1),
  ('ESTADO', 'Seminovo', 2),
  ('ESTADO', 'Usado', 3)
ON CONFLICT DO NOTHING;

-- 6. Add marca_id to equipamentos
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES public.marcas_equipamentos(id) ON DELETE SET NULL;;
