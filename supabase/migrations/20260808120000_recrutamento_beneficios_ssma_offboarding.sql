-- ============================================================================
-- Bloco 12 — Recrutamento (vagas/candidatos/admissões), Benefícios,
-- SSMA (ASO + treinamentos NR) e Offboarding (desligamentos).
-- Tira as últimas telas estáticas do RH do mock: tudo com RLS por loja no
-- padrão do módulo (master/admin veem tudo; rh escreve na própria loja;
-- gestor lê na própria loja; colaborador lê o próprio onde fizer sentido).
-- ============================================================================

-- ---------- rh_vagas ----------
CREATE TABLE IF NOT EXISTS public.rh_vagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  empresa_id uuid REFERENCES public.empresas(id),
  cargo_id uuid REFERENCES public.cargos(id),
  titulo text NOT NULL,
  descricao text,
  quantidade int NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  salario_min numeric,
  salario_max numeric,
  status text NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','EM_ANALISE','FECHADA')),
  aberta_em date NOT NULL DEFAULT current_date,
  fechada_em date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_vagas_loja ON public.rh_vagas(loja_id);
CREATE INDEX IF NOT EXISTS idx_rh_vagas_status ON public.rh_vagas(status);
DROP TRIGGER IF EXISTS trg_rh_vagas_updated_at ON public.rh_vagas;
CREATE TRIGGER trg_rh_vagas_updated_at BEFORE UPDATE ON public.rh_vagas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;

-- ---------- rh_candidatos ----------
CREATE TABLE IF NOT EXISTS public.rh_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL REFERENCES public.rh_vagas(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id), -- denormalizado p/ RLS
  nome text NOT NULL,
  email text,
  telefone text,
  cv_url text,
  origem text,
  status text NOT NULL DEFAULT 'NOVO' CHECK (status IN ('NOVO','EM_PROCESSO','APROVADO','REPROVADO')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_candidatos_vaga ON public.rh_candidatos(vaga_id);
CREATE INDEX IF NOT EXISTS idx_rh_candidatos_loja ON public.rh_candidatos(loja_id);
DROP TRIGGER IF EXISTS trg_rh_candidatos_updated_at ON public.rh_candidatos;
CREATE TRIGGER trg_rh_candidatos_updated_at BEFORE UPDATE ON public.rh_candidatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.rh_candidatos ENABLE ROW LEVEL SECURITY;

-- ---------- rh_admissoes ----------
CREATE TABLE IF NOT EXISTS public.rh_admissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid REFERENCES public.rh_candidatos(id) ON DELETE SET NULL,
  vaga_id uuid REFERENCES public.rh_vagas(id) ON DELETE SET NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  cargo_id uuid REFERENCES public.cargos(id),
  nome text NOT NULL, -- cópia do candidato (admissão pode existir sem candidato)
  data_prevista date,
  data_admissao date,
  salario numeric,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EM_PROCESSO','CONCLUIDA','CANCELADA')),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  pessoa_id uuid REFERENCES public.pessoas(id), -- preenchido ao concluir
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_admissoes_loja ON public.rh_admissoes(loja_id);
DROP TRIGGER IF EXISTS trg_rh_admissoes_updated_at ON public.rh_admissoes;
CREATE TRIGGER trg_rh_admissoes_updated_at BEFORE UPDATE ON public.rh_admissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.rh_admissoes ENABLE ROW LEVEL SECURITY;

-- ---------- rh_beneficios (catálogo) ----------
CREATE TABLE IF NOT EXISTS public.rh_beneficios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id), -- null = todas as empresas
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'OUTROS' CHECK (tipo IN (
    'VALE_REFEICAO','VALE_ALIMENTACAO','VALE_TRANSPORTE',
    'PLANO_SAUDE','PLANO_ODONTO','SEGURO_VIDA','OUTROS')),
  valor_mensal numeric,
  provedor text,
  politica text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
DROP TRIGGER IF EXISTS trg_rh_beneficios_updated_at ON public.rh_beneficios;
CREATE TRIGGER trg_rh_beneficios_updated_at BEFORE UPDATE ON public.rh_beneficios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.rh_beneficios ENABLE ROW LEVEL SECURITY;

-- ---------- rh_beneficio_elegibilidade (matriz por cargo) ----------
CREATE TABLE IF NOT EXISTS public.rh_beneficio_elegibilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid NOT NULL REFERENCES public.rh_beneficios(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  regra text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (beneficio_id, cargo_id)
);
ALTER TABLE public.rh_beneficio_elegibilidade ENABLE ROW LEVEL SECURITY;

