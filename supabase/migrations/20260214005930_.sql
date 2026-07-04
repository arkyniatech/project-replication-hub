
-- Add historico column to aditivos_contratuais
ALTER TABLE public.aditivos_contratuais ADD COLUMN IF NOT EXISTS historico jsonb DEFAULT '[]'::jsonb;

-- Create fornecedores table
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  cnpj text,
  cpf text,
  tipo text DEFAULT 'PJ',
  contato jsonb DEFAULT '{}'::jsonb,
  endereco jsonb DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view fornecedores" ON public.fornecedores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert fornecedores" ON public.fornecedores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update fornecedores" ON public.fornecedores FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete fornecedores" ON public.fornecedores FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create sequence for fornecedor codes
CREATE SEQUENCE IF NOT EXISTS public.fornecedor_seq START 1;

-- Create gerar_codigo_fornecedor function
CREATE OR REPLACE FUNCTION public.gerar_codigo_fornecedor()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seq_val integer;
BEGIN
  seq_val := nextval('fornecedor_seq');
  RETURN 'FOR' || lpad(seq_val::text, 3, '0');
END;
$$;

-- Create categorias_n2 table
CREATE TABLE IF NOT EXISTS public.categorias_n2 (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'DESPESA',
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias_n2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage categorias_n2" ON public.categorias_n2 FOR ALL USING (auth.uid() IS NOT NULL);

-- Create titulos_pagar table
CREATE TABLE IF NOT EXISTS public.titulos_pagar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  numero text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  pago numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  emissao date NOT NULL DEFAULT CURRENT_DATE,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'ABERTO',
  categoria text,
  subcategoria text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
ALTER TABLE public.titulos_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage titulos_pagar" ON public.titulos_pagar FOR ALL USING (auth.uid() IS NOT NULL);

-- Create parcelas_pagar table
CREATE TABLE IF NOT EXISTS public.parcelas_pagar (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo_id uuid NOT NULL REFERENCES public.titulos_pagar(id) ON DELETE CASCADE,
  numero integer NOT NULL DEFAULT 1,
  valor numeric NOT NULL DEFAULT 0,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'ABERTO',
  data_pagamento date,
  valor_pago numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parcelas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage parcelas_pagar" ON public.parcelas_pagar FOR ALL USING (auth.uid() IS NOT NULL);

-- Create aprovacoes_cp table
CREATE TABLE IF NOT EXISTS public.aprovacoes_cp (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo_id uuid NOT NULL REFERENCES public.titulos_pagar(id),
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDENTE',
  nivel text NOT NULL DEFAULT 'FINANCEIRO',
  historico jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aprovacoes_cp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage aprovacoes_cp" ON public.aprovacoes_cp FOR ALL USING (auth.uid() IS NOT NULL);

-- Create logistica_tarefas table
CREATE TABLE IF NOT EXISTS public.logistica_tarefas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  contrato_id uuid REFERENCES public.contratos(id),
  cliente_id uuid REFERENCES public.clientes(id),
  tipo text NOT NULL DEFAULT 'ENTREGA',
  status text NOT NULL DEFAULT 'PROGRAMADO',
  prioridade text NOT NULL DEFAULT 'MEDIA',
  previsto_iso timestamptz,
  duracao_min integer DEFAULT 60,
  janela text DEFAULT 'MANHA',
  endereco jsonb DEFAULT '{}'::jsonb,
  latitude numeric,
  longitude numeric,
  cliente_nome text,
  cliente_telefone text,
  motorista_id uuid,
  veiculo_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.logistica_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage logistica_tarefas" ON public.logistica_tarefas FOR ALL USING (auth.uid() IS NOT NULL);

-- Create avisos_sistema table
CREATE TABLE IF NOT EXISTS public.avisos_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  texto text NOT NULL,
  tipo text NOT NULL DEFAULT 'info',
  ativo boolean DEFAULT true,
  prioridade integer DEFAULT 0,
  data_inicio date,
  data_fim date,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.avisos_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage avisos_sistema" ON public.avisos_sistema FOR ALL USING (auth.uid() IS NOT NULL);

-- Create config_avisos_header table
CREATE TABLE IF NOT EXISTS public.config_avisos_header (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exibir_logo boolean DEFAULT true,
  tempo_rotacao integer DEFAULT 5,
  animacao boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.config_avisos_header ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage config_avisos_header" ON public.config_avisos_header FOR ALL USING (auth.uid() IS NOT NULL);
;
