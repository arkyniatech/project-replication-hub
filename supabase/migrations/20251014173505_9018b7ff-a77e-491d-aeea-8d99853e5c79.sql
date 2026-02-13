-- SOL-MAN-2: Solicitação de Manutenção com Supabase
-- ETAPA 1: Tabelas & RLS

-- 1) Cabeçalho da Solicitação
CREATE TABLE IF NOT EXISTS public.solicitacao_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  cliente_nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('SUPORTE_CAMPO','TROCA_COM_SUBSTITUICAO')),
  prioridade TEXT NOT NULL CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','CRITICA')),
  sintomas TEXT NOT NULL,
  janela_data DATE,
  janela_periodo TEXT CHECK (janela_periodo IN ('MANHA','TARDE','COMERCIAL')),
  assistente_sugestao JSONB,
  os_id UUID,
  substituto JSONB,
  laudo JSONB,
  sla_horas INTEGER,
  status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','AGUARDANDO_RETIRADA','EM_ROTA','RECEBIDA_OFICINA','EM_DIAGNOSTICO','AGUARDANDO_PECA','CONCLUIDA','CANCELADA')),
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2) Itens da Solicitação
CREATE TABLE IF NOT EXISTS public.solicitacao_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacao_manutencao(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('SERIALIZADO','SALDO')),
  equip_id UUID,
  modelo_id UUID NOT NULL,
  grupo_id UUID NOT NULL,
  qtd NUMERIC(12,3) NOT NULL DEFAULT 1,
  codigo_interno TEXT
);

-- 3) Timeline (auditoria imutável)
CREATE TABLE IF NOT EXISTS public.solicitacao_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacao_manutencao(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL,
  acao TEXT NOT NULL,
  payload JSONB
);

-- 4) Anexos (metadados)
CREATE TABLE IF NOT EXISTS public.solicitacao_anexo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacao_manutencao(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('FOTO','DOC')),
  path TEXT NOT NULL,
  size_bytes INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Event-bus para integrações internas
CREATE TABLE IF NOT EXISTS public.manut_event_bus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  solicitacao_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('CRIADA','TROCA_CRIADA','LAUDO_REGISTRADO','ATUALIZAR_AGENDA','NOTIFICAR_OFICINA')),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ETAPA 2: Enable RLS
ALTER TABLE public.solicitacao_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_anexo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manut_event_bus ENABLE ROW LEVEL SECURITY;

-- ETAPA 3: RLS Policies

-- Solicitação Manutenção
CREATE POLICY "Solicitações visíveis para usuários da loja"
ON public.solicitacao_manutencao FOR SELECT
USING (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
));

CREATE POLICY "Vendedor pode criar solicitações"
ON public.solicitacao_manutencao FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'vendedor'::app_role) OR 
   has_role(auth.uid(), 'gestor'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role)) AND
  loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);

CREATE POLICY "Usuário pode atualizar solicitações da loja"
ON public.solicitacao_manutencao FOR UPDATE
USING (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
))
WITH CHECK (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
));

CREATE POLICY "Admin/Gestor podem deletar solicitações"
ON public.solicitacao_manutencao FOR DELETE
USING (
  (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND
  loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
);

-- Itens (herdam restrição por join)
CREATE POLICY "Itens visíveis via solicitação"
ON public.solicitacao_item FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s 
  WHERE s.id = solicitacao_id 
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s 
  WHERE s.id = solicitacao_id 
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
));

-- Timeline (herdam restrição por join)
CREATE POLICY "Timeline visível via solicitação"
ON public.solicitacao_timeline FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s 
  WHERE s.id = solicitacao_id 
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s 
  WHERE s.id = solicitacao_id 
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
));

-- Anexos (herdam restrição por join)
CREATE POLICY "Anexos visíveis via solicitação"
ON public.solicitacao_anexo FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s 
  WHERE s.id = solicitacao_id 
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.solicitacao_manutencao s 
  WHERE s.id = solicitacao_id 
  AND s.loja_id IN (SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid())
));

-- Event Bus
CREATE POLICY "Event bus visível por loja"
ON public.manut_event_bus FOR ALL
USING (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
))
WITH CHECK (loja_id IN (
  SELECT loja_id FROM user_lojas_permitidas WHERE user_id = auth.uid()
));

-- ETAPA 4: RPCs para regras de negócio

