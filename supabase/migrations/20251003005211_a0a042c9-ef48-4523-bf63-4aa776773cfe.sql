-- ======================================
-- FASE 4: CAIXA DO DIA & TRANSFERÊNCIAS (CORRIGIDO)
-- ======================================

-- ENUM para status de caixa
CREATE TYPE status_caixa AS ENUM ('ABERTO', 'FECHADO');

-- ENUM para tipo de movimento
CREATE TYPE tipo_movimento_caixa AS ENUM ('ENTRADA', 'SAIDA');

-- ENUM para formas de pagamento
CREATE TYPE forma_pagamento AS ENUM ('PIX', 'CARTAO', 'DINHEIRO', 'BOLETO', 'TRANSFERENCIA');

-- ENUM para status de transferência
CREATE TYPE status_transferencia AS ENUM ('CRIADA', 'EM_TRANSITO', 'RECEBIDA', 'RECUSADA', 'CANCELADA');

-- ENUM para tipo de item de transferência
CREATE TYPE tipo_item_transferencia AS ENUM ('SERIAL', 'SALDO');

-- ENUM para motivo de recusa
CREATE TYPE motivo_recusa_transferencia AS ENUM ('NUMERACAO', 'DANO', 'DESTINO', 'OUTRO');

-- ======================================
-- TABELA: caixa
-- ======================================
CREATE TABLE IF NOT EXISTS public.caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  data_iso DATE NOT NULL,
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  status status_caixa NOT NULL DEFAULT 'ABERTO',
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  observacao_abertura TEXT,
  aberto_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fechamento JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(loja_id, usuario_id, data_iso, status)
);

CREATE INDEX idx_caixa_ativo ON public.caixa(loja_id, usuario_id, status) WHERE status = 'ABERTO';
CREATE INDEX idx_caixa_data ON public.caixa(loja_id, data_iso DESC);

-- ======================================
-- TABELA: movimentos_caixa
-- ======================================
CREATE TABLE IF NOT EXISTS public.movimentos_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID NOT NULL REFERENCES public.caixa(id) ON DELETE CASCADE,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID NOT NULL,
  usuario_nome TEXT NOT NULL,
  tipo tipo_movimento_caixa NOT NULL,
  forma forma_pagamento NOT NULL,
  valor_bruto NUMERIC NOT NULL,
  desconto NUMERIC NOT NULL DEFAULT 0,
  juros_multa NUMERIC NOT NULL DEFAULT 0,
  valor_liquido NUMERIC NOT NULL,
  origem TEXT NOT NULL,
  refs JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentos_caixa_caixa ON public.movimentos_caixa(caixa_id, ts DESC);
CREATE INDEX idx_movimentos_caixa_loja ON public.movimentos_caixa(loja_id, ts DESC);

-- ======================================
-- TABELA: transferencias
-- ======================================
CREATE TABLE IF NOT EXISTS public.transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL,
  origem_loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
  destino_loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE RESTRICT,
  motorista TEXT,
  veiculo TEXT,
  observacoes TEXT,
  status status_transferencia NOT NULL DEFAULT 'CRIADA',
  recusa JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  
  CHECK (origem_loja_id != destino_loja_id)
);

CREATE INDEX idx_transferencias_origem ON public.transferencias(origem_loja_id, status, created_at DESC);
CREATE INDEX idx_transferencias_destino ON public.transferencias(destino_loja_id, status, created_at DESC);
CREATE INDEX idx_transferencias_numero ON public.transferencias(numero);

-- ======================================
-- TABELA: transferencia_itens
-- ======================================
CREATE TABLE IF NOT EXISTS public.transferencia_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transferencia_id UUID NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
  tipo tipo_item_transferencia NOT NULL,
  codigo_interno TEXT,
  modelo_id UUID NOT NULL REFERENCES public.modelos_equipamentos(id) ON DELETE RESTRICT,
  grupo_id UUID NOT NULL REFERENCES public.grupos_equipamentos(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL,
  serie TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CHECK (tipo = 'SALDO' OR (tipo = 'SERIAL' AND codigo_interno IS NOT NULL))
);

