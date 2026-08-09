-- ============================================================================
-- Bloco 11 — Fase 2 (ESTIMATIVA; homologar com contador):
--   1) Admissão CONCLUIDA cria/vincula a pessoa automaticamente (com CPF
--      coletado na admissão; o trigger de pessoas já cria o vínculo).
--   2) RPC gerar_provisao_snapshots(competencia): 13º + férias (+1/3) +
--      encargos por pessoa ativa, materializado em provisao_snapshots.
--      Mesma matemática v1-estimativa do simular_rescisao.
-- ============================================================================

-- ---------- 1) admissão -> pessoa ----------
ALTER TABLE public.rh_admissoes ADD COLUMN IF NOT EXISTS cpf text;

CREATE OR REPLACE FUNCTION public.trg_admissao_concluida() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_cpf text;
  v_pessoa uuid;
  v_cargo text;
  v_cand record;
BEGIN
  IF NEW.status = 'CONCLUIDA'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'CONCLUIDA')
     AND NEW.pessoa_id IS NULL THEN

    v_cpf := regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g');
    IF length(v_cpf) <> 11 THEN
      RAISE EXCEPTION 'Informe o CPF do admitido (11 dígitos) antes de concluir a admissão';
    END IF;

    NEW.data_admissao := COALESCE(NEW.data_admissao, current_date);

    -- readmissão: reaproveita a pessoa existente com o mesmo CPF
    SELECT id INTO v_pessoa FROM public.pessoas WHERE regexp_replace(cpf, '\D', '', 'g') = v_cpf;
    IF v_pessoa IS NOT NULL THEN
      UPDATE public.pessoas
         SET situacao = 'ativo',
             nome = NEW.nome,
             loja_id = NEW.loja_id,
             cargo = COALESCE((SELECT nome FROM public.cargos WHERE id = NEW.cargo_id), cargo),
             salario = COALESCE(NEW.salario, salario),
             admissao_iso = NEW.data_admissao::text
       WHERE id = v_pessoa;
      NEW.pessoa_id := v_pessoa;
    ELSE
      SELECT nome INTO v_cargo FROM public.cargos WHERE id = NEW.cargo_id;
      IF NEW.candidato_id IS NOT NULL THEN
        SELECT email, telefone INTO v_cand FROM public.rh_candidatos WHERE id = NEW.candidato_id;
      END IF;
      INSERT INTO public.pessoas
        (nome, cpf, email, telefone, cargo, loja_id, situacao, admissao_iso, salario)
      VALUES
        (NEW.nome, v_cpf, v_cand.email, v_cand.telefone, v_cargo, NEW.loja_id,
         'ativo', NEW.data_admissao::text, NEW.salario)
      RETURNING id INTO NEW.pessoa_id;
      -- o trigger sync_pessoa_vinculo cria o vínculo de admissão a partir daqui
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rh_admissao_concluida ON public.rh_admissoes;
CREATE TRIGGER trg_rh_admissao_concluida BEFORE INSERT OR UPDATE ON public.rh_admissoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_admissao_concluida();

-- ---------- 2) provisões mensais ----------
CREATE OR REPLACE FUNCTION public.gerar_provisao_snapshots(p_competencia text DEFAULT to_char(now(), 'YYYY-MM'))
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_fim date;
  v_terco numeric;
  v_fgts numeric;
  r record;
  v_sal numeric; v_dia numeric;
  v_meses_13 int; v_meses_fer int; v_dias_venc int;
  v_p13 numeric; v_pfer numeric; v_pterco numeric; v_enc numeric; v_total numeric;
  v_qtd int := 0; v_soma numeric := 0;
BEGIN
  IF NOT public.is_active(v_uid) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF NOT (public.is_master(v_uid) OR public.has_role(v_uid, 'admin'::app_role)
          OR public.has_role(v_uid, 'rh'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para gerar provisões';
  END IF;
  IF p_competencia !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Competência inválida (use YYYY-MM)';
  END IF;

  v_fim := (p_competencia || '-01')::date + interval '1 month' - interval '1 day';
  v_terco := public.param_trab('adicional_ferias');
  v_fgts := public.param_trab('fgts_aliquota');

  FOR r IN
    SELECT p.id AS pessoa_id, pv.id AS vinculo_id, pv.empresa_id, pv.loja_id,
           COALESCE(pv.salario, 0) AS salario, pv.data_admissao
      FROM public.pessoas p
      JOIN public.pessoa_vinculo pv ON pv.pessoa_id = p.id AND pv.vigencia_fim IS NULL
     WHERE p.situacao = 'ativo'
  LOOP
    v_sal := r.salario;
    v_dia := v_sal / 30.0;

    -- 13º: avos do ano corrente, limitado aos meses desde a admissão
    v_meses_13 := LEAST(
      EXTRACT(MONTH FROM v_fim)::int,
      GREATEST(0, (EXTRACT(YEAR FROM age(v_fim, COALESCE(r.data_admissao, v_fim))) * 12
                 + EXTRACT(MONTH FROM age(v_fim, COALESCE(r.data_admissao, v_fim))))::int + 1)
    );
    -- férias proporcionais: meses desde o último aniversário aquisitivo
    v_meses_fer := LEAST(12, GREATEST(0, EXTRACT(MONTH FROM age(v_fim, COALESCE(r.data_admissao, v_fim)))::int));
    -- férias vencidas em aberto
    SELECT COALESCE(SUM(dias_saldo), 0) INTO v_dias_venc FROM public.ferias_periodos
      WHERE pessoa_id = r.pessoa_id AND status IN ('vencido', 'dobro_devido', 'adquirido');

    v_p13 := round(v_sal / 12.0 * v_meses_13, 2);
    v_pfer := round(v_sal / 12.0 * v_meses_fer + v_dia * v_dias_venc, 2);
    v_pterco := round(v_pfer * v_terco, 2);
    v_enc := round((v_p13 + v_pfer + v_pterco) * v_fgts, 2);
    v_total := v_p13 + v_pfer + v_pterco + v_enc;

    DELETE FROM public.provisao_snapshots
     WHERE pessoa_id = r.pessoa_id AND competencia = p_competencia;
    INSERT INTO public.provisao_snapshots
      (empresa_id, loja_id, pessoa_id, vinculo_id, competencia,
       provisao_13, provisao_ferias, provisao_ferias_terco, encargos_patronais,
       total_adquirido, versao_calculo)
    VALUES
      (r.empresa_id, r.loja_id, r.pessoa_id, r.vinculo_id, p_competencia,
       v_p13, v_pfer, v_pterco, v_enc, v_total, 'v1-estimativa');

    v_qtd := v_qtd + 1;
    v_soma := v_soma + v_total;
  END LOOP;

  RETURN jsonb_build_object('competencia', p_competencia, 'pessoas', v_qtd, 'total', round(v_soma, 2));
END $$;
REVOKE ALL ON FUNCTION public.gerar_provisao_snapshots(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_provisao_snapshots(text) TO authenticated;
