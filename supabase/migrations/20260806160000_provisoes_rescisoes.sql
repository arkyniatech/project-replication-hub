-- ============================================================================
-- Bloco 11 — Provisões & Rescisões (Fase 1) — ESTIMATIVA, homologar com contador
-- parametros_trabalhistas + rubricas + fgts_ledger + provisao_snapshots +
-- rescisao_simulacoes + rescisao_itens + função simular_rescisao().
-- Motivos Fase 1: sem_justa_causa, pedido_demissao, acordo_484a.
-- ⚠️ Os parâmetros default estão marcados 'A VALIDAR' — não são aconselhamento legal.
-- ============================================================================

-- ---------- parâmetros trabalhistas (com vigência e fonte) ----------
CREATE TABLE IF NOT EXISTS public.parametros_trabalhistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  descricao text,
  valor numeric NOT NULL,
  vigencia_inicio date NOT NULL DEFAULT '2020-01-01',
  vigencia_fim date,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  fonte_legal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parametros_trabalhistas ENABLE ROW LEVEL SECURITY;

INSERT INTO public.parametros_trabalhistas (chave, descricao, valor, fonte_legal)
SELECT v.chave, v.descricao, v.valor, v.fonte
FROM (VALUES
  ('fgts_aliquota', 'FGTS mensal', 0.08, 'A VALIDAR · Lei 8.036/90 art.15'),
  ('fgts_aliquota_aprendiz', 'FGTS aprendiz', 0.02, 'A VALIDAR'),
  ('multa_fgts_sem_justa_causa', 'Multa FGTS dispensa s/ justa causa', 0.40, 'A VALIDAR · art.18 §1'),
  ('multa_fgts_acordo', 'Multa FGTS acordo (484-A)', 0.20, 'A VALIDAR · art.484-A CLT'),
  ('adicional_ferias', 'Adicional constitucional de férias (1/3)', 0.3333, 'A VALIDAR · CF art.7 XVII'),
  ('aviso_previo_dias_base', 'Aviso prévio — dias base', 30, 'A VALIDAR · Lei 12.506/11'),
  ('aviso_previo_dias_por_ano', 'Aviso prévio — dias por ano de serviço', 3, 'A VALIDAR · Lei 12.506/11'),
  ('aviso_previo_dias_max', 'Aviso prévio — teto de dias', 90, 'A VALIDAR'),
  ('dias_min_avo', 'Dias mínimos no mês p/ gerar avo (13º/férias)', 15, 'A VALIDAR')
) v(chave, descricao, valor, fonte)
WHERE NOT EXISTS (SELECT 1 FROM public.parametros_trabalhistas p WHERE p.chave = v.chave AND p.empresa_id IS NULL);

-- ---------- rubricas (flags de média — decisão G2) ----------
CREATE TABLE IF NOT EXISTS public.rubricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'provento' CHECK (tipo IN ('provento','desconto','informativo')),
  entra_media_ferias boolean NOT NULL DEFAULT false,
  entra_media_13 boolean NOT NULL DEFAULT false,
  entra_media_aviso boolean NOT NULL DEFAULT false,
  incide_inss boolean NOT NULL DEFAULT true,
  incide_fgts boolean NOT NULL DEFAULT true,
  incide_irrf boolean NOT NULL DEFAULT true,
  natureza_esocial text,
  vigencia_inicio date NOT NULL DEFAULT '2020-01-01',
  vigencia_fim date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rubrica_global ON public.rubricas(codigo) WHERE empresa_id IS NULL;
ALTER TABLE public.rubricas ENABLE ROW LEVEL SECURITY;

-- G2: banco de horas pago 2x/ano ENTRA na média de férias/13º/aviso
INSERT INTO public.rubricas (empresa_id, codigo, descricao, tipo, entra_media_ferias, entra_media_13, entra_media_aviso)
SELECT NULL, v.cod, v.desc, 'provento', v.mf, v.m13, v.mav
FROM (VALUES
  ('SAL_BASE', 'Salário base', true, true, true),
  ('HORA_EXTRA', 'Hora extra', true, true, true),
  ('COMISSAO', 'Comissão', true, true, true),
  ('BANCO_HORAS_PAGO', 'Pagamento de banco de horas (2x/ano)', true, true, true)
) v(cod, "desc", mf, m13, mav)
WHERE NOT EXISTS (SELECT 1 FROM public.rubricas r WHERE r.empresa_id IS NULL AND r.codigo = v.cod);

-- ---------- fgts_ledger ----------
CREATE TABLE IF NOT EXISTS public.fgts_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid REFERENCES public.lojas(id),
  competencia text NOT NULL,
  base_calculo numeric,
  aliquota numeric,
  valor_calculado numeric,
  valor_recolhido numeric,
  saldo_oficial numeric,
  saldo_estimado numeric,
  status_conciliacao text DEFAULT 'estimado',
  origem text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fgts_ledger ENABLE ROW LEVEL SECURITY;

