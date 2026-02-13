-- ============================================
-- TABELAS DE CONFIGURAÇÃO DO SISTEMA
-- ============================================

-- 1. Configurações de Organização (empresa, logo, cores)
CREATE TABLE IF NOT EXISTS public.config_organizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  isento_ie BOOLEAN DEFAULT false,
  email_fiscal TEXT,
  telefone TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  cores JSONB DEFAULT '{"primaria": "#F97316", "secundaria": "#111827"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(loja_id)
);

-- 2. Configurações Financeiras
CREATE TABLE IF NOT EXISTS public.config_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  formas_ativas JSONB DEFAULT '["PIX","Boleto","Cartão","Dinheiro","Transferência"]'::jsonb,
  forma_preferencial TEXT DEFAULT 'PIX',
  ordem_exibicao JSONB DEFAULT '["PIX","Boleto","Cartão","Dinheiro","Transferência"]'::jsonb,
  multa_percent NUMERIC(5,2) DEFAULT 2.00,
  juros_dia_percent NUMERIC(5,3) DEFAULT 0.033,
  carencia_dias INTEGER DEFAULT 0,
  arredondamento INTEGER DEFAULT 2,
  mensagem_padrao TEXT,
  contas_bancarias JSONB DEFAULT '[]'::jsonb,
  chave_pix TEXT,
  instrucao_transferencia TEXT,
  mostrar_na_fatura BOOLEAN DEFAULT true,
  tipo_padrao_fatura TEXT DEFAULT 'DEMONSTRATIVO',
  vencimento_padrao_dias INTEGER DEFAULT 0,
  mostrar_qr_pix BOOLEAN DEFAULT true,
  mostrar_linha_boleto BOOLEAN DEFAULT true,
  mensagem_cobranca_padrao TEXT,
  cc_padrao_por_categoria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(loja_id)
);

-- 3. Configurações de Numeração de Documentos
CREATE TABLE IF NOT EXISTS public.config_numeracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'contrato', 'aditivo', 'fatura', 'titulo', 'os'
  prefixo TEXT NOT NULL,
  template TEXT NOT NULL,
  reset_contador TEXT DEFAULT 'NUNCA', -- 'NUNCA', 'ANUAL', 'MENSAL'
  por_unidade BOOLEAN DEFAULT false,
  bloqueado_apos_uso BOOLEAN DEFAULT true,
  primeiro_uso_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(loja_id, tipo)
);

-- 4. Configurações de Segurança
CREATE TABLE IF NOT EXISTS public.config_seguranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  politica_senha TEXT DEFAULT 'PADRAO', -- 'PADRAO', 'FORTE'
  dois_fatores BOOLEAN DEFAULT false,
  sessao_minutos INTEGER DEFAULT 480,
  exigir_aceite_lgpd BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(loja_id)
);

-- 5. Configurações de Parametrizações de Locação
CREATE TABLE IF NOT EXISTS public.config_locacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  -- Contrato
  renovacao JSONB DEFAULT '{"modo": "MANUAL", "duracaoPadrao": 7, "bloqueioInadimplente": true}'::jsonb,
  substituicao JSONB DEFAULT '{"mesmoGrupo": true, "preservarPreco": true}'::jsonb,
  devolucao JSONB DEFAULT '{"parcial": true, "liberaEstoque": true, "toleranciaHoras": 2}'::jsonb,
  checklist JSONB DEFAULT '{"entregaObrigatoria": true, "retornoObrigatorio": true, "itensObrigatorios": ["Fotos","Laudo","Assinatura"]}'::jsonb,
  bloqueios JSONB DEFAULT '{"novosContratosSeInadimplente": true, "wizardAviso": true}'::jsonb,
  -- Logística
  janelas JSONB DEFAULT '[{"nome":"Manhã", "inicio":"08:00", "fim":"12:00"}, {"nome":"Tarde","inicio":"13:00","fim":"18:00"}]'::jsonb,
  prazo_min_horas INTEGER DEFAULT 4,
  tolerancia_inicio_min INTEGER DEFAULT 30,
  tolerancia_fim_min INTEGER DEFAULT 30,
  responsavel_obrigatorio BOOLEAN DEFAULT true,
  comprovante_digital BOOLEAN DEFAULT true,
  frete_por_zona JSONB DEFAULT '{"habilitado": false, "tabela": []}'::jsonb,
  -- Manutenção & OS
  status_manutencao JSONB DEFAULT '["Aberta","Em Execução","Testes","Liberada","Cancelada"]'::jsonb,
  transicoes JSONB DEFAULT '{}'::jsonb,
  motivos_parada JSONB DEFAULT '["Peça aguardando","Dano identificado"]'::jsonb,
  exigir_foto_laudo BOOLEAN DEFAULT true,
  acao_rapida_equip BOOLEAN DEFAULT true,
  -- Pró-rata & Faturamento
  prorata_metodo TEXT DEFAULT 'DIARIA_EXATA',
  arredondamento INTEGER DEFAULT 2,
  faturamento_parcial JSONB DEFAULT '{"permitir": true, "adicionarDiferencas": true}'::jsonb,
  multa_percent NUMERIC(5,2) DEFAULT 2.00,
  juros_dia_percent NUMERIC(5,3) DEFAULT 0.033,
  -- Automação
  renovacao_aviso BOOLEAN DEFAULT true,
  devolucao_fatura BOOLEAN DEFAULT true,
  quita_desbloqueio BOOLEAN DEFAULT true,
  recebimento_foca_caixa BOOLEAN DEFAULT true,
  snackbar_proximo_passo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(loja_id)
);

