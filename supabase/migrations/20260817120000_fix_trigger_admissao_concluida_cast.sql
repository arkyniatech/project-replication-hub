-- ============================================================================
-- RELAY 30 — Admissão nunca concluía: trg_admissao_concluida fazia
-- NEW.data_admissao::text em duas atribuições para admissao_iso, mas a coluna
-- é `date` desde a criação da tabela (20251002152649 / 20260101043032). O
-- PostgREST rejeitava com "column admissao_iso is of type date but expression
-- is of type text". Corrige removendo os dois casts; resto do corpo inalterado.
-- ============================================================================

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
             admissao_iso = NEW.data_admissao
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
         'ativo', NEW.data_admissao, NEW.salario)
      RETURNING id INTO NEW.pessoa_id;
      -- o trigger sync_pessoa_vinculo cria o vínculo de admissão a partir daqui
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.trg_admissao_concluida() FROM PUBLIC, anon;