-- ---------- rh_beneficio_vinculos (pessoa <-> benefício) ----------
CREATE TABLE IF NOT EXISTS public.rh_beneficio_vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id uuid NOT NULL REFERENCES public.rh_beneficios(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  valor_mensal numeric, -- null = usa o valor do catálogo
  data_inicio date NOT NULL DEFAULT current_date,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','encerrado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_benef_vinc_pessoa ON public.rh_beneficio_vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rh_benef_vinc_loja ON public.rh_beneficio_vinculos(loja_id);
ALTER TABLE public.rh_beneficio_vinculos ENABLE ROW LEVEL SECURITY;

-- ---------- rh_aso_exames ----------
CREATE TABLE IF NOT EXISTS public.rh_aso_exames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  tipo text NOT NULL CHECK (tipo IN (
    'admissional','periodico','retorno_trabalho','mudanca_funcao','demissional')),
  data_exame date NOT NULL,
  validade date,
  resultado text NOT NULL DEFAULT 'apto' CHECK (resultado IN ('apto','apto_com_restricao','inapto')),
  medico text,
  crm text,
  documento_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_aso_pessoa ON public.rh_aso_exames(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rh_aso_validade ON public.rh_aso_exames(validade);
ALTER TABLE public.rh_aso_exames ENABLE ROW LEVEL SECURITY;

-- ---------- rh_treinamentos (NRs) ----------
CREATE TABLE IF NOT EXISTS public.rh_treinamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  norma text NOT NULL, -- ex: NR-10, NR-35
  descricao text,
  data_realizacao date NOT NULL,
  validade date,
  carga_horaria_h numeric,
  instituicao text,
  certificado_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_trein_pessoa ON public.rh_treinamentos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rh_trein_validade ON public.rh_treinamentos(validade);
ALTER TABLE public.rh_treinamentos ENABLE ROW LEVEL SECURITY;

-- ---------- rh_desligamentos (offboarding) ----------
CREATE TABLE IF NOT EXISTS public.rh_desligamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  motivo text NOT NULL CHECK (motivo IN (
    'pedido_demissao','sem_justa_causa','justa_causa','acordo_484a',
    'termino_contrato','falecimento','outro')),
  data_alvo date,
  data_efetiva date,
  tipo_aviso text CHECK (tipo_aviso IN ('trabalhado','indenizado','dispensado')),
  simulacao_id uuid REFERENCES public.rescisao_simulacoes(id) ON DELETE SET NULL,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','concluido','cancelado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_rh_deslig_pessoa ON public.rh_desligamentos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_rh_deslig_loja ON public.rh_desligamentos(loja_id);
DROP TRIGGER IF EXISTS trg_rh_desligamentos_updated_at ON public.rh_desligamentos;
CREATE TRIGGER trg_rh_desligamentos_updated_at BEFORE UPDATE ON public.rh_desligamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.rh_desligamentos ENABLE ROW LEVEL SECURITY;

-- Desligamento concluído encerra o vínculo vigente e inativa a pessoa.
CREATE OR REPLACE FUNCTION public.trg_desligamento_concluido() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    IF NEW.data_efetiva IS NULL THEN
      RAISE EXCEPTION 'Informe a data efetiva antes de concluir o desligamento';
    END IF;
    UPDATE public.pessoa_vinculo
       SET vigencia_fim = NEW.data_efetiva,
           data_desligamento = NEW.data_efetiva,
           motivo_alteracao = 'desligamento'
     WHERE pessoa_id = NEW.pessoa_id AND vigencia_fim IS NULL;
    UPDATE public.pessoas SET situacao = 'inativo' WHERE id = NEW.pessoa_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_rh_desligamento_concluido ON public.rh_desligamentos;
CREATE TRIGGER trg_rh_desligamento_concluido AFTER UPDATE ON public.rh_desligamentos
  FOR EACH ROW EXECUTE FUNCTION public.trg_desligamento_concluido();

-- ============================================================================
-- RLS
-- ============================================================================

-- Recrutamento: rh escreve na própria loja; gestor lê na própria loja.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rh_vagas','rh_candidatos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
  END LOOP;
END $$;

-- Admissões e desligamentos têm salário/motivo: sem gestor no SELECT.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rh_admissoes','rh_desligamentos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
  END LOOP;
END $$;

-- Catálogo de benefícios e elegibilidade: leitura p/ qualquer usuário ativo
-- (portal do colaborador precisa do nome/valor); escrita só master/admin/rh.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rh_beneficios','rh_beneficio_elegibilidade'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'rh'::app_role)))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR public.has_role(auth.uid(),'rh'::app_role)))$p$, t, t);
  END LOOP;
END $$;

-- Vínculos de benefício, ASO e treinamentos: rh/gestor por loja + o próprio colaborador.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rh_beneficio_vinculos','rh_aso_exames','rh_treinamentos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR ((public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role))
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))
        OR pessoa_id = (SELECT up.pessoa_id FROM public.user_profiles up WHERE up.id = auth.uid())))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))
      WITH CHECK (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role)
        OR (public.has_role(auth.uid(),'rh'::app_role)
            AND loja_id IN (SELECT ulp.loja_id FROM public.user_lojas_permitidas ulp WHERE ulp.user_id = auth.uid()))))$p$, t, t);
  END LOOP;
END $$;
