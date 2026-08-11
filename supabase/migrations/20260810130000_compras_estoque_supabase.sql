-- =====================================================================
-- Ticket #50 — Migração do módulo Compras & Estoque para o Supabase
-- Substitui os stores Zustand/localStorage (comprasStore + almoxStore).
-- Padrões reaproveitados: RLS loja-scoped (modelo ferias), camada demo
-- read-only obrigatória, numeração MAX+LPAD por loja (padrão gerar_numero_os),
-- RPCs transacionais SECURITY DEFINER com guard + REVOKE/GRANT.
-- Helpers já existentes no banco (NÃO recriar): is_active, is_master,
-- has_role, is_demo_user, trg_bloquear_demo, update_updated_at_column.
-- =====================================================================

-- =========================
-- 1. TABELAS
-- =========================

-- Catálogo central (sem loja) -----------------------------------------
CREATE TABLE IF NOT EXISTS public.almox_catalogo_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('PATRIMONIAL','PECA','CONSUMIVEL')),
  sku text NOT NULL UNIQUE,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'UN',
  grupo text,
  modelo text,
  controle text NOT NULL DEFAULT 'SALDO' CHECK (controle IN ('SERIE','SALDO')),
  ativo boolean NOT NULL DEFAULT true,
  estoque_minimo numeric,
  estoque_maximo numeric,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Estoque (saldo por loja+item) ---------------------------------------
CREATE TABLE IF NOT EXISTS public.almox_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  item_id uuid NOT NULL REFERENCES public.almox_catalogo_itens(id) ON DELETE CASCADE,
  controle text NOT NULL DEFAULT 'SALDO' CHECK (controle IN ('SERIE','SALDO')),
  saldo numeric NOT NULL DEFAULT 0,
  series jsonb NOT NULL DEFAULT '[]'::jsonb,
  custo_medio numeric,
  ultima_movimentacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  UNIQUE (loja_id, item_id)
);

