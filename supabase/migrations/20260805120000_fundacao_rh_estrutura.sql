-- ============================================================================
-- FUNDAÇÃO RH — Bloco 1 (estrutura)
-- empresas · lojas.empresa_id · cargos · pessoa_vinculo · rh_audit_log · bucket
-- Padrão de RLS: is_master/admin globais; rh/gestor escopados por loja.
-- NÃO faz backfill de pessoa_vinculo (feito num 2º passo, revisado pessoa a pessoa).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) EMPRESAS (CNPJ = entidade). Seed a partir das lojas já preenchidas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid REFERENCES public.grupos_lojas(id) ON DELETE SET NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL UNIQUE,
  regime_tributario text,
  cnae_principal text,
  inscricao_estadual text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

INSERT INTO public.empresas (grupo_id, razao_social, cnpj)
SELECT DISTINCT l.grupo_id, l.razao_social, l.cnpj
FROM public.lojas l
WHERE l.cnpj IS NOT NULL AND l.razao_social IS NOT NULL
ON CONFLICT (cnpj) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2) LOJAS.empresa_id — vincula cada loja à sua empresa (pelo CNPJ).
--    Feito ANTES das policies de empresas (que referenciam lojas.empresa_id).
-- ----------------------------------------------------------------------------
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;
UPDATE public.lojas l SET empresa_id = e.id
FROM public.empresas e WHERE e.cnpj = l.cnpj AND l.empresa_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lojas_empresa_id ON public.lojas(empresa_id);

-- Policies de empresas (agora que lojas.empresa_id existe)
DROP POLICY IF EXISTS "empresas_select" ON public.empresas;
CREATE POLICY "empresas_select" ON public.empresas FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.lojas l
      WHERE l.empresa_id = empresas.id
        AND l.id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid())
    )
  )
);
DROP POLICY IF EXISTS "empresas_write" ON public.empresas;
CREATE POLICY "empresas_write" ON public.empresas FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

-- ----------------------------------------------------------------------------
-- 3) CARGOS — tabela de cargos (empresa_id NULL = compartilhado). Seed dos reais.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cbo text,
  familia text,
  nivel text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cargos_global_nome ON public.cargos(nome) WHERE empresa_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cargos_empresa_nome ON public.cargos(empresa_id, nome) WHERE empresa_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_cargos_updated_at ON public.cargos;
CREATE TRIGGER trg_cargos_updated_at BEFORE UPDATE ON public.cargos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cargos (empresa_id, nome)
SELECT NULL, v.nome
FROM (VALUES ('Administrador'),('Analista Administrativo'),('Vendedor'),
             ('Analista Financeiro'),('Motorista'),('Técnico de Manutenção')) v(nome)
WHERE NOT EXISTS (SELECT 1 FROM public.cargos c WHERE c.empresa_id IS NULL AND c.nome = v.nome);

DROP POLICY IF EXISTS "cargos_select" ON public.cargos;
CREATE POLICY "cargos_select" ON public.cargos FOR SELECT TO authenticated
USING (public.is_active(auth.uid()));
DROP POLICY IF EXISTS "cargos_write" ON public.cargos;
CREATE POLICY "cargos_write" ON public.cargos FOR ALL TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role));