-- RPC 1: Criar Solicitação
CREATE OR REPLACE FUNCTION public.rpc_criar_solicitacao(p JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_sla INTEGER;
BEGIN
  -- Calcular SLA baseado na prioridade
  v_sla := COALESCE(
    (p->>'sla_horas')::INTEGER,
    CASE p->>'prioridade'
      WHEN 'CRITICA' THEN 8
      WHEN 'ALTA' THEN 24
      WHEN 'MEDIA' THEN 48
      ELSE 72
    END
  );

  -- Inserir cabeçalho
  INSERT INTO public.solicitacao_manutencao (
    id, loja_id, contrato_id, cliente_id, cliente_nome, tipo, prioridade, 
    sintomas, janela_data, janela_periodo, assistente_sugestao, sla_horas, 
    status, created_by
  ) VALUES (
    v_id,
    (p->>'loja_id')::UUID,
    (p->>'contrato_id')::UUID,
    (p->>'cliente_id')::UUID,
    p->>'cliente_nome',
    p->>'tipo',
    p->>'prioridade',
    p->>'sintomas',
    (p->>'janela_data')::DATE,
    p->>'janela_periodo',
    p->'assistente_sugestao',
    v_sla,
    'ABERTA',
    auth.uid()
  );

  -- Inserir itens
  INSERT INTO public.solicitacao_item (solicitacao_id, tipo, equip_id, modelo_id, grupo_id, qtd, codigo_interno)
  SELECT 
    v_id,
    i->>'tipo',
    (i->>'equip_id')::UUID,
    (i->>'modelo_id')::UUID,
    (i->>'grupo_id')::UUID,
    COALESCE((i->>'qtd')::NUMERIC, 1),
    i->>'codigo_interno'
  FROM jsonb_array_elements(p->'itens') i;

  -- Inserir timeline inicial
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'CRIADA', p);

  -- Publicar evento
  INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
  VALUES (
    (p->>'loja_id')::UUID,
    v_id,
    'CRIADA',
    jsonb_build_object('contrato_id', p->>'contrato_id')
  );

  RETURN v_id;
END;
$$;

-- RPC 2: Mudar Status
CREATE OR REPLACE FUNCTION public.rpc_mudar_status(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
  v_novo TEXT := p->>'status';
  v_ant TEXT;
  v_loja_id UUID;
BEGIN
  -- Buscar status anterior e loja_id
  SELECT status, loja_id INTO v_ant, v_loja_id
  FROM public.solicitacao_manutencao
  WHERE id = v_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Validações de transição
  IF v_ant = 'ABERTA' AND v_novo NOT IN ('AGUARDANDO_RETIRADA','EM_ROTA','CANCELADA') THEN
    RAISE EXCEPTION 'Transição inválida de % para %', v_ant, v_novo;
  END IF;

  IF v_ant = 'CANCELADA' OR v_ant = 'CONCLUIDA' THEN
    RAISE EXCEPTION 'Não é possível alterar status de solicitação %', v_ant;
  END IF;

  -- Atualizar status
  UPDATE public.solicitacao_manutencao
  SET status = v_novo, updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'STATUS_MUDOU', jsonb_build_object('de', v_ant, 'para', v_novo));

  -- Acionar eventos auxiliares
  IF v_novo = 'AGUARDANDO_RETIRADA' THEN
    INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
    VALUES (v_loja_id, v_id, 'ATUALIZAR_AGENDA', jsonb_build_object('acao', 'bloquear'));
  END IF;
END;
$$;

-- RPC 3: Registrar Laudo
CREATE OR REPLACE FUNCTION public.rpc_registrar_laudo(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
  v_loja_id UUID;
BEGIN
  -- Atualizar laudo
  UPDATE public.solicitacao_manutencao
  SET laudo = p->'laudo', updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id
  RETURNING loja_id INTO v_loja_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'LAUDO_REGISTRADO', p->'laudo');

  -- Se mau uso, publicar evento para Comercial
  IF (p->'laudo'->>'tipo') = 'MAU_USO' THEN
    INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
    VALUES (v_loja_id, v_id, 'LAUDO_REGISTRADO', p->'laudo');
  END IF;
END;
$$;

-- RPC 4: Criar OS de Solicitação
CREATE OR REPLACE FUNCTION public.rpc_criar_os_de_solicitacao(p JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
  v_os UUID := gen_random_uuid();
  v_loja_id UUID;
BEGIN
  -- Atualizar com os_id
  UPDATE public.solicitacao_manutencao
  SET os_id = v_os, updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id
  RETURNING loja_id INTO v_loja_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'OS_CRIADA', jsonb_build_object('os_id', v_os));

  -- Publicar evento para Oficina
  INSERT INTO public.manut_event_bus (loja_id, solicitacao_id, tipo, payload)
  VALUES (v_loja_id, v_id, 'NOTIFICAR_OFICINA', jsonb_build_object('os_id', v_os));

  RETURN v_os;
END;
$$;

-- RPC 5: Aplicar Substituição
CREATE OR REPLACE FUNCTION public.rpc_aplicar_substituicao(p JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID := (p->>'id')::UUID;
BEGIN
  -- Atualizar substituto
  UPDATE public.solicitacao_manutencao
  SET substituto = p->'substituto', updated_at = NOW(), updated_by = auth.uid()
  WHERE id = v_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;

  -- Registrar na timeline
  INSERT INTO public.solicitacao_timeline (solicitacao_id, user_id, acao, payload)
  VALUES (v_id, auth.uid(), 'SUBSTITUICAO_APLICADA', p);
END;
$$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitacao_loja_status ON public.solicitacao_manutencao(loja_id, status);
CREATE INDEX IF NOT EXISTS idx_solicitacao_contrato ON public.solicitacao_manutencao(contrato_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_cliente ON public.solicitacao_manutencao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_created ON public.solicitacao_manutencao(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_bus_loja ON public.manut_event_bus(loja_id, created_at DESC);