-- ---------- provisao_snapshots ----------
CREATE TABLE IF NOT EXISTS public.provisao_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid REFERENCES public.lojas(id),
  pessoa_id uuid REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  competencia text NOT NULL,
  provisao_13 numeric DEFAULT 0,
  provisao_ferias numeric DEFAULT 0,
  provisao_ferias_terco numeric DEFAULT 0,
  encargos_patronais numeric DEFAULT 0,
  total_adquirido numeric DEFAULT 0,
  versao_calculo text DEFAULT 'v1-estimativa',
  fechado_em timestamptz,
  fechado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provisao_snapshots ENABLE ROW LEVEL SECURITY;

-- ---------- rescisao_simulacoes + itens ----------
CREATE TABLE IF NOT EXISTS public.rescisao_simulacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  vinculo_id uuid REFERENCES public.pessoa_vinculo(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id),
  loja_id uuid REFERENCES public.lojas(id),
  data_simulacao date NOT NULL DEFAULT current_date,
  data_desligamento date NOT NULL,
  motivo text NOT NULL CHECK (motivo IN ('sem_justa_causa','pedido_demissao','acordo_484a')),
  tipo_aviso text DEFAULT 'indenizado',
  total_proventos numeric DEFAULT 0,
  total_descontos numeric DEFAULT 0,
  custo_empregador numeric DEFAULT 0,
  versao_calculo text DEFAULT 'v1-estimativa',
  status text DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.rescisao_simulacoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.rescisao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulacao_id uuid NOT NULL REFERENCES public.rescisao_simulacoes(id) ON DELETE CASCADE,
  rubrica text NOT NULL,
  descricao text,
  base numeric,
  aliquota numeric,
  quantidade numeric,
  valor numeric NOT NULL,
  ordem int DEFAULT 0
);
ALTER TABLE public.rescisao_itens ENABLE ROW LEVEL SECURITY;

-- ---------- RLS (dado financeiro sensível: master/admin/rh; gestor lê por loja) ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['parametros_trabalhistas','rubricas','fgts_ledger','provisao_snapshots','rescisao_simulacoes','rescisao_itens'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_sel" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_sel" ON public.%I FOR SELECT TO authenticated
      USING (public.is_active(auth.uid()) AND (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))$p$, t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_wr" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "%s_wr" ON public.%I FOR ALL TO authenticated
      USING (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
      WITH CHECK (public.is_master(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))$p$, t, t);
  END LOOP;
END $$;

-- ---------- getter de parâmetro vigente ----------
CREATE OR REPLACE FUNCTION public.param_trab(p_chave text, p_empresa uuid DEFAULT NULL) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT valor FROM public.parametros_trabalhistas
  WHERE chave = p_chave AND (empresa_id IS NULL OR empresa_id = p_empresa)
    AND vigencia_inicio <= current_date AND (vigencia_fim IS NULL OR vigencia_fim >= current_date)
  ORDER BY empresa_id NULLS LAST, vigencia_inicio DESC LIMIT 1
$$;

-- ---------- simulador de rescisão (Fase 1) — ESTIMATIVA ----------
CREATE OR REPLACE FUNCTION public.simular_rescisao(p_pessoa_id uuid, p_motivo text, p_data date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v record; v_sim uuid; v_sal numeric; v_dia numeric; v_anos numeric;
  v_meses_13 int; v_meses_fer int; v_aviso_dias int; v_terco numeric;
  v_multa_rate numeric; v_saldo_fgts numeric; v_total numeric := 0; ord int := 0;
  v_dias_venc int;
BEGIN
  SELECT pv.id, pv.empresa_id, pv.loja_id, pv.salario, pv.data_admissao
    INTO v FROM public.pessoa_vinculo pv WHERE pv.pessoa_id = p_pessoa_id AND pv.vigencia_fim IS NULL LIMIT 1;
  v_sal := COALESCE(v.salario, 0);
  v_dia := v_sal / 30.0;
  v_terco := public.param_trab('adicional_ferias');
  v_anos := GREATEST(0, floor(EXTRACT(YEAR FROM age(p_data, COALESCE(v.data_admissao, p_data)))));

  INSERT INTO public.rescisao_simulacoes (pessoa_id, vinculo_id, empresa_id, loja_id, data_desligamento, motivo,
    tipo_aviso, versao_calculo, status)
  VALUES (p_pessoa_id, v.id, v.empresa_id, v.loja_id, p_data, p_motivo,
    CASE WHEN p_motivo='pedido_demissao' THEN 'nao_aplica' ELSE 'indenizado' END, 'v1-estimativa', 'rascunho')
  RETURNING id INTO v_sim;

  -- 1) Saldo de salário (dias do mês trabalhados)
  ord := ord + 1;
  INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
  VALUES (v_sim, 'Saldo de salário', EXTRACT(DAY FROM p_data)::text || ' dia(s) × salário/30', v_dia, EXTRACT(DAY FROM p_data), round(v_dia * EXTRACT(DAY FROM p_data), 2), ord);
  v_total := v_total + round(v_dia * EXTRACT(DAY FROM p_data), 2);

  -- 2) Aviso prévio (só sem_justa_causa e acordo)
  v_aviso_dias := LEAST(public.param_trab('aviso_previo_dias_max')::int,
                        public.param_trab('aviso_previo_dias_base')::int + (v_anos * public.param_trab('aviso_previo_dias_por_ano'))::int);
  IF p_motivo = 'sem_justa_causa' THEN
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
    VALUES (v_sim, 'Aviso prévio indenizado', v_aviso_dias::text || ' dias', v_dia, v_aviso_dias, round(v_dia * v_aviso_dias, 2), ord);
    v_total := v_total + round(v_dia * v_aviso_dias, 2);
  ELSIF p_motivo = 'acordo_484a' THEN
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
    VALUES (v_sim, 'Aviso prévio (50% — acordo)', (v_aviso_dias/2)::text || ' dias', v_dia, v_aviso_dias/2.0, round(v_dia * v_aviso_dias / 2.0, 2), ord);
    v_total := v_total + round(v_dia * v_aviso_dias / 2.0, 2);
  END IF;

  -- 3) 13º proporcional (meses no ano corrente)
  v_meses_13 := EXTRACT(MONTH FROM p_data);
  ord := ord + 1;
  INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
  VALUES (v_sim, '13º proporcional', v_meses_13::text || '/12 avos', v_sal/12.0, v_meses_13, round(v_sal/12.0 * v_meses_13, 2), ord);
  v_total := v_total + round(v_sal/12.0 * v_meses_13, 2);

  -- 4) Férias proporcionais + 1/3 (meses desde o último aniversário aquisitivo, aprox.)
  v_meses_fer := LEAST(12, GREATEST(0, EXTRACT(MONTH FROM age(p_data, COALESCE(v.data_admissao, p_data)))::int));
  ord := ord + 1;
  INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
  VALUES (v_sim, 'Férias proporcionais + 1/3', v_meses_fer::text || '/12 avos', v_sal/12.0, v_meses_fer, round(v_sal/12.0 * v_meses_fer * (1 + v_terco), 2), ord);
  v_total := v_total + round(v_sal/12.0 * v_meses_fer * (1 + v_terco), 2);

  -- 5) Férias vencidas + 1/3 (dias em aberto)
  SELECT COALESCE(SUM(dias_saldo),0) INTO v_dias_venc FROM public.ferias_periodos
    WHERE pessoa_id = p_pessoa_id AND status IN ('vencido','dobro_devido','adquirido');
  IF v_dias_venc > 0 THEN
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, quantidade, valor, ordem)
    VALUES (v_sim, 'Férias vencidas + 1/3', v_dias_venc::text || ' dias × salário/30', v_dia, v_dias_venc, round(v_dia * v_dias_venc * (1 + v_terco), 2), ord);
    v_total := v_total + round(v_dia * v_dias_venc * (1 + v_terco), 2);
  END IF;

  -- 6) Multa FGTS (estimativa: 8% × salário × meses de casa como saldo estimado)
  v_multa_rate := CASE p_motivo WHEN 'sem_justa_causa' THEN public.param_trab('multa_fgts_sem_justa_causa')
                                WHEN 'acordo_484a' THEN public.param_trab('multa_fgts_acordo') ELSE 0 END;
  IF v_multa_rate > 0 THEN
    v_saldo_fgts := public.param_trab('fgts_aliquota') * v_sal * GREATEST(1, EXTRACT(MONTH FROM age(p_data, COALESCE(v.data_admissao, p_data)))::int + v_anos*12);
    ord := ord + 1;
    INSERT INTO public.rescisao_itens (simulacao_id, rubrica, descricao, base, aliquota, valor, ordem)
    VALUES (v_sim, 'Multa FGTS (estimada)', 'saldo FGTS estimado × multa', round(v_saldo_fgts,2), v_multa_rate, round(v_saldo_fgts * v_multa_rate, 2), ord);
    v_total := v_total + round(v_saldo_fgts * v_multa_rate, 2);
  END IF;

  UPDATE public.rescisao_simulacoes SET total_proventos = v_total, custo_empregador = v_total WHERE id = v_sim;
  RETURN v_sim;
END $$;