-- ============================================
-- TRIGGERS DE UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_config_organizacao_updated_at
  BEFORE UPDATE ON public.config_organizacao
  FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

CREATE TRIGGER update_config_financeiro_updated_at
  BEFORE UPDATE ON public.config_financeiro
  FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

CREATE TRIGGER update_config_numeracao_updated_at
  BEFORE UPDATE ON public.config_numeracao
  FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

CREATE TRIGGER update_config_seguranca_updated_at
  BEFORE UPDATE ON public.config_seguranca
  FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

CREATE TRIGGER update_config_locacao_updated_at
  BEFORE UPDATE ON public.config_locacao
  FOR EACH ROW EXECUTE FUNCTION update_config_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.config_organizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_numeracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_seguranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_locacao ENABLE ROW LEVEL SECURITY;

-- Políticas para config_organizacao
CREATE POLICY "Usuários veem config da sua loja"
  ON public.config_organizacao FOR SELECT
  TO authenticated
  USING (loja_id IN (
    SELECT loja_id FROM public.user_lojas_permitidas 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Gestor podem atualizar config organização"
  ON public.config_organizacao FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Gestor podem inserir config organização"
  ON public.config_organizacao FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para config_financeiro
CREATE POLICY "Usuários veem config financeiro da sua loja"
  ON public.config_financeiro FOR SELECT
  TO authenticated
  USING (loja_id IN (
    SELECT loja_id FROM public.user_lojas_permitidas 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Financeiro podem atualizar config financeiro"
  ON public.config_financeiro FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Financeiro podem inserir config financeiro"
  ON public.config_financeiro FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'financeiro'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para config_numeracao
CREATE POLICY "Usuários veem config numeração da sua loja"
  ON public.config_numeracao FOR SELECT
  TO authenticated
  USING (loja_id IN (
    SELECT loja_id FROM public.user_lojas_permitidas 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin pode gerenciar config numeração"
  ON public.config_numeracao FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para config_seguranca
CREATE POLICY "Usuários veem config segurança da sua loja"
  ON public.config_seguranca FOR SELECT
  TO authenticated
  USING (loja_id IN (
    SELECT loja_id FROM public.user_lojas_permitidas 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin pode gerenciar config segurança"
  ON public.config_seguranca FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

-- Políticas para config_locacao
CREATE POLICY "Usuários veem config locação da sua loja"
  ON public.config_locacao FOR SELECT
  TO authenticated
  USING (loja_id IN (
    SELECT loja_id FROM public.user_lojas_permitidas 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin/Gestor podem atualizar config locação"
  ON public.config_locacao FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Gestor podem inserir config locação"
  ON public.config_locacao FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
    AND loja_id IN (
      SELECT loja_id FROM public.user_lojas_permitidas 
      WHERE user_id = auth.uid()
    )
  );