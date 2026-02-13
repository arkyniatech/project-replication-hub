-- =====================================================
-- FASE 1: CONFIGURAÇÕES GLOBAIS - MIGRATION
-- =====================================================

-- 1. SEQUÊNCIAS E NUMERAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sequencias_numeracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'os', 'fatura', 'titulo', 'aditivo')),
  prefixo TEXT NOT NULL DEFAULT '',
  template TEXT NOT NULL DEFAULT '{PREFIXO}-{SEQ:5}',
  reset_modo TEXT NOT NULL DEFAULT 'NUNCA' CHECK (reset_modo IN ('NUNCA', 'ANUAL', 'MENSAL')),
  por_unidade BOOLEAN NOT NULL DEFAULT true,
  proximo_numero INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loja_id, tipo)
);

CREATE INDEX idx_sequencias_loja_tipo ON public.sequencias_numeracao(loja_id, tipo);

ALTER TABLE public.sequencias_numeracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sequências visíveis para autenticados"
  ON public.sequencias_numeracao FOR SELECT
  USING (true);

CREATE POLICY "Admin pode inserir sequências"
  ON public.sequencias_numeracao FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin pode atualizar sequências"
  ON public.sequencias_numeracao FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. CONTADORES DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contadores_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'os', 'fatura', 'titulo', 'aditivo')),
  chave_contador TEXT NOT NULL,
  contador_atual INTEGER NOT NULL DEFAULT 0,
  ultimo_uso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loja_id, tipo, chave_contador)
);

CREATE INDEX idx_contadores_loja_tipo_chave ON public.contadores_documentos(loja_id, tipo, chave_contador);

ALTER TABLE public.contadores_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contadores visíveis para autenticados"
  ON public.contadores_documentos FOR SELECT
  USING (true);

CREATE POLICY "Admin pode gerenciar contadores"
  ON public.contadores_documentos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Função para incrementar contador de forma segura
CREATE OR REPLACE FUNCTION public.incrementar_contador(
  p_loja_id UUID,
  p_tipo TEXT,
  p_chave_contador TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_novo_contador INTEGER;
BEGIN
  INSERT INTO public.contadores_documentos (loja_id, tipo, chave_contador, contador_atual, ultimo_uso)
  VALUES (p_loja_id, p_tipo, p_chave_contador, 1, now())
  ON CONFLICT (loja_id, tipo, chave_contador)
  DO UPDATE SET 
    contador_atual = contadores_documentos.contador_atual + 1,
    ultimo_uso = now(),
    updated_at = now()
  RETURNING contador_atual INTO v_novo_contador;
  
  RETURN v_novo_contador;
END;
$$;

-- 3. TEMPLATES DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.templates_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'os', 'fatura')),
  nome TEXT NOT NULL,
  logo_url TEXT,
  cores JSONB NOT NULL DEFAULT '{"primaria": "#F59E0B", "secundaria": "#111827"}'::jsonb,
  fontes JSONB NOT NULL DEFAULT '{"principal": "Inter", "tamanho_base": 12}'::jsonb,
  blocos JSONB NOT NULL DEFAULT '[]'::jsonb,
  campos_visiveis JSONB NOT NULL DEFAULT '{
    "cliente": true,
    "itens": true,
    "tabelas": true,
    "observacoes": true,
    "assinaturas": true
  }'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_templates_tipo ON public.templates_documentos(tipo);

ALTER TABLE public.templates_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates visíveis para autenticados"
  ON public.templates_documentos FOR SELECT
  USING (true);

CREATE POLICY "Admin pode gerenciar templates"
  ON public.templates_documentos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. AVISOS DO SISTEMA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.avisos_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('info', 'warning', 'success', 'urgent')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  prioridade INTEGER NOT NULL DEFAULT 1 CHECK (prioridade BETWEEN 1 AND 5),
  data_inicio DATE,
  data_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_avisos_ativo ON public.avisos_sistema(ativo);
CREATE INDEX idx_avisos_datas ON public.avisos_sistema(data_inicio, data_fim);

ALTER TABLE public.avisos_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avisos ativos visíveis para todos"
  ON public.avisos_sistema FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin pode gerenciar avisos"
  ON public.avisos_sistema FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. CONFIGURAÇÃO DO HEADER DE AVISOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.config_avisos_header (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exibir_logo BOOLEAN NOT NULL DEFAULT true,
  tempo_rotacao INTEGER NOT NULL DEFAULT 5,
  animacao BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir apenas um registro
CREATE UNIQUE INDEX idx_config_avisos_singleton ON public.config_avisos_header((true));

ALTER TABLE public.config_avisos_header ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config avisos visível para autenticados"
  ON public.config_avisos_header FOR SELECT
  USING (true);

CREATE POLICY "Admin pode atualizar config avisos"
  ON public.config_avisos_header FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. TRIGGERS PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER update_sequencias_updated_at
  BEFORE UPDATE ON public.sequencias_numeracao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contadores_updated_at
  BEFORE UPDATE ON public.contadores_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avisos_updated_at
  BEFORE UPDATE ON public.avisos_sistema
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_avisos_updated_at
  BEFORE UPDATE ON public.config_avisos_header
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. SEED DE DADOS INICIAIS
-- =====================================================

-- Inserir configuração padrão de avisos
INSERT INTO public.config_avisos_header (exibir_logo, tempo_rotacao, animacao)
VALUES (true, 5, true)
ON CONFLICT DO NOTHING;

-- Inserir aviso inicial
INSERT INTO public.avisos_sistema (texto, tipo, ativo, prioridade)
VALUES ('Bem-vindo ao LocaHub! Sistema configurado e pronto para uso.', 'success', true, 1)
ON CONFLICT DO NOTHING;

-- Inserir templates padrão para cada tipo
INSERT INTO public.templates_documentos (tipo, nome, is_default)
VALUES 
  ('contrato', 'Template Padrão - Contrato', true),
  ('os', 'Template Padrão - Ordem de Serviço', true),
  ('fatura', 'Template Padrão - Fatura', true)
ON CONFLICT DO NOTHING;

-- Inserir sequências padrão para as lojas existentes
INSERT INTO public.sequencias_numeracao (loja_id, tipo, prefixo, template)
SELECT 
  l.id,
  tipo_doc.tipo,
  CASE tipo_doc.tipo
    WHEN 'contrato' THEN 'LOC'
    WHEN 'os' THEN 'OS'
    WHEN 'fatura' THEN 'FAT'
    WHEN 'titulo' THEN 'TIT'
    WHEN 'aditivo' THEN 'ADT'
  END,
  '{PREFIXO}-{YYYY}-{SEQ:5}'
FROM public.lojas l
CROSS JOIN (
  SELECT unnest(ARRAY['contrato', 'os', 'fatura', 'titulo', 'aditivo']::text[]) AS tipo
) tipo_doc
WHERE l.ativo = true
ON CONFLICT (loja_id, tipo) DO NOTHING;