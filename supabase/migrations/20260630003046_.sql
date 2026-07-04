
-- MOTORISTAS
CREATE TABLE IF NOT EXISTS public.logistica_motoristas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  pessoa_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,
  nome text NOT NULL,
  telefone text,
  cnh text,
  categoria_cnh text,
  vencimento_cnh date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistica_motoristas TO authenticated;
GRANT ALL ON public.logistica_motoristas TO service_role;
ALTER TABLE public.logistica_motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master vê todos motoristas" ON public.logistica_motoristas
  FOR ALL TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Usuários veem motoristas de suas lojas" ON public.logistica_motoristas
  FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários gerenciam motoristas de suas lojas" ON public.logistica_motoristas
  FOR INSERT TO authenticated
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários atualizam motoristas de suas lojas" ON public.logistica_motoristas
  FOR UPDATE TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários deletam motoristas de suas lojas" ON public.logistica_motoristas
  FOR DELETE TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE TRIGGER trg_logistica_motoristas_updated_at
  BEFORE UPDATE ON public.logistica_motoristas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_logistica_motoristas_loja ON public.logistica_motoristas(loja_id);

-- VEICULOS
CREATE TABLE IF NOT EXISTS public.logistica_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  placa text NOT NULL,
  modelo text NOT NULL,
  ano integer,
  capacidade_kg numeric,
  capacidade_m3 numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistica_veiculos TO authenticated;
GRANT ALL ON public.logistica_veiculos TO service_role;
ALTER TABLE public.logistica_veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master vê todos veículos" ON public.logistica_veiculos
  FOR ALL TO authenticated
  USING (public.is_master(auth.uid()))
  WITH CHECK (public.is_master(auth.uid()));

CREATE POLICY "Usuários veem veículos de suas lojas" ON public.logistica_veiculos
  FOR SELECT TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários gerenciam veículos de suas lojas" ON public.logistica_veiculos
  FOR INSERT TO authenticated
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários atualizam veículos de suas lojas" ON public.logistica_veiculos
  FOR UPDATE TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  WITH CHECK (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE POLICY "Usuários deletam veículos de suas lojas" ON public.logistica_veiculos
  FOR DELETE TO authenticated
  USING (loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()));

CREATE TRIGGER trg_logistica_veiculos_updated_at
  BEFORE UPDATE ON public.logistica_veiculos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_logistica_veiculos_loja ON public.logistica_veiculos(loja_id);
CREATE UNIQUE INDEX idx_logistica_veiculos_placa_loja ON public.logistica_veiculos(loja_id, placa);
;
