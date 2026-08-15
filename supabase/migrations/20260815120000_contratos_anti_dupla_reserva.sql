-- =====================================================================
-- Anti-dupla-reserva de equipamento de série (double-booking)
--
-- Incidente: 5 inserções em ~4 segundos reservaram o mesmo equipamento
-- (LA908224460) em contratos sobrepostos. O filtro de frontend não protege:
-- não há invalidateQueries para 'equipamentos-ocupados', então submissões
-- rápidas decidem sobre cache velho. A garantia tem que ser no banco.
--
-- REGRA — um equipamento de SÉRIE está ocupado num intervalo se existir
-- contrato_itens do mesmo equipamento_id onde:
--   - contratos.status IN ('AGUARDANDO_ENTREGA','ATIVO')  -- RASCUNHO não ocupa
--   - contrato_itens.status <> 'DEVOLVIDO'                -- EM_REVISAO ocupa
--   - os intervalos se sobrepõem com FRONTEIRA EXCLUSIVA
-- Fim do intervalo = coalesce(data_fim, data_prevista_fim).
-- Escopo GLOBAL, sem filtro por loja: item de série é físico e único.
--
-- FRONTEIRA EXCLUSIVA: o contrato 4 encerra em 30/04 e o 5 começa em 30/04,
-- mesmo equipamento, clientes diferentes — a operação faz virada no mesmo dia
-- de propósito. Bloquear invalidaria contrato legítimo já existente.
--
-- POR QUE TRIGGER E NÃO EXCLUDE CONSTRAINT: existem hoje 6 pares sobrepostos
-- reais (4 contratos AGUARDANDO_ENTREGA do mesmo cliente, criados em 4s).
-- EXCLUDE valida as linhas existentes e não aceita NOT VALID — quebraria na
-- aplicação. O trigger só dispara em escrita nova, então os legados ficam
-- intactos e continuam operáveis.
--
-- LISTA DE BLOQUEIO (e não de liberação) é segura aqui porque contratos.status
-- e contrato_itens.status têm CHECK constraint: status novo exige migration, e
-- quem a escrever verá este arquivo.
--
-- ESCOPO: apenas controle = 'SERIE'. GRUPO é por quantidade — lógica diferente,
-- fora de escopo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Núcleo da regra. Recebe o item candidato já resolvido e levanta exceção
-- se houver conflito. Centraliza a definição de "ocupado" num único lugar,
-- usado pelos dois triggers abaixo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contratos_valida_reserva_serie(
  p_item_id        uuid,
  p_equipamento_id uuid,
  p_inicio         date,
  p_fim            date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflito record;
BEGIN
  IF p_equipamento_id IS NULL OR p_inicio IS NULL THEN
    RETURN;
  END IF;

  -- Anti-TOCTOU: serializa por equipamento dentro da transação. Duas
  -- inserções concorrentes do mesmo equipamento enfileiram — a segunda
  -- enxerga a primeira. Equipamentos distintos não se esperam, e a tabela
  -- nunca é travada. Liberado automaticamente no commit/rollback.
  PERFORM pg_advisory_xact_lock(hashtextextended('ci:' || p_equipamento_id::text, 0));

  SELECT c.numero,
         c.data_inicio                                   AS inicio,
         COALESCE(c.data_fim, c.data_prevista_fim)       AS fim
    INTO v_conflito
    FROM public.contrato_itens ci
    JOIN public.contratos c ON c.id = ci.contrato_id
   WHERE ci.equipamento_id = p_equipamento_id
     AND ci.controle       = 'SERIE'
     AND ci.status        <> 'DEVOLVIDO'
     AND c.status IN ('AGUARDANDO_ENTREGA', 'ATIVO')
     AND ci.id IS DISTINCT FROM p_item_id     -- não conflita consigo mesmo
     -- Sobreposição com FRONTEIRA EXCLUSIVA: [inicio, fim). Fim ausente =
     -- ocupação em aberto ('infinity'), o lado seguro.
     --
     -- GREATEST(fim, inicio + 1) garante ocupação mínima de UM DIA. Sem isso,
     -- contrato de um dia (data_inicio = data_fim) vira daterange EMPTY, e
     -- range vazia não sobrepõe nada — liberaria dupla reserva ilimitada
     -- naquele dia. Locadora aluga por um dia, então a falha seria para o
     -- lado inseguro. Também blinda contra data invertida por digitação, que
     -- levantaria "range lower bound must be less than or equal to upper
     -- bound" como exceção crua. Para multi-dia é inócuo: fim > inicio, então
     -- GREATEST devolve fim e a fronteira exclusiva fica preservada.
     AND daterange(c.data_inicio,
                   GREATEST(COALESCE(c.data_fim, c.data_prevista_fim, 'infinity'::date),
                            c.data_inicio + 1),
                   '[)')
       && daterange(p_inicio,
                    GREATEST(COALESCE(p_fim, 'infinity'::date), p_inicio + 1),
                    '[)')
   ORDER BY c.data_inicio
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Equipamento já reservado no contrato % no período de % a %. Escolha outro equipamento ou ajuste as datas.',
      v_conflito.numero,
      to_char(v_conflito.inicio, 'DD/MM/YYYY'),
      CASE WHEN v_conflito.fim IS NULL
           THEN 'sem data de término'
           ELSE to_char(v_conflito.fim, 'DD/MM/YYYY')
      END
      USING ERRCODE = '23P01';   -- exclusion_violation
  END IF;
END;
$$;

COMMENT ON FUNCTION public.contratos_valida_reserva_serie(uuid, uuid, date, date) IS
  'Levanta 23P01 se o equipamento de série já estiver reservado no período. Fronteira exclusiva [inicio, fim). Serializa por equipamento via advisory lock.';

-- ---------------------------------------------------------------------
-- TRIGGER 1/2 — contrato_itens
-- Dispara no INSERT e quando equipamento_id, controle ou status mudam.
-- status entra na lista porque DEVOLVIDO -> RESERVADO recria uma ocupação
-- que não existia, sem tocar em equipamento_id nem em contratos.
-- Editar preço/período/observação NÃO revalida — é isso que mantém os
-- contratos legados sobrepostos plenamente operáveis.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_contrato_itens_anti_dupla_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato record;
BEGIN
  IF NEW.controle <> 'SERIE'
     OR NEW.equipamento_id IS NULL
     OR NEW.status = 'DEVOLVIDO' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.equipamento_id IS NOT DISTINCT FROM OLD.equipamento_id
     AND NEW.controle       IS NOT DISTINCT FROM OLD.controle
     AND NEW.status         IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT c.status,
         c.data_inicio,
         COALESCE(c.data_fim, c.data_prevista_fim) AS fim
    INTO v_contrato
    FROM public.contratos c
   WHERE c.id = NEW.contrato_id;

  -- RASCUNHO não ocupa: montar rascunho nunca é bloqueado. A validação
  -- acontece na promoção do rascunho (trigger 2/2).
  IF v_contrato.status NOT IN ('AGUARDANDO_ENTREGA', 'ATIVO') THEN
    RETURN NEW;
  END IF;

  PERFORM public.contratos_valida_reserva_serie(
    NEW.id, NEW.equipamento_id, v_contrato.data_inicio, v_contrato.fim
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrato_itens_anti_dupla_reserva ON public.contrato_itens;
CREATE TRIGGER trg_contrato_itens_anti_dupla_reserva
  BEFORE INSERT OR UPDATE OF equipamento_id, controle, status
  ON public.contrato_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contrato_itens_anti_dupla_reserva();

-- ---------------------------------------------------------------------
-- TRIGGER 2/2 — contratos
-- Valida em dois momentos, e só neles:
--   (a) datas mudaram num contrato JÁ ocupante — esticar por cima de outro
--       contrato é double-booking igual;
--   (b) RASCUNHO -> AGUARDANDO_ENTREGA/ATIVO — o rascunho vira compromisso.
-- NÃO valida AGUARDANDO_ENTREGA <-> ATIVO (não cria compromisso novo e
-- travaria a entrega dos legados) nem ENCERRADO/CANCELADO (liberam).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_contratos_anti_dupla_reserva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_datas_mudaram boolean;
  v_virou_ocupante boolean;
  v_item record;
BEGIN
  v_datas_mudaram :=
        NEW.data_inicio       IS DISTINCT FROM OLD.data_inicio
     OR NEW.data_fim          IS DISTINCT FROM OLD.data_fim
     OR NEW.data_prevista_fim IS DISTINCT FROM OLD.data_prevista_fim;

  v_virou_ocupante :=
        OLD.status = 'RASCUNHO'
    AND NEW.status IN ('AGUARDANDO_ENTREGA', 'ATIVO');

  IF NOT v_virou_ocupante
     AND NOT (v_datas_mudaram AND NEW.status IN ('AGUARDANDO_ENTREGA', 'ATIVO')) THEN
    RETURN NEW;
  END IF;

  FOR v_item IN
    SELECT ci.id, ci.equipamento_id
      FROM public.contrato_itens ci
     WHERE ci.contrato_id    = NEW.id
       AND ci.controle       = 'SERIE'
       AND ci.equipamento_id IS NOT NULL
       AND ci.status        <> 'DEVOLVIDO'
     ORDER BY ci.equipamento_id      -- ordem estável: evita deadlock entre
                                     -- transações concorrentes multi-item
  LOOP
    PERFORM public.contratos_valida_reserva_serie(
      v_item.id,
      v_item.equipamento_id,
      NEW.data_inicio,
      COALESCE(NEW.data_fim, NEW.data_prevista_fim)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_anti_dupla_reserva ON public.contratos;
CREATE TRIGGER trg_contratos_anti_dupla_reserva
  BEFORE UPDATE OF data_inicio, data_fim, data_prevista_fim, status
  ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contratos_anti_dupla_reserva();

-- Suporta o SELECT de conflito (equipamento + status, itens de série).
CREATE INDEX IF NOT EXISTS idx_contrato_itens_equip_serie_ativo
  ON public.contrato_itens (equipamento_id, status)
  WHERE controle = 'SERIE' AND equipamento_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Fecha a superfície de RPC. Por default do Postgres, EXECUTE de função nova
-- vai para PUBLIC — e SECURITY DEFINER sem REVOKE fica chamável sem login via
-- /rest/v1/rpc. Aqui o agravante é que a exceção devolve número do contrato e
-- período: um anônimo sondaria a agenda inteira da locadora variando
-- equipamento_id e datas.
--
-- Diferente das RPCs do repo, estas NÃO recebem GRANT de volta para
-- authenticated: são funções de trigger e um helper interno, ninguém deve
-- chamá-las por REST. O trigger continua funcionando normalmente — o Postgres
-- checa EXECUTE da função de trigger na CRIAÇÃO do trigger, não no disparo, e
-- o PERFORM interno roda como o dono (SECURITY DEFINER), que tem o privilégio.
--
-- SECURITY DEFINER é mantido de propósito: a RLS de contratos filtra por loja
-- e esta regra é GLOBAL. Sem DEFINER, usuário da loja A não enxergaria o
-- conflito na loja B e a validação passaria errado.
-- ---------------------------------------------------------------------
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.contratos_valida_reserva_serie(uuid, uuid, date, date)',
    'public.trg_contrato_itens_anti_dupla_reserva()',
    'public.trg_contratos_anti_dupla_reserva()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
  END LOOP;
END $$;
