-- Criar tabela centros_custo
CREATE TABLE IF NOT EXISTS public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  loja_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela lojas
CREATE TABLE IF NOT EXISTS public.lojas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed inicial de lojas
INSERT INTO public.lojas (codigo, nome) VALUES
  ('loja-1', 'Matriz'),
  ('loja-2', 'Filial Norte'),
  ('loja-3', 'Filial Sul'),
  ('loja-4', 'Filial Oeste')
ON CONFLICT (codigo) DO NOTHING;

-- Seed inicial de centros de custo
INSERT INTO public.centros_custo (codigo, nome) VALUES
  ('cc-adm', 'Administrativo'),
  ('cc-vendas', 'Vendas'),
  ('cc-operacao', 'Operação'),
  ('cc-manutencao', 'Manutenção')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar foreign key em pessoas (apenas se ainda não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_pessoas_cc'
  ) THEN
    ALTER TABLE public.pessoas 
      ADD CONSTRAINT fk_pessoas_cc 
      FOREIGN KEY (cc_id) 
      REFERENCES public.centros_custo(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_pessoas_loja'
  ) THEN
    ALTER TABLE public.pessoas 
      ADD CONSTRAINT fk_pessoas_loja 
      FOREIGN KEY (loja_id) 
      REFERENCES public.lojas(id);
  END IF;
END $$;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_centros_custo_updated_at
  BEFORE UPDATE ON public.centros_custo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lojas_updated_at
  BEFORE UPDATE ON public.lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para centros_custo
CREATE POLICY "Centros de custo visíveis para autenticados"
  ON public.centros_custo FOR SELECT
  USING (true);

CREATE POLICY "Admin e RH podem inserir centros de custo"
  ON public.centros_custo FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin e RH podem atualizar centros de custo"
  ON public.centros_custo FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role));

CREATE POLICY "Admin pode deletar centros de custo"
  ON public.centros_custo FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para lojas
CREATE POLICY "Lojas visíveis para autenticados"
  ON public.lojas FOR SELECT
  USING (true);

CREATE POLICY "Admin pode inserir lojas"
  ON public.lojas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode atualizar lojas"
  ON public.lojas FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode deletar lojas"
  ON public.lojas FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));