-- Melhorar trigger para registrar movimentações de manutenção na timeline dos equipamentos
-- com mais detalhes (área origem, destino, OS, motivo)

CREATE OR REPLACE FUNCTION public.atualizar_area_equipamento_por_os()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_area_origem TEXT;
  v_descricao TEXT;
BEGIN
  -- Se a área mudou, atualizar o status do equipamento
  IF (TG_OP = 'UPDATE' AND NEW.area_atual IS DISTINCT FROM OLD.area_atual) OR TG_OP = 'INSERT' THEN
    
    -- Guardar área de origem se for UPDATE
    IF TG_OP = 'UPDATE' THEN
      v_area_origem := OLD.area_atual;
      v_descricao := 'Movido de ' || OLD.area_atual || ' para ' || NEW.area_atual;
    ELSE
      v_descricao := 'Entrada na área ' || NEW.area_atual;
    END IF;
    
    -- Atualiza o status do equipamento baseado na área
    UPDATE equipamentos
    SET 
      status_global = CASE 
        WHEN NEW.area_atual = 'VERDE' THEN 'DISPONIVEL'
        ELSE 'MANUTENCAO'
      END,
      updated_at = now()
    WHERE id = NEW.equipamento_id;
    
    -- Adiciona evento detalhado na timeline do equipamento
    UPDATE equipamentos
    SET 
      historico = COALESCE(historico, '[]'::jsonb) || jsonb_build_object(
        'id', gen_random_uuid()::text,
        'ts', now()::text,
        'tipo', 'AREA_OFICINA_ALTERADA',
        'descricao', v_descricao,
        'usuario', COALESCE(auth.uid()::text, 'Sistema'),
        'meta', jsonb_build_object(
          'osId', NEW.id::text,
          'osNumero', NEW.numero,
          'areaOrigem', v_area_origem,
          'areaDestino', NEW.area_atual,
          'tipoOS', NEW.tipo,
          'origem', NEW.origem,
          'prioridade', NEW.prioridade
        )
      )::jsonb
    WHERE id = NEW.equipamento_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Garantir que o trigger existe na tabela ordens_servico
DROP TRIGGER IF EXISTS atualizar_area_equipamento_por_os ON ordens_servico;

CREATE TRIGGER atualizar_area_equipamento_por_os
  AFTER INSERT OR UPDATE OF area_atual
  ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_area_equipamento_por_os();

-- Comentário explicativo
COMMENT ON FUNCTION public.atualizar_area_equipamento_por_os() IS 
'Registra movimentações entre áreas de manutenção (AMARELA, VERMELHA, AZUL, VERDE, CINZA) na timeline dos equipamentos';