-- ----------------------------------------------------------------------------
-- 4) PESSOA_VINCULO — histórico contratual com vigência (1 linha por período).
--    O vínculo vigente é vigencia_fim IS NULL.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pessoa_vinculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cc_id uuid REFERENCES public.centros_custo(id),
  cargo_id uuid REFERENCES public.cargos(id),
  gestor_pessoa_id uuid REFERENCES public.pessoas(id),
  tipo_contrato text NOT NULL DEFAULT 'indeterminado'
    CHECK (tipo_contrato IN ('indeterminado','determinado','experiencia','aprendiz','estagio')),
  categoria_esocial text,
  matricula text,
  data_admissao date,
  data_fim_previsto date,
  data_desligamento date,
  salario numeric,
  tipo_salario text NOT NULL DEFAULT 'mensal' CHECK (tipo_salario IN ('mensal','horista')),
  jornada_horas_semanais numeric,
  jornada_horas_mensais numeric,
  vigencia_inicio date NOT NULL DEFAULT current_date,
  vigencia_fim date,
  motivo_alteracao text NOT NULL DEFAULT 'admissao'
    CHECK (motivo_alteracao IN ('admissao','reajuste','promocao','transferencia','alteracao_jornada','desligamento')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_vinculo_pessoa ON public.pessoa_vinculo(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_loja ON public.pessoa_vinculo(loja_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vinculo_vigente ON public.pessoa_vinculo(pessoa_id) WHERE vigencia_fim IS NULL;
ALTER TABLE public.pessoa_vinculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vinculo_select" ON public.pessoa_vinculo;
CREATE POLICY "vinculo_select" ON public.pessoa_vinculo FOR SELECT TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);
DROP POLICY IF EXISTS "vinculo_write" ON public.pessoa_vinculo;
CREATE POLICY "vinculo_write" ON public.pessoa_vinculo FOR ALL TO authenticated
USING (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
)
WITH CHECK (
  public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND loja_id IN (SELECT loja_id FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);

-- ----------------------------------------------------------------------------
-- 5) RH_AUDIT_LOG — auditoria genérica via trigger (append-only, imutável).
--    Trigger é SECURITY DEFINER => insere mesmo com RLS ligada (sem policy de INSERT).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rh_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  antes jsonb,
  depois jsonb,
  campos_alterados text[],
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rh_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select" ON public.rh_audit_log;
CREATE POLICY "audit_select" ON public.rh_audit_log FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role));

CREATE OR REPLACE FUNCTION public.rh_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_antes jsonb; v_depois jsonb; v_campos text[]; v_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_antes := to_jsonb(OLD); v_depois := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_antes := NULL; v_depois := to_jsonb(NEW);
  ELSE
    v_antes := to_jsonb(OLD); v_depois := to_jsonb(NEW);
    SELECT array_agg(d.key) INTO v_campos
    FROM jsonb_each(v_depois) d
    WHERE d.value IS DISTINCT FROM (v_antes -> d.key);
  END IF;
  v_id := COALESCE((v_depois->>'id'), (v_antes->>'id'))::uuid;
  INSERT INTO public.rh_audit_log(tabela, registro_id, acao, antes, depois, campos_alterados, user_id)
  VALUES (TG_TABLE_NAME, v_id, TG_OP, v_antes, v_depois, v_campos, auth.uid());
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_audit_pessoas ON public.pessoas;
CREATE TRIGGER trg_audit_pessoas AFTER INSERT OR UPDATE OR DELETE ON public.pessoas
  FOR EACH ROW EXECUTE FUNCTION public.rh_audit();
DROP TRIGGER IF EXISTS trg_audit_vinculo ON public.pessoa_vinculo;
CREATE TRIGGER trg_audit_vinculo AFTER INSERT OR UPDATE OR DELETE ON public.pessoa_vinculo
  FOR EACH ROW EXECUTE FUNCTION public.rh_audit();

-- ----------------------------------------------------------------------------
-- 6) BUCKET rh-documentos — privado, isolado por loja (1º segmento do path = loja_id).
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rh-documentos','rh-documentos', false, 20971520,
        ARRAY['application/pdf','image/png','image/jpeg','image/jpg','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "rh_docs_select" ON storage.objects;
CREATE POLICY "rh_docs_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rh-documentos' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);
DROP POLICY IF EXISTS "rh_docs_write" ON storage.objects;
CREATE POLICY "rh_docs_write" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'rh-documentos' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
)
WITH CHECK (
  bucket_id = 'rh-documentos' AND public.is_active(auth.uid()) AND (
    public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role(auth.uid(),'rh'::app_role)
        AND (storage.foldername(name))[1] IN (SELECT loja_id::text FROM public.user_lojas_permitidas WHERE user_id = auth.uid()))
  )
);
