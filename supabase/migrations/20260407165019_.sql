
CREATE OR REPLACE FUNCTION public.criar_tarefa_retirada_ao_encerrar_contrato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente_nome TEXT;
  v_logistica JSONB;
  v_endereco JSONB;
  v_telefone TEXT;
  v_observacoes TEXT;
  v_previsto TIMESTAMPTZ;
BEGIN
  -- Check if RETIRADA task already exists for this contract
  IF EXISTS (
    SELECT 1 FROM public.logistica_tarefas 
    WHERE contrato_id = NEW.id AND tipo = 'RETIRADA'
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
  v_endereco := COALESCE(v_logistica->'endereco', '{}'::jsonb);
  v_telefone := v_logistica->>'telefone';
  v_observacoes := 'Retirada automática — contrato ' || NEW.numero || ' encerrado.';

  -- Schedule for tomorrow morning by default
  v_previsto := (CURRENT_DATE + INTERVAL '1 day')::date::text || 'T09:00:00'::text;

  -- Try to get obra address if available
  IF NEW.obra_id IS NOT NULL THEN
    SELECT COALESCE(endereco, v_endereco)
    INTO v_endereco
    FROM public.obras
    WHERE id = NEW.obra_id;
  END IF;

  -- Insert the RETIRADA task (no driver assigned)
  INSERT INTO public.logistica_tarefas (
    loja_id, contrato_id, cliente_id, tipo, status, prioridade,
    previsto_iso, duracao_min, janela, endereco,
    cliente_nome, cliente_telefone, observacoes, motorista_id
  ) VALUES (
    NEW.loja_id, NEW.id, NEW.cliente_id, 'RETIRADA', 'AGENDAR', 'ALTA',
    v_previsto::timestamptz, 60, 'MANHA', v_endereco,
    v_cliente_nome, v_telefone, v_observacoes, NULL
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_retirada_ao_encerrar
  AFTER UPDATE ON public.contratos
  FOR EACH ROW
  WHEN (NEW.status = 'ENCERRADO' AND OLD.status <> 'ENCERRADO')
  EXECUTE FUNCTION public.criar_tarefa_retirada_ao_encerrar_contrato();
;
