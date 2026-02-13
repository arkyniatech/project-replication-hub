-- Função para recalcular saldo de equipamento (GRUPO)
CREATE OR REPLACE FUNCTION public.recalcular_saldo_equipamento()
RETURNS TRIGGER AS $$
DECLARE
  v_equipamento_id UUID;
  v_loja_id UUID;
  v_total_usado INTEGER;
  v_saldo_total INTEGER;
  v_saldos_atuais JSONB;
BEGIN
  -- Determina qual equipamento foi afetado
  IF TG_OP = 'DELETE' THEN
    v_equipamento_id := OLD.equipamento_id;
  ELSE
    v_equipamento_id := NEW.equipamento_id;
  END IF;
  
  -- Só processa se for item GRUPO
  IF TG_OP = 'DELETE' THEN
    IF OLD.controle != 'GRUPO' THEN
      RETURN OLD;
    END IF;
  ELSE
    IF NEW.controle != 'GRUPO' THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Busca a loja e saldos atuais do equipamento
  SELECT loja_atual_id, saldos_por_loja 
  INTO v_loja_id, v_saldos_atuais
  FROM equipamentos
  WHERE id = v_equipamento_id;
  
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Calcula total usado em contratos ativos (RASCUNHO, ATIVO, RESERVADO)
  SELECT COALESCE(SUM(ci.quantidade), 0)
  INTO v_total_usado
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = v_equipamento_id
    AND ci.controle = 'GRUPO'
    AND c.status IN ('RASCUNHO', 'ATIVO', 'RESERVADO')
    AND c.ativo = true;
  
  -- Extrai saldo total da loja do equipamento
  v_saldo_total := COALESCE((v_saldos_atuais->v_loja_id::text->>'qtd')::integer, 0);
  
  -- Atualiza o campo qtdDisponivel no saldos_por_loja
  v_saldos_atuais := jsonb_set(
    COALESCE(v_saldos_atuais, '{}'::jsonb),
    ARRAY[v_loja_id::text, 'qtd']::text[],
    to_jsonb(v_saldo_total),
    true
  );
  
  v_saldos_atuais := jsonb_set(
    v_saldos_atuais,
    ARRAY[v_loja_id::text, 'qtdDisponivel']::text[],
    to_jsonb(GREATEST(0, v_saldo_total - v_total_usado)),
    true
  );
  
  -- Atualiza o equipamento
  UPDATE equipamentos
  SET 
    saldos_por_loja = v_saldos_atuais,
    updated_at = now()
  WHERE id = v_equipamento_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger AFTER INSERT em contrato_itens
DROP TRIGGER IF EXISTS trigger_saldo_insert ON contrato_itens;
CREATE TRIGGER trigger_saldo_insert
  AFTER INSERT ON contrato_itens
  FOR EACH ROW
  EXECUTE FUNCTION recalcular_saldo_equipamento();

-- Trigger AFTER UPDATE em contrato_itens (apenas se equipamento_id, quantidade ou controle mudarem)
DROP TRIGGER IF EXISTS trigger_saldo_update ON contrato_itens;
CREATE TRIGGER trigger_saldo_update
  AFTER UPDATE ON contrato_itens
  FOR EACH ROW
  WHEN (
    OLD.equipamento_id IS DISTINCT FROM NEW.equipamento_id OR
    OLD.quantidade IS DISTINCT FROM NEW.quantidade OR
    OLD.controle IS DISTINCT FROM NEW.controle
  )
  EXECUTE FUNCTION recalcular_saldo_equipamento();

-- Trigger AFTER DELETE em contrato_itens
DROP TRIGGER IF EXISTS trigger_saldo_delete ON contrato_itens;
CREATE TRIGGER trigger_saldo_delete
  AFTER DELETE ON contrato_itens
  FOR EACH ROW
  EXECUTE FUNCTION recalcular_saldo_equipamento();

-- Função auxiliar para recalcular por equipamento específico (uso direto)
CREATE OR REPLACE FUNCTION public.recalcular_saldo_equipamento_direto(p_equipamento_id UUID)
RETURNS VOID AS $$
DECLARE
  v_loja_id UUID;
  v_total_usado INTEGER;
  v_saldo_total INTEGER;
  v_saldos_atuais JSONB;
BEGIN
  -- Busca a loja e saldos atuais do equipamento
  SELECT loja_atual_id, saldos_por_loja 
  INTO v_loja_id, v_saldos_atuais
  FROM equipamentos
  WHERE id = p_equipamento_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcula total usado em contratos ativos
  SELECT COALESCE(SUM(ci.quantidade), 0)
  INTO v_total_usado
  FROM contrato_itens ci
  JOIN contratos c ON c.id = ci.contrato_id
  WHERE ci.equipamento_id = p_equipamento_id
    AND ci.controle = 'GRUPO'
    AND c.status IN ('RASCUNHO', 'ATIVO', 'RESERVADO')
    AND c.ativo = true;
  
  -- Extrai saldo total
  v_saldo_total := COALESCE((v_saldos_atuais->v_loja_id::text->>'qtd')::integer, 0);
  
  -- Atualiza saldos
  v_saldos_atuais := jsonb_set(
    COALESCE(v_saldos_atuais, '{}'::jsonb),
    ARRAY[v_loja_id::text, 'qtd']::text[],
    to_jsonb(v_saldo_total),
    true
  );
  
  v_saldos_atuais := jsonb_set(
    v_saldos_atuais,
    ARRAY[v_loja_id::text, 'qtdDisponivel']::text[],
    to_jsonb(GREATEST(0, v_saldo_total - v_total_usado)),
    true
  );
  
  UPDATE equipamentos
  SET 
    saldos_por_loja = v_saldos_atuais,
    updated_at = now()
  WHERE id = p_equipamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para recalcular quando o status do contrato muda
CREATE OR REPLACE FUNCTION public.recalcular_saldo_por_contrato()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Só processa se o status mudou para/de um estado que reserva estoque
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = NEW.status THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Recalcula todos os equipamentos GRUPO deste contrato
  FOR v_item IN 
    SELECT DISTINCT equipamento_id
    FROM contrato_itens
    WHERE contrato_id = COALESCE(NEW.id, OLD.id)
      AND controle = 'GRUPO'
  LOOP
    PERFORM recalcular_saldo_equipamento_direto(v_item.equipamento_id);
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger em contratos para quando status mudar
DROP TRIGGER IF EXISTS trigger_contrato_status_change ON contratos;
CREATE TRIGGER trigger_contrato_status_change
  AFTER UPDATE ON contratos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.ativo IS DISTINCT FROM NEW.ativo)
  EXECUTE FUNCTION recalcular_saldo_por_contrato();