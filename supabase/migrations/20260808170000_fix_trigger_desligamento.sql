-- ============================================================================
-- Correções do trigger de desligamento (achados da revisão adversarial):
--   R1: SECURITY DEFINER atravessava a RLS multi-loja — um rh da loja A
--       conseguia desligar colaborador da loja B via API. Agora o trigger
--       valida que a pessoa pertence à loja do desligamento.
--   R2: encerrava TODOS os vínculos vigentes da pessoa; agora respeita
--       vinculo_id quando informado.
--   R3: só disparava em UPDATE — um INSERT já 'concluido' passava sem efeito
--       e sem exigir data_efetiva. Agora dispara em INSERT OR UPDATE.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_desligamento_concluido() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_loja_pessoa uuid;
BEGIN
  IF NEW.status = 'concluido' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'concluido') THEN
    IF NEW.data_efetiva IS NULL THEN
      RAISE EXCEPTION 'Informe a data efetiva antes de concluir o desligamento';
    END IF;

    -- R1: escopo de loja — o desligamento só vale para pessoa da mesma loja
    SELECT loja_id INTO v_loja_pessoa FROM public.pessoas WHERE id = NEW.pessoa_id;
    IF v_loja_pessoa IS NOT NULL AND v_loja_pessoa IS DISTINCT FROM NEW.loja_id THEN
      RAISE EXCEPTION 'Desligamento fora do escopo da loja do colaborador';
    END IF;

    -- R2: se o desligamento aponta um vínculo específico, encerra só ele;
    -- senão, encerra os vigentes da pessoa
    UPDATE public.pessoa_vinculo
       SET vigencia_fim = NEW.data_efetiva,
           data_desligamento = NEW.data_efetiva,
           motivo_alteracao = 'desligamento'
     WHERE pessoa_id = NEW.pessoa_id
       AND vigencia_fim IS NULL
       AND (NEW.vinculo_id IS NULL OR id = NEW.vinculo_id);

    UPDATE public.pessoas SET situacao = 'inativo' WHERE id = NEW.pessoa_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_rh_desligamento_concluido ON public.rh_desligamentos;
CREATE TRIGGER trg_rh_desligamento_concluido AFTER INSERT OR UPDATE ON public.rh_desligamentos
  FOR EACH ROW EXECUTE FUNCTION public.trg_desligamento_concluido();
