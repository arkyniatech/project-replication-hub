
-- Function: auto-create logistica_tarefas when contract becomes ATIVO
CREATE OR REPLACE FUNCTION public.criar_tarefa_logistica_ao_ativar_contrato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_nome TEXT;
  v_logistica JSONB;
  v_data_entrega DATE;
  v_janela TEXT;
  v_hora TEXT;
  v_previsto TIMESTAMPTZ;
  v_endereco JSONB;
  v_telefone TEXT;
  v_observacoes TEXT;
  v_motorista_id UUID;
  v_motorista_count INT;
BEGIN
  -- Only proceed if status changed to ATIVO
  IF NEW.status <> 'ATIVO' THEN
    RETURN NEW;
  END IF;
  
  -- On UPDATE, only proceed if status actually changed
  IF TG_OP = 'UPDATE' AND OLD.status = 'ATIVO' THEN
    RETURN NEW;
  END IF;

  -- Check if task already exists for this contract
  IF EXISTS (
    SELECT 1 FROM public.logistica_tarefas WHERE contrato_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT COALESCE(nome, razao_social, 'Cliente')
  INTO v_cliente_nome
  FROM public.clientes
  WHERE id = NEW.cliente_id;

  -- Extract logistics info from contract
  v_logistica := COALESCE(NEW.logistica, '{}'::jsonb);
  v_data_entrega := COALESCE((v_logistica->>'data')::date, NEW.data_inicio);
  v_janela := COALESCE(v_logistica->>'janela', 'MANHA');
  v_hora := COALESCE(v_logistica->>'horaSugestao', CASE WHEN v_janela = 'MANHA' THEN '09:00' ELSE '14:00' END);
  v_previsto := (v_data_entrega::text || 'T' || v_hora || ':00')::timestamptz;
  v_endereco := COALESCE(v_logistica->'endereco', '{}'::jsonb);
  v_telefone := v_logistica->>'telefone';
  v_observacoes := v_logistica->>'observacoes';

  -- Try to get obra address if available
  IF NEW.obra_id IS NOT NULL THEN
    SELECT COALESCE(endereco, v_endereco)
    INTO v_endereco
    FROM public.obras
    WHERE id = NEW.obra_id;
  END IF;

  -- Auto-assign driver if only 1 active in the store
  SELECT COUNT(*) INTO v_motorista_count
  FROM public.logistica_motoristas
  WHERE loja_id = NEW.loja_id AND ativo = true;

  IF v_motorista_count = 1 THEN
    SELECT id INTO v_motorista_id
    FROM public.logistica_motoristas
    WHERE loja_id = NEW.loja_id AND ativo = true
    LIMIT 1;
  END IF;

  -- Insert the task
  INSERT INTO public.logistica_tarefas (
    loja_id, contrato_id, cliente_id, tipo, status, prioridade,
    previsto_iso, duracao_min, janela, endereco,
    cliente_nome, cliente_telefone, observacoes, motorista_id
  ) VALUES (
    NEW.loja_id, NEW.id, NEW.cliente_id, 'ENTREGA', 'PROGRAMADO', 'MEDIA',
    v_previsto, 60, v_janela, v_endereco,
    v_cliente_nome, v_telefone, v_observacoes, v_motorista_id
  );

  RETURN NEW;
END;
$$;

-- Create trigger on contratos table
CREATE TRIGGER trg_criar_tarefa_logistica_ao_ativar
  AFTER INSERT OR UPDATE OF status ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_tarefa_logistica_ao_ativar_contrato();
;