CREATE INDEX idx_transferencia_itens_transferencia ON public.transferencia_itens(transferencia_id);

-- ======================================
-- TABELA: transferencia_logs
-- ======================================
CREATE TABLE IF NOT EXISTS public.transferencia_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transferencia_id UUID NOT NULL REFERENCES public.transferencias(id) ON DELETE CASCADE,
  em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  por_usuario_id UUID NOT NULL,
  por_usuario_nome TEXT NOT NULL,
  acao TEXT NOT NULL,
  detalhe TEXT
);

CREATE INDEX idx_transferencia_logs_transferencia ON public.transferencia_logs(transferencia_id, em DESC);

-- ======================================
-- ROW LEVEL SECURITY (RLS)
-- ======================================

ALTER TABLE public.caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentos_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencia_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencia_logs ENABLE ROW LEVEL SECURITY;

-- ======================================
-- POLÍTICAS RLS: caixa
-- ======================================

CREATE POLICY "Usuários veem caixas de suas lojas"
  ON public.caixa FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendedor/Gestor podem criar caixa"
  ON public.caixa FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR 
     has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Usuário pode atualizar seu próprio caixa"
  ON public.caixa FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar caixas"
  ON public.caixa FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ======================================
-- POLÍTICAS RLS: movimentos_caixa
-- ======================================

CREATE POLICY "Usuários veem movimentos de suas lojas"
  ON public.movimentos_caixa FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendedor/Gestor podem criar movimentos"
  ON public.movimentos_caixa FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR 
     has_role(auth.uid(), 'financeiro') OR has_role(auth.uid(), 'admin'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar movimentos"
  ON public.movimentos_caixa FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ======================================
-- POLÍTICAS RLS: transferencias
-- ======================================

CREATE POLICY "Usuários veem transferências de suas lojas"
  ON public.transferencias FOR SELECT
  USING (
    origem_loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
    OR destino_loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendedor/Gestor podem criar transferências"
  ON public.transferencias FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND origem_loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Vendedor/Gestor podem atualizar transferências"
  ON public.transferencias FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
    AND (
      origem_loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas
        WHERE user_id = auth.uid()
      )
      OR destino_loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin pode deletar transferências"
  ON public.transferencias FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ======================================
-- POLÍTICAS RLS: transferencia_itens
-- ======================================

CREATE POLICY "Usuários veem itens de transferências permitidas"
  ON public.transferencia_itens FOR SELECT
  USING (
    transferencia_id IN (
      SELECT id FROM public.transferencias
      WHERE origem_loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas
        WHERE user_id = auth.uid()
      )
      OR destino_loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Vendedor/Gestor podem criar itens de transferência"
  ON public.transferencia_itens FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Vendedor/Gestor podem atualizar itens"
  ON public.transferencia_itens FOR UPDATE
  USING (
    (has_role(auth.uid(), 'vendedor') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admin pode deletar itens"
  ON public.transferencia_itens FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ======================================
-- POLÍTICAS RLS: transferencia_logs
-- ======================================

CREATE POLICY "Usuários veem logs de transferências permitidas"
  ON public.transferencia_logs FOR SELECT
  USING (
    transferencia_id IN (
      SELECT id FROM public.transferencias
      WHERE origem_loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas
        WHERE user_id = auth.uid()
      )
      OR destino_loja_id IN (
        SELECT loja_id FROM public.user_lojas_permitidas
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Sistema pode criar logs"
  ON public.transferencia_logs FOR INSERT
  WITH CHECK (true);

-- ======================================
-- TRIGGERS
-- ======================================

CREATE TRIGGER update_caixa_updated_at
  BEFORE UPDATE ON public.caixa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transferencias_updated_at
  BEFORE UPDATE ON public.transferencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();