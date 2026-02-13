-- ============================================================================
-- CONTAS A PAGAR - ESTRUTURA COMPLETA
-- ============================================================================

-- 1. ENUMS
CREATE TYPE status_titulo_pagar AS ENUM ('EM_EDICAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO', 'CANCELADO', 'CONCLUIDO');
CREATE TYPE status_parcela_pagar AS ENUM ('A_VENCER', 'VENCIDA', 'PAGA', 'PARCIAL', 'SUSPENSA', 'NEGOCIACAO');
CREATE TYPE tipo_conta_financeira AS ENUM ('BANCO', 'CAIXA', 'CARTAO');
CREATE TYPE status_aprovacao AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO');
CREATE TYPE nivel_aprovacao AS ENUM ('FINANCEIRO', 'GESTOR', 'DIRECAO');
CREATE TYPE tipo_categoria AS ENUM ('DESPESA', 'RECEITA');

-- ============================================================================
-- 2. TABELAS
-- ============================================================================

-- 2.1. Categorias N2 (Plano de Contas)
CREATE TABLE public.categorias_n2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  descricao text NOT NULL,
  tipo tipo_categoria NOT NULL,
  nivel_1 text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.2. Contas Financeiras
CREATE TABLE public.contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id) NOT NULL,
  codigo text NOT NULL,
  nome text NOT NULL,
  banco text,
  agencia text,
  numero text,
  tipo tipo_conta_financeira NOT NULL,
  moeda text DEFAULT 'BRL',
  saldo_atual numeric(12,2) DEFAULT 0,
  bloqueios numeric(12,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(loja_id, codigo)
);

-- 2.3. Títulos a Pagar
CREATE TABLE public.titulos_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid REFERENCES public.lojas(id) NOT NULL,
  numero text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) NOT NULL,
  categoria_codigo text REFERENCES public.categorias_n2(codigo),
  cc_id uuid REFERENCES public.centros_custo(id),
  valor_total numeric(12,2) NOT NULL,
  qtd_parcelas integer NOT NULL DEFAULT 1,
  vencimento_inicial date NOT NULL,
  condicao text,
  doc_tipo text,
  doc_numero text,
  chave_fiscal_44 text,
  emissao date,
  status status_titulo_pagar DEFAULT 'EM_EDICAO',
  observacoes text,
  anexos jsonb DEFAULT '[]'::jsonb,
  timeline jsonb DEFAULT '[]'::jsonb,
  dup_justificativa text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ativo boolean DEFAULT true,
  UNIQUE(loja_id, numero)
);

-- 2.4. Parcelas a Pagar
CREATE TABLE public.parcelas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id uuid REFERENCES public.titulos_pagar(id) ON DELETE CASCADE NOT NULL,
  loja_id uuid REFERENCES public.lojas(id) NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) NOT NULL,
  categoria_codigo text REFERENCES public.categorias_n2(codigo),
  numero_parcela integer NOT NULL,
  vencimento date NOT NULL,
  valor numeric(12,2) NOT NULL,
  pago numeric(12,2) DEFAULT 0,
  saldo numeric(12,2) GENERATED ALWAYS AS (valor - pago) STORED,
  status status_parcela_pagar DEFAULT 'A_VENCER',
  conta_preferencial_id uuid REFERENCES public.contas_financeiras(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  observacoes text,
  reprogramacoes jsonb DEFAULT '[]'::jsonb,
  anexos jsonb DEFAULT '[]'::jsonb,
  suspensa boolean DEFAULT false,
  motivo_suspensao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.5. Movimentos (Pagamentos)
CREATE TABLE public.movimentos_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id uuid REFERENCES public.parcelas_pagar(id) ON DELETE CASCADE NOT NULL,
  titulo_id uuid REFERENCES public.titulos_pagar(id) NOT NULL,
  conta_id uuid REFERENCES public.contas_financeiras(id) NOT NULL,
  loja_id uuid REFERENCES public.lojas(id) NOT NULL,
  data_pagamento date NOT NULL,
  valor_bruto numeric(12,2) NOT NULL,
  juros numeric(12,2) DEFAULT 0,
  multa numeric(12,2) DEFAULT 0,
  desconto numeric(12,2) DEFAULT 0,
  valor_liquido numeric(12,2) GENERATED ALWAYS AS (valor_bruto + juros + multa - desconto) STORED,
  forma text NOT NULL,
  comprovante_url text,
  observacoes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 2.6. Budget/Metas
CREATE TABLE public.budget_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  loja_id uuid REFERENCES public.lojas(id) NOT NULL,
  categoria_codigo text REFERENCES public.categorias_n2(codigo) NOT NULL,
  meta numeric(12,2) NOT NULL,
  observacoes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(periodo, loja_id, categoria_codigo)
);