-- Movimentos de estoque (livro-razão) ---------------------------------
CREATE TABLE IF NOT EXISTS public.almox_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  item_id uuid NOT NULL REFERENCES public.almox_catalogo_itens(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA_PO','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','CONSUMO','TRANSFERENCIA_SAIDA','TRANSFERENCIA_ENTRADA','BAIXA_PATRIMONIAL','DEVOLUCAO_FORNECEDOR')),
  quantidade numeric NOT NULL,
  custo_unitario numeric,
  referencia text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Requisições ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras_requisicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  solicitante_id uuid DEFAULT auth.uid(),
  solicitante_nome text NOT NULL,
  centro_custo text,
  categoria text NOT NULL CHECK (categoria IN ('PATRIMONIAL','PECA','CONSUMIVEL')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','solicitado','em_cotacao','cotado','cancelado')),
  observacoes text,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.compras_requisicao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.compras_requisicoes(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  item_catalogo_id uuid REFERENCES public.almox_catalogo_itens(id),
  sku text,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'UN',
  quantidade numeric NOT NULL DEFAULT 1,
  obs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Cotações ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras_cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  origem text NOT NULL CHECK (origem IN ('REQ','OS','DIRETA')),
  origem_id uuid,
  comprador_id uuid DEFAULT auth.uid(),
  comprador_nome text,
  sla_interno timestamptz,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','para_aprovacao','aprovado','negado','comprado')),
  aprovacao jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.compras_cotacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.compras_cotacoes(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  item_catalogo_id uuid REFERENCES public.almox_catalogo_itens(id),
  sku text,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'UN',
  quantidade numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.compras_cotacao_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.compras_cotacoes(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  frete numeric NOT NULL DEFAULT 0,
  impostos numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  prazo_geral_dias integer NOT NULL DEFAULT 0,
  condicoes_pagamento text,
  validade_proposta date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.compras_cotacao_proposta_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.compras_cotacao_propostas(id) ON DELETE CASCADE,
  cotacao_item_id uuid NOT NULL REFERENCES public.compras_cotacao_itens(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  preco_unit numeric NOT NULL DEFAULT 0,
  prazo_entrega integer,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Pedidos de compra ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cotacao_id uuid REFERENCES public.compras_cotacoes(id),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'emitido' CHECK (status IN ('emitido','parcial','total','cancelado')),
  condicoes_pagamento text,
  prazo_entrega integer,
  observacoes text,
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.compras_pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.compras_pedidos(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  item_catalogo_id uuid REFERENCES public.almox_catalogo_itens(id),
  sku text,
  descricao text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  preco_unit numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Recebimentos --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras_recebimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  pedido_id uuid NOT NULL REFERENCES public.compras_pedidos(id),
  nf_numero text,
  nf_emissao date,
  nf_chave text,
  status text NOT NULL DEFAULT 'parcial' CHECK (status IN ('parcial','total')),
  conferente_id uuid DEFAULT auth.uid(),
  conferente_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.compras_recebimento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id uuid NOT NULL REFERENCES public.compras_recebimentos(id) ON DELETE CASCADE,
  pedido_item_id uuid REFERENCES public.compras_pedido_itens(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  quantidade_recebida numeric NOT NULL DEFAULT 0,
  series jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- =========================
-- 2. ÍNDICES
-- =========================
CREATE INDEX IF NOT EXISTS idx_almox_estoque_loja ON public.almox_estoque(loja_id);
CREATE INDEX IF NOT EXISTS idx_almox_estoque_item ON public.almox_estoque(item_id);
CREATE INDEX IF NOT EXISTS idx_almox_movimentos_loja ON public.almox_movimentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_almox_movimentos_item ON public.almox_movimentos(item_id);
CREATE INDEX IF NOT EXISTS idx_compras_requisicoes_loja ON public.compras_requisicoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_requisicao_itens_req ON public.compras_requisicao_itens(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacoes_loja ON public.compras_cotacoes(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacoes_origem ON public.compras_cotacoes(origem, origem_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacao_itens_cot ON public.compras_cotacao_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacao_propostas_cot ON public.compras_cotacao_propostas(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_compras_cotacao_prop_itens_prop ON public.compras_cotacao_proposta_itens(proposta_id);
CREATE INDEX IF NOT EXISTS idx_compras_pedidos_loja ON public.compras_pedidos(loja_id);
CREATE INDEX IF NOT EXISTS idx_compras_pedido_itens_ped ON public.compras_pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_compras_recebimentos_pedido ON public.compras_recebimentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_compras_recebimento_itens_rec ON public.compras_recebimento_itens(recebimento_id);

-- =========================
-- 3. NUMERAÇÃO (MAX+LPAD por loja, via trigger BEFORE INSERT)
-- =========================
CREATE OR REPLACE FUNCTION public.trg_gerar_numero_compras()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefixo text := TG_ARGV[0];
  v_prox integer;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    EXECUTE format(
      $q$SELECT COALESCE(MAX(NULLIF(regexp_replace(numero, '\D', '', 'g'), '')::integer), 0) + 1
         FROM public.%I WHERE loja_id = $1$q$, TG_TABLE_NAME)
      INTO v_prox USING NEW.loja_id;
    NEW.numero := v_prefixo || '-' || LPAD(v_prox::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_num_requisicao ON public.compras_requisicoes;
CREATE TRIGGER trg_num_requisicao BEFORE INSERT ON public.compras_requisicoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_compras('REQ');

DROP TRIGGER IF EXISTS trg_num_cotacao ON public.compras_cotacoes;
CREATE TRIGGER trg_num_cotacao BEFORE INSERT ON public.compras_cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_compras('COT');

DROP TRIGGER IF EXISTS trg_num_pedido ON public.compras_pedidos;
CREATE TRIGGER trg_num_pedido BEFORE INSERT ON public.compras_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_compras('PO');

DROP TRIGGER IF EXISTS trg_num_recebimento ON public.compras_recebimentos;
CREATE TRIGGER trg_num_recebimento BEFORE INSERT ON public.compras_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.trg_gerar_numero_compras('REC');

-- =========================
-- 4. TRIGGERS updated_at + RLS + camada demo (loops)
-- =========================
DO $$
DECLARE t text;
BEGIN
  -- updated_at em TODAS as tabelas do módulo
  FOREACH t IN ARRAY ARRAY[
    'almox_catalogo_itens','almox_estoque','almox_movimentos',
    'compras_requisicoes','compras_requisicao_itens','compras_cotacoes','compras_cotacao_itens',
    'compras_cotacao_propostas','compras_cotacao_proposta_itens','compras_pedidos','compras_pedido_itens',
    'compras_recebimentos','compras_recebimento_itens'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  -- Policies loja-scoped (modelo ferias): SELECT p/ admin/gestor/vendedor+master
  -- na loja; WRITE idem. Isolamento por loja é o invariante de segurança.
  FOREACH t IN ARRAY ARRAY[
    'almox_estoque','almox_movimentos',
    'compras_requisicoes','compras_requisicao_itens','compras_cotacoes','compras_cotacao_itens',
    'compras_cotacao_propostas','compras_cotacao_proposta_itens','compras_pedidos','compras_pedido_itens',
    'compras_recebimentos','compras_recebimento_itens'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
      ))$p$, t, t);

    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
      ))
      WITH CHECK (public.is_active(auth.uid()) AND (
        public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
            AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
      ))$p$, t, t);
  END LOOP;

  -- Camada demo read-only (RESTRICTIVE + trigger) em TODAS as tabelas
  FOREACH t IN ARRAY ARRAY[
    'almox_catalogo_itens','almox_estoque','almox_movimentos',
    'compras_requisicoes','compras_requisicao_itens','compras_cotacoes','compras_cotacao_itens',
    'compras_cotacao_propostas','compras_cotacao_proposta_itens','compras_pedidos','compras_pedido_itens',
    'compras_recebimentos','compras_recebimento_itens'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_ins" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_ins" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_upd" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_upd" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP POLICY IF EXISTS "demo_ro_del" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "demo_ro_del" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo_user())$p$, t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_demo_readonly ON public.%I', t);
    EXECUTE format($trg$CREATE TRIGGER trg_demo_readonly BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_demo()$trg$, t);
  END LOOP;
END $$;

-- Catálogo central: papel-only (sem escopo de loja)
DROP POLICY IF EXISTS "almox_catalogo_sel" ON public.almox_catalogo_itens;
CREATE POLICY "almox_catalogo_sel" ON public.almox_catalogo_itens FOR SELECT TO authenticated
  USING (public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role)));
DROP POLICY IF EXISTS "almox_catalogo_wr" ON public.almox_catalogo_itens;
CREATE POLICY "almox_catalogo_wr" ON public.almox_catalogo_itens FOR ALL TO authenticated
  USING (public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
  WITH CHECK (public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)));

-- =========================
-- 5. RPCs TRANSACIONAIS (SECURITY DEFINER + guard de loja)
-- =========================

-- Guard reutilizável: usuário tem acesso à loja?
CREATE OR REPLACE FUNCTION public.compras_pode_loja(p_loja_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'gestor'::app_role) OR public.has_role(auth.uid(),'vendedor'::app_role))
        AND p_loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  );
$$;

-- Requisição -> Cotação (origem REQ)
CREATE OR REPLACE FUNCTION public.criar_cotacao_de_requisicao(p_requisicao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.compras_requisicoes; v_cot uuid;
BEGIN
  SELECT * INTO v_req FROM public.compras_requisicoes WHERE id = p_requisicao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisição não encontrada'; END IF;
  IF NOT public.compras_pode_loja(v_req.loja_id) THEN RAISE EXCEPTION 'Sem acesso à loja desta requisição'; END IF;

  UPDATE public.compras_requisicoes SET status = 'em_cotacao' WHERE id = p_requisicao_id;
  INSERT INTO public.compras_cotacoes (loja_id, origem, origem_id, sla_interno, status)
    VALUES (v_req.loja_id, 'REQ', p_requisicao_id, now() + interval '5 days', 'em_andamento')
    RETURNING id INTO v_cot;
  INSERT INTO public.compras_cotacao_itens (cotacao_id, loja_id, item_catalogo_id, sku, descricao, unidade, quantidade)
    SELECT v_cot, loja_id, item_catalogo_id, sku, descricao, unidade, quantidade
    FROM public.compras_requisicao_itens WHERE requisicao_id = p_requisicao_id;
  RETURN v_cot;
END; $$;

-- Cotação direta/avulsa (origem DIRETA) — item 2 do ticket
CREATE OR REPLACE FUNCTION public.criar_cotacao_direta(p_loja_id uuid, p_itens jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cot uuid;
BEGIN
  IF NOT public.compras_pode_loja(p_loja_id) THEN RAISE EXCEPTION 'Sem acesso a esta loja'; END IF;
  INSERT INTO public.compras_cotacoes (loja_id, origem, origem_id, sla_interno, status)
    VALUES (p_loja_id, 'DIRETA', NULL, now() + interval '5 days', 'em_andamento')
    RETURNING id INTO v_cot;
  INSERT INTO public.compras_cotacao_itens (cotacao_id, loja_id, item_catalogo_id, sku, descricao, unidade, quantidade)
    SELECT v_cot, p_loja_id, NULLIF(i->>'item_catalogo_id','')::uuid, i->>'sku', i->>'descricao',
           COALESCE(i->>'unidade','UN'), COALESCE((i->>'quantidade')::numeric, 1)
    FROM jsonb_array_elements(COALESCE(p_itens,'[]'::jsonb)) i;
  RETURN v_cot;
END; $$;

-- Pedido de Peças da Manutenção (OS) -> Cotação (origem OS)
CREATE OR REPLACE FUNCTION public.criar_cotacao_de_os(p_os_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_loja uuid; v_pedido jsonb; v_cot uuid;
BEGIN
  SELECT loja_id, pedido_pecas INTO v_loja, v_pedido FROM public.ordens_servico WHERE id = p_os_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF NOT public.compras_pode_loja(v_loja) THEN RAISE EXCEPTION 'Sem acesso à loja desta OS'; END IF;
  IF v_pedido IS NULL OR v_pedido->'itens' IS NULL THEN RAISE EXCEPTION 'OS sem pedido de peças'; END IF;

  INSERT INTO public.compras_cotacoes (loja_id, origem, origem_id, sla_interno, status)
    VALUES (v_loja, 'OS', p_os_id, now() + interval '5 days', 'em_andamento')
    RETURNING id INTO v_cot;
  INSERT INTO public.compras_cotacao_itens (cotacao_id, loja_id, sku, descricao, unidade, quantidade)
    SELECT v_cot, v_loja, i->>'cod', COALESCE(i->>'descr','Item'), 'UN', COALESCE((i->>'qtd')::numeric, 1)
    FROM jsonb_array_elements(v_pedido->'itens') i;
  -- sincroniza status do pedido de peças da OS
  UPDATE public.ordens_servico
     SET pedido_pecas = jsonb_set(pedido_pecas::jsonb, '{status}', '"COMPRADO"'::jsonb)
   WHERE id = p_os_id;
  RETURN v_cot;
END; $$;

-- Gerar Pedido de Compra a partir da cotação aprovada (melhor proposta)
CREATE OR REPLACE FUNCTION public.gerar_pedidos_de_cotacao(p_cotacao_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cot public.compras_cotacoes; v_prop public.compras_cotacao_propostas; v_pedido uuid;
BEGIN
  SELECT * INTO v_cot FROM public.compras_cotacoes WHERE id = p_cotacao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação não encontrada'; END IF;
  IF NOT public.compras_pode_loja(v_cot.loja_id) THEN RAISE EXCEPTION 'Sem acesso à loja desta cotação'; END IF;
  IF v_cot.aprovacao IS NULL THEN RAISE EXCEPTION 'Cotação não aprovada'; END IF;

  SELECT * INTO v_prop FROM public.compras_cotacao_propostas
    WHERE cotacao_id = p_cotacao_id ORDER BY total ASC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cotação sem propostas'; END IF;

  INSERT INTO public.compras_pedidos (loja_id, cotacao_id, fornecedor_id, total, status, condicoes_pagamento, prazo_entrega)
    VALUES (v_cot.loja_id, p_cotacao_id, v_prop.fornecedor_id, v_prop.total, 'emitido', v_prop.condicoes_pagamento, v_prop.prazo_geral_dias)
    RETURNING id INTO v_pedido;
  INSERT INTO public.compras_pedido_itens (pedido_id, loja_id, item_catalogo_id, sku, descricao, quantidade, preco_unit, total)
    SELECT v_pedido, ci.loja_id, ci.item_catalogo_id, ci.sku, ci.descricao, ci.quantidade,
           COALESCE(pi.preco_unit, 0), COALESCE(pi.preco_unit, 0) * ci.quantidade
    FROM public.compras_cotacao_itens ci
    LEFT JOIN public.compras_cotacao_proposta_itens pi
      ON pi.cotacao_item_id = ci.id AND pi.proposta_id = v_prop.id
    WHERE ci.cotacao_id = p_cotacao_id;

  UPDATE public.compras_cotacoes SET status = 'comprado' WHERE id = p_cotacao_id;
  RETURN v_pedido;
END; $$;

-- Registrar Recebimento (transacional: recebimento + estoque + status do pedido)
CREATE OR REPLACE FUNCTION public.registrar_recebimento(p_pedido_id uuid, p_nf jsonb, p_itens jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ped public.compras_pedidos; v_rec uuid; v_item jsonb;
  v_cat uuid; v_qtd numeric; v_total_rec numeric; v_total_ped numeric; v_status text;
BEGIN
  SELECT * INTO v_ped FROM public.compras_pedidos WHERE id = p_pedido_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF NOT public.compras_pode_loja(v_ped.loja_id) THEN RAISE EXCEPTION 'Sem acesso à loja deste pedido'; END IF;

  INSERT INTO public.compras_recebimentos (loja_id, pedido_id, nf_numero, nf_emissao, nf_chave, status)
    VALUES (v_ped.loja_id, p_pedido_id, p_nf->>'numero', NULLIF(p_nf->>'emissao','')::date, p_nf->>'chave', 'parcial')
    RETURNING id INTO v_rec;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_itens,'[]'::jsonb)) LOOP
    v_qtd := COALESCE((v_item->>'quantidade_recebida')::numeric, 0);
    INSERT INTO public.compras_recebimento_itens (recebimento_id, pedido_item_id, loja_id, quantidade_recebida, series, observacao)
      VALUES (v_rec, NULLIF(v_item->>'pedido_item_id','')::uuid, v_ped.loja_id, v_qtd,
              COALESCE(v_item->'series','[]'::jsonb), v_item->>'observacao');

    -- Entrada de estoque quando o item do pedido está ligado ao catálogo
    SELECT item_catalogo_id INTO v_cat FROM public.compras_pedido_itens
      WHERE id = NULLIF(v_item->>'pedido_item_id','')::uuid;
    IF v_cat IS NOT NULL AND v_qtd > 0 THEN
      INSERT INTO public.almox_estoque (loja_id, item_id, controle, saldo, ultima_movimentacao)
        VALUES (v_ped.loja_id, v_cat, 'SALDO', v_qtd, now())
      ON CONFLICT (loja_id, item_id)
        DO UPDATE SET saldo = almox_estoque.saldo + EXCLUDED.saldo, ultima_movimentacao = now();
      INSERT INTO public.almox_movimentos (loja_id, item_id, tipo, quantidade, referencia)
        VALUES (v_ped.loja_id, v_cat, 'ENTRADA_PO', v_qtd, v_ped.numero);
    END IF;
  END LOOP;

  -- Recalcula status do pedido: total recebido (acumulado) vs total pedido
  SELECT COALESCE(SUM(ri.quantidade_recebida),0) INTO v_total_rec
    FROM public.compras_recebimento_itens ri
    JOIN public.compras_recebimentos r ON r.id = ri.recebimento_id
   WHERE r.pedido_id = p_pedido_id;
  SELECT COALESCE(SUM(quantidade),0) INTO v_total_ped
    FROM public.compras_pedido_itens WHERE pedido_id = p_pedido_id;

  v_status := CASE WHEN v_total_rec >= v_total_ped THEN 'total' ELSE 'parcial' END;
  UPDATE public.compras_pedidos SET status = v_status WHERE id = p_pedido_id;
  UPDATE public.compras_recebimentos SET status = v_status WHERE id = v_rec;
  RETURN v_rec;
END; $$;

-- Ajuste manual de saldo (Estoque / Inventário)
CREATE OR REPLACE FUNCTION public.ajustar_saldo_estoque(p_item_id uuid, p_loja_id uuid, p_diferenca numeric, p_justificativa text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.compras_pode_loja(p_loja_id) THEN RAISE EXCEPTION 'Sem acesso a esta loja'; END IF;
  INSERT INTO public.almox_estoque (loja_id, item_id, controle, saldo, ultima_movimentacao)
    VALUES (p_loja_id, p_item_id, 'SALDO', p_diferenca, now())
  ON CONFLICT (loja_id, item_id)
    DO UPDATE SET saldo = almox_estoque.saldo + EXCLUDED.saldo, ultima_movimentacao = now();
  INSERT INTO public.almox_movimentos (loja_id, item_id, tipo, quantidade, observacao)
    VALUES (p_loja_id, p_item_id, CASE WHEN p_diferenca >= 0 THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END, p_diferenca, p_justificativa);
END; $$;

-- Permissões das RPCs
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.criar_cotacao_de_requisicao(uuid)',
    'public.criar_cotacao_direta(uuid, jsonb)',
    'public.criar_cotacao_de_os(uuid)',
    'public.gerar_pedidos_de_cotacao(uuid)',
    'public.registrar_recebimento(uuid, jsonb, jsonb)',
    'public.ajustar_saldo_estoque(uuid, uuid, numeric, text)',
    'public.compras_pode_loja(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;
