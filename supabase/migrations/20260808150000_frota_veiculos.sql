-- ============================================================================
-- Frota (módulo /veiculos) sai do localStorage: 9 tabelas espelhando o shape
-- do veiculosStore. IDs são TEXT (default uuid) para aceitar os IDs legados
-- (Date.now) na migração one-shot dos dados que já existem nos navegadores.
-- RLS: leitura para usuário ativo; escrita para papéis de operação/gestão —
-- frota é gerida centralmente, sem isolamento por loja nos catálogos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.frota_veiculos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loja_id uuid REFERENCES public.lojas(id),
  placa text NOT NULL,
  codigo_interno text NOT NULL DEFAULT '',
  fabricante text NOT NULL DEFAULT '',
  modelo text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'carro' CHECK (tipo IN ('carro','moto','furgão','caminhão')),
  ano_fab int,
  ano_mod int,
  combustivel text NOT NULL DEFAULT 'Flex' CHECK (combustivel IN ('G','E','D','Flex')),
  cap_tanque_l numeric NOT NULL DEFAULT 0,
  odometro_atual numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPERANDO' CHECK (status IN ('OPERANDO','OFICINA','BAIXADO')),
  motorista_atual_id text,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_frota_veiculos_placa ON public.frota_veiculos (lower(placa));
CREATE INDEX IF NOT EXISTS idx_frota_veiculos_loja ON public.frota_veiculos (loja_id);

CREATE TABLE IF NOT EXISTS public.frota_postos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome text NOT NULL,
  cidade text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  cnpj text,
  obs text,
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.frota_oleos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tipo_especificacao text NOT NULL,
  intervalo_km numeric NOT NULL DEFAULT 0,
  intervalo_meses numeric NOT NULL DEFAULT 0,
  obs text,
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.frota_servicos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  grupo text NOT NULL DEFAULT '',
  servico_especifico text NOT NULL,
  criticidade text NOT NULL DEFAULT 'MEDIA' CHECK (criticidade IN ('BAIXA','MEDIA','ALTA')),
  obs text,
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.frota_oficinas (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome text NOT NULL,
  cidade text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  contato text,
  obs text,
  servicos_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.frota_veiculo_configs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  veiculo_id text NOT NULL REFERENCES public.frota_veiculos(id) ON DELETE CASCADE,
  oleo_id text NOT NULL REFERENCES public.frota_oleos(id) ON DELETE CASCADE,
  desde_data timestamptz NOT NULL DEFAULT now(),
  UNIQUE (veiculo_id)
);

CREATE TABLE IF NOT EXISTS public.frota_manutencoes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  veiculo_id text NOT NULL REFERENCES public.frota_veiculos(id) ON DELETE CASCADE,
  oficina_id text REFERENCES public.frota_oficinas(id) ON DELETE SET NULL,
  data_abertura timestamptz NOT NULL DEFAULT now(),
  grupo_id text,
  servico_id text,
  descricao text,
  km_entrada numeric,
  dt_entrada timestamptz,
  km_saida numeric,
  dt_saida timestamptz,
  custo_pecas numeric,
  custo_mo numeric,
  status text NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','CONCLUIDA')),
  tempo_parado_h numeric NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_frota_manut_veiculo ON public.frota_manutencoes (veiculo_id);

CREATE TABLE IF NOT EXISTS public.frota_abastecimentos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  veiculo_id text NOT NULL REFERENCES public.frota_veiculos(id) ON DELETE CASCADE,
  data date NOT NULL,
  posto_id text REFERENCES public.frota_postos(id) ON DELETE SET NULL,
  preco_litro numeric NOT NULL DEFAULT 0,
  litros numeric NOT NULL DEFAULT 0,
  km_atual numeric NOT NULL DEFAULT 0,
  km_percorrido numeric NOT NULL DEFAULT 0,
  km_por_l numeric NOT NULL DEFAULT 0,
  custo_por_km numeric NOT NULL DEFAULT 0,
  flags_json text,
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_frota_abast_veiculo ON public.frota_abastecimentos (veiculo_id);

CREATE TABLE IF NOT EXISTS public.frota_trocas_oleo (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  veiculo_id text NOT NULL REFERENCES public.frota_veiculos(id) ON DELETE CASCADE,
  data date NOT NULL,
  oleo_id text REFERENCES public.frota_oleos(id) ON DELETE SET NULL,
  trocou_filtro boolean NOT NULL DEFAULT false,
  trocou_filtro_combustivel boolean NOT NULL DEFAULT false,
  custo_total numeric NOT NULL DEFAULT 0,
  km_atual numeric NOT NULL DEFAULT 0,
  km_desde_ultima numeric NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS idx_frota_trocas_veiculo ON public.frota_trocas_oleo (veiculo_id);

-- ---------- RLS ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'frota_veiculos','frota_postos','frota_oleos','frota_servicos','frota_oficinas',
    'frota_veiculo_configs','frota_manutencoes','frota_abastecimentos','frota_trocas_oleo'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid())
        OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'gestor'::app_role)
        OR public.has_role(auth.uid(),'operacao'::app_role)
        OR public.has_role(auth.uid(),'financeiro'::app_role)))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid())
        OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'gestor'::app_role)
        OR public.has_role(auth.uid(),'operacao'::app_role)
        OR public.has_role(auth.uid(),'financeiro'::app_role)))$p$, t, t);
  END LOOP;
END $$;
