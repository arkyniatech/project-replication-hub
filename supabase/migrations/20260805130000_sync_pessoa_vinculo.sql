-- ============================================================================
-- Passo 2 — Sincronização automática pessoas -> pessoa_vinculo
-- Qualquer escrita contratual em `pessoas` (cargo/salário/loja/cc) passa a
-- manter o histórico de vínculo automaticamente:
--   INSERT              -> cria vínculo de admissão
--   UPDATE contratual   -> encerra o vigente e cria novo período (motivo inferido)
-- Preserva data_admissao (tempo de serviço) e respeita 1-vínculo-vigente-por-pessoa.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_pessoa_vinculo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_motivo text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.loja_id IS NULL THEN RETURN NEW; END IF;  -- vínculo exige loja
    INSERT INTO public.pessoa_vinculo
      (pessoa_id, empresa_id, loja_id, cc_id, cargo_id, salario, data_admissao, vigencia_inicio, motivo_alteracao)
    SELECT NEW.id, l.empresa_id, NEW.loja_id, NEW.cc_id,
           (SELECT c.id FROM public.cargos c WHERE c.empresa_id IS NULL AND c.nome = NEW.cargo),
           NEW.salario, NEW.admissao_iso, COALESCE(NEW.admissao_iso, current_date), 'admissao'
    FROM public.lojas l WHERE l.id = NEW.loja_id
    ON CONFLICT DO NOTHING;  -- se já houver vigente (ex.: backfill), não duplica
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- só reage se algo CONTRATUAL mudou
    IF NEW.loja_id IS NOT DISTINCT FROM OLD.loja_id
       AND NEW.cargo IS NOT DISTINCT FROM OLD.cargo
       AND NEW.salario IS NOT DISTINCT FROM OLD.salario
       AND NEW.cc_id IS NOT DISTINCT FROM OLD.cc_id THEN
      RETURN NEW;
    END IF;
    IF NEW.loja_id IS NULL THEN RETURN NEW; END IF;

    v_motivo := CASE
      WHEN NEW.loja_id IS DISTINCT FROM OLD.loja_id THEN 'transferencia'
      WHEN NEW.cargo   IS DISTINCT FROM OLD.cargo   THEN 'promocao'
      WHEN NEW.salario IS DISTINCT FROM OLD.salario THEN 'reajuste'
      ELSE 'alteracao_jornada'
    END;

    -- encerra o vínculo vigente
    UPDATE public.pessoa_vinculo
      SET vigencia_fim = current_date
      WHERE pessoa_id = NEW.id AND vigencia_fim IS NULL;

    -- cria o novo período (preservando a data de admissão original)
    INSERT INTO public.pessoa_vinculo
      (pessoa_id, empresa_id, loja_id, cc_id, cargo_id, salario, data_admissao, vigencia_inicio, motivo_alteracao)
    SELECT NEW.id, l.empresa_id, NEW.loja_id, NEW.cc_id,
           (SELECT c.id FROM public.cargos c WHERE c.empresa_id IS NULL AND c.nome = NEW.cargo),
           NEW.salario, NEW.admissao_iso, current_date, v_motivo
    FROM public.lojas l WHERE l.id = NEW.loja_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_vinculo ON public.pessoas;
CREATE TRIGGER trg_sync_vinculo AFTER INSERT OR UPDATE ON public.pessoas
  FOR EACH ROW EXECUTE FUNCTION public.sync_pessoa_vinculo();