-- 2.7. Fechamentos
CREATE TABLE public.fechamentos_cp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL,
  loja_id uuid REFERENCES public.lojas(id) NOT NULL,
  fechado boolean DEFAULT false,
  fechado_em timestamptz,
  fechado_por uuid,
  checklist jsonb,
  motivo_reabertura text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(periodo, loja_id)
);

-- 2.8. Aprovações
CREATE TABLE public.aprovacoes_cp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo_id uuid REFERENCES public.titulos_pagar(id) ON DELETE CASCADE NOT NULL,
  valor numeric(12,2) NOT NULL,
  status status_aprovacao DEFAULT 'PENDENTE',
  nivel nivel_aprovacao NOT NULL,
  historico jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. ÍNDICES
-- ============================================================================

CREATE INDEX idx_titulos_pagar_loja ON public.titulos_pagar(loja_id);
CREATE INDEX idx_titulos_pagar_fornecedor ON public.titulos_pagar(fornecedor_id);
CREATE INDEX idx_titulos_pagar_status ON public.titulos_pagar(status);

CREATE INDEX idx_parcelas_pagar_titulo ON public.parcelas_pagar(titulo_id);
CREATE INDEX idx_parcelas_pagar_loja ON public.parcelas_pagar(loja_id);
CREATE INDEX idx_parcelas_pagar_vencimento ON public.parcelas_pagar(vencimento);
CREATE INDEX idx_parcelas_pagar_status ON public.parcelas_pagar(status);

CREATE INDEX idx_movimentos_pagar_parcela ON public.movimentos_pagar(parcela_id);
CREATE INDEX idx_movimentos_pagar_conta ON public.movimentos_pagar(conta_id);

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- 4.1. Atualizar updated_at
CREATE TRIGGER update_titulos_pagar_updated_at
  BEFORE UPDATE ON public.titulos_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parcelas_pagar_updated_at
  BEFORE UPDATE ON public.parcelas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categorias_n2_updated_at
  BEFORE UPDATE ON public.categorias_n2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contas_financeiras_updated_at
  BEFORE UPDATE ON public.contas_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4.2. Atualizar status da parcela após pagamento
CREATE OR REPLACE FUNCTION public.atualizar_status_parcela()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_pago numeric;
  v_valor numeric;
BEGIN
  -- Buscar valor total e pago da parcela
  SELECT valor, COALESCE(SUM(m.valor_liquido), 0) INTO v_valor, v_total_pago
  FROM parcelas_pagar p
  LEFT JOIN movimentos_pagar m ON m.parcela_id = p.id
  WHERE p.id = NEW.parcela_id
  GROUP BY p.valor;
  
  -- Atualizar status baseado no pagamento
  UPDATE parcelas_pagar
  SET 
    pago = v_total_pago,
    status = CASE
      WHEN v_total_pago >= v_valor THEN 'PAGA'::status_parcela_pagar
      WHEN v_total_pago > 0 THEN 'PARCIAL'::status_parcela_pagar
      WHEN vencimento < CURRENT_DATE THEN 'VENCIDA'::status_parcela_pagar
      ELSE 'A_VENCER'::status_parcela_pagar
    END
  WHERE id = NEW.parcela_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_status_parcela
  AFTER INSERT ON public.movimentos_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_status_parcela();

