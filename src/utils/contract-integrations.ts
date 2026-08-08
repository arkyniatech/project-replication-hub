// Sistema de integração entre módulos de Contratos e outros sistemas
import { useAgendaDisponibilidadeStore } from '@/stores/agendaDisponibilidadeStore';
import { supabase } from '@/integrations/supabase/client';

// Tipos de eventos do contrato
export type ContractEventType = 
  | 'RENOVADO' 
  | 'ITEM_DEVOLVIDO'
  | 'ITEM_SUBSTITUIDO'
  | 'ITEM_ADICIONADO'
  | 'CONTRATO_ENCERRADO';

export interface ContractIntegrationEvent {
  id: string;
  type: ContractEventType;
  contratoId: string;
  contratoNumero: string;
  lojaId: string;
  timestamp: string;
  payload: {
    equipamentoIds?: string[];
    modeloIds?: string[];
    novaDataFim?: string;
    dataInicio?: string;
    observacoes?: string;
  };
}

// Event Bus para comunicação entre módulos
class ContractEventBus {
  private listeners: Map<ContractEventType, Array<(event: ContractIntegrationEvent) => void>> = new Map();

  subscribe(eventType: ContractEventType, callback: (event: ContractIntegrationEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index >= 0) callbacks.splice(index, 1);
      }
    };
  }

  emit(event: Omit<ContractIntegrationEvent, 'id' | 'timestamp'>) {
    const fullEvent: ContractIntegrationEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    console.log('ContractEventBus: Emitting event', fullEvent);

    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(fullEvent);
        } catch (error) {
          console.error('Error in contract event listener:', error);
        }
      });
    }
  }
}

export const contractEventBus = new ContractEventBus();

// Verificar se equipamento está em transferência EM_TRANSITO (via Supabase)
export async function checkEquipmentInTransfer(equipamentoId: string, lojaId: string): Promise<{
  isInTransfer: boolean;
  transferencia?: any;
}> {
  const { data: transferencias, error } = await supabase
    .from('transferencias')
    .select(`
      *,
      origem:lojas!transferencias_origem_loja_id_fkey(nome),
      destino:lojas!transferencias_destino_loja_id_fkey(nome),
      itens:transferencia_itens(*)
    `)
    .or(`origem_loja_id.eq.${lojaId},destino_loja_id.eq.${lojaId}`)
    .eq('status', 'EM_TRANSITO');

  if (error || !transferencias) return { isInTransfer: false };

  for (const transfer of transferencias) {
    const itemInTransfer = (transfer.itens ?? []).find((item: any) =>
      item.codigo_interno === equipamentoId || item.modelo_id === equipamentoId
    );

    if (itemInTransfer) {
      return {
        isInTransfer: true,
        transferencia: {
          ...transfer,
          origemLojaNome: (transfer as any).origem?.nome,
          destinoLojaNome: (transfer as any).destino?.nome,
        },
      };
    }
  }

  return { isInTransfer: false };
}

// Verificar se equipamento está bloqueado por contagem (agora via Supabase)
export async function checkEquipmentInBlindCount(equipamentoId: string, lojaId: string): Promise<{
  isBlocked: boolean;
  sessao?: any;
}> {
  try {
    const { data: sessoes } = await supabase
      .from('sessoes_contagem')
      .select('id, display_no, status')
      .eq('loja_id', lojaId)
      .in('status', ['EM_CONTAGEM', 'EM_REVISAO', 'AJUSTADA']);

    if (!sessoes || sessoes.length === 0) return { isBlocked: false };

    for (const sessao of sessoes) {
      const { data: itens } = await supabase
        .from('itens_contagem')
        .select('id, codigo')
        .eq('sessao_id', sessao.id)
        .ilike('codigo', `%${equipamentoId}%`)
        .limit(1);

      if (itens && itens.length > 0) {
        return { isBlocked: true, sessao };
      }
    }
  } catch (err) {
    console.error('Error checking blind count:', err);
  }

  return { isBlocked: false };
}

// Atualizar agenda quando contrato for renovado/modificado
export function updateAgendaFromContract(event: ContractIntegrationEvent) {
  const agendaStore = useAgendaDisponibilidadeStore.getState();
  
  console.log('Updating agenda from contract event:', event);
  
  if (event.lojaId) {
    agendaStore.setFiltros({ lojaId: event.lojaId });
  }
}

// Inicializar listeners dos módulos
export function initializeContractIntegrations() {
  contractEventBus.subscribe('RENOVADO', updateAgendaFromContract);
  contractEventBus.subscribe('ITEM_DEVOLVIDO', updateAgendaFromContract);
  contractEventBus.subscribe('ITEM_SUBSTITUIDO', updateAgendaFromContract);
  contractEventBus.subscribe('CONTRATO_ENCERRADO', updateAgendaFromContract);

  console.log('Contract integrations initialized');
}

// Emitir evento de renovação de contrato
export function emitContractRenewal(
  contratoId: string, 
  contratoNumero: string, 
  lojaId: string, 
  novaDataFim: string,
  equipamentoIds: string[] = []
) {
  contractEventBus.emit({
    type: 'RENOVADO',
    contratoId,
    contratoNumero,
    lojaId,
    payload: { novaDataFim, equipamentoIds }
  });
}

// Emitir evento de devolução
export function emitItemReturn(
  contratoId: string,
  contratoNumero: string,
  lojaId: string,
  equipamentoIds: string[]
) {
  contractEventBus.emit({
    type: 'ITEM_DEVOLVIDO',
    contratoId,
    contratoNumero,
    lojaId,
    payload: { equipamentoIds }
  });
}

// Emitir evento de substituição
export function emitItemSubstitution(
  contratoId: string,
  contratoNumero: string,
  lojaId: string,
  equipamentoIds: string[]
) {
  contractEventBus.emit({
    type: 'ITEM_SUBSTITUIDO',
    contratoId,
    contratoNumero,
    lojaId,
    payload: { equipamentoIds }
  });
}