-- ============================================================================
-- 5. FUNÇÕES AUXILIARES
-- ============================================================================

-- 5.1. Verificar se período está fechado
CREATE OR REPLACE FUNCTION public.is_periodo_fechado(p_loja_id uuid, p_data date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM fechamentos_cp 
    WHERE loja_id = p_loja_id 
      AND periodo = to_char(p_data, 'YYYY-MM')
      AND fechado = true
  );
$$;

-- 5.2. Gerar número de título a pagar
CREATE OR REPLACE FUNCTION public.gerar_numero_titulo_pagar(p_loja_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contador integer;
  v_numero text;
BEGIN
  -- Incrementar contador
  INSERT INTO contadores_documentos (loja_id, tipo, chave_contador, contador_atual, ultimo_uso)
  VALUES (p_loja_id, 'TIT_PAGAR', 'TIT_PAGAR', 1, now())
  ON CONFLICT (loja_id, tipo, chave_contador)
  DO UPDATE SET 
    contador_atual = contadores_documentos.contador_atual + 1,
    ultimo_uso = now(),
    updated_at = now()
  RETURNING contador_atual INTO v_contador;
  
  v_numero := 'TIT-' || LPAD(v_contador::text, 6, '0');
  
  RETURN v_numero;
END;
$$;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- 6.1. categorias_n2
ALTER TABLE public.categorias_n2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias visíveis para autenticados"
  ON public.categorias_n2 FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin/Financeiro podem gerenciar categorias"
  ON public.categorias_n2 FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'financeiro'::app_role)
  );

-- 6.2. contas_financeiras
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contas visíveis para usuários da loja"
  ON public.contas_financeiras FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Financeiro podem gerenciar contas"
  ON public.contas_financeiras FOR ALL
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'financeiro'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- 6.3. titulos_pagar
ALTER TABLE public.titulos_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Títulos visíveis para usuários da loja"
  ON public.titulos_pagar FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro/Gestor podem criar títulos"
  ON public.titulos_pagar FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'financeiro'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro/Gestor podem atualizar títulos"
  ON public.titulos_pagar FOR UPDATE
  USING (
    (has_role(auth.uid(), 'financeiro'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode deletar títulos"
  ON public.titulos_pagar FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6.4. parcelas_pagar
ALTER TABLE public.parcelas_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parcelas visíveis para usuários da loja"
  ON public.parcelas_pagar FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro pode gerenciar parcelas"
  ON public.parcelas_pagar FOR ALL
  USING (
    (has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- 6.5. movimentos_pagar
ALTER TABLE public.movimentos_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Movimentos visíveis para usuários da loja"
  ON public.movimentos_pagar FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro pode registrar pagamentos"
  ON public.movimentos_pagar FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- 6.6. budget_metas
ALTER TABLE public.budget_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Metas visíveis para usuários da loja"
  ON public.budget_metas FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro/Gestor podem gerenciar metas"
  ON public.budget_metas FOR ALL
  USING (
    (has_role(auth.uid(), 'financeiro'::app_role) OR 
     has_role(auth.uid(), 'gestor'::app_role) OR 
     has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- 6.7. fechamentos_cp
ALTER TABLE public.fechamentos_cp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fechamentos visíveis para usuários da loja"
  ON public.fechamentos_cp FOR SELECT
  USING (
    loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Financeiro/Admin podem gerenciar fechamentos"
  ON public.fechamentos_cp FOR ALL
  USING (
    (has_role(auth.uid(), 'financeiro'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
    AND loja_id IN (
      SELECT loja_id FROM user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- 6.8. aprovacoes_cp
ALTER TABLE public.aprovacoes_cp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovações visíveis para usuários autorizados"
  ON public.aprovacoes_cp FOR SELECT
  USING (
    has_role(auth.uid(), 'financeiro'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Usuários autorizados podem gerenciar aprovações"
  ON public.aprovacoes_cp FOR ALL
  USING (
    has_role(auth.uid(), 'financeiro'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );