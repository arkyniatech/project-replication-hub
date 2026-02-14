// Sistema de integração entre módulos de Contratos e outros sistemas
import { useTransferenciasStore } from '@/stores/transferenciasStore';
import { useConferenciaStore } from '@/stores/conferenciaStore';
import { useAgendaDisponibilidadeStore } from '@/stores/agendaDisponibilidadeStore';
import { useContratosStore } from '@/stores/contratosStore';

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

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index >= 0) {
          callbacks.splice(index, 1);
        }
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

// Verificar se equipamento está em transferência EM_TRANSITO
export function checkEquipmentInTransfer(equipamentoId: string, lojaId: string): {
  isInTransfer: boolean;
  transferencia?: any;
} {
  const transferenciasStore = useTransferenciasStore.getState();
  
  const transferenciasEmTransito = transferenciasStore.transferencias.filter(t => 
    (t.origemLojaId === lojaId || t.destinoLojaId === lojaId) && 
    t.status === 'EM_TRANSITO'
  );

  for (const transfer of transferenciasEmTransito) {
    const itemInTransfer = transfer.itens.find(item => 
      item.codigoInterno === equipamentoId || item.modeloId === equipamentoId
    );
    
    if (itemInTransfer) {
      return {
        isInTransfer: true,
        transferencia: transfer
      };
    }
  }

  return { isInTransfer: false };
}

// Verificar se equipamento está bloqueado por contagem cega
export function checkEquipmentInBlindCount(equipamentoId: string, lojaId: string): {
  isBlocked: boolean;
  sessao?: any;
} {
  const conferenciaStore = useConferenciaStore.getState();
  
  const sessoesAtivas = conferenciaStore.sessoes.filter(s => 
    s.lojaId === lojaId && 
    ['EM_CONTAGEM', 'EM_REVISAO', 'AJUSTADA'].includes(s.status)
  );

  for (const sessao of sessoesAtivas) {
    const itemBloqueado = conferenciaStore.itens.find(item => 
      item.sessaoId === sessao.id && 
      (item.codigo === equipamentoId || item.codigo.includes(equipamentoId))
    );
    
    if (itemBloqueado) {
      return {
        isBlocked: true,
        sessao
      };
    }
  }

  return { isBlocked: false };
}

// Atualizar agenda quando contrato for renovado/modificado
export function updateAgendaFromContract(event: ContractIntegrationEvent) {
  const agendaStore = useAgendaDisponibilidadeStore.getState();
  
  console.log('Updating agenda from contract event:', event);
  
  // Force agenda rebuild for the affected store
  if (event.lojaId) {
    // This will trigger a rebuild of the agenda when next accessed
    agendaStore.setFiltros({ lojaId: event.lojaId });
  }
}

// Inicializar listeners dos módulos
export function initializeContractIntegrations() {
  // Listener para atualizar agenda
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
    payload: {
      novaDataFim,
      equipamentoIds
    }
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
    payload: {
      equipamentoIds
    }
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
    payload: {
      equipamentoIds
    }
  });
}

// Seed de dados para testes das integrações
export function seedIntegrationTestData() {
  const transferenciasStore = useTransferenciasStore.getState();
  const conferenciaStore = useConferenciaStore.getState();
  
  // Seed transferência EM_TRANSITO que afeta contrato
  const transferencia = {
    id: 'transfer-test-1',
    numero: 999,
    origemLojaId: 'loja-1',
    origemLojaNome: 'Loja Centro',
    destinoLojaId: 'loja-2', 
    destinoLojaNome: 'Loja Norte',
    itens: [{
      id: 'item-transfer-test',
      tipo: 'SERIAL' as const,
      codigoInterno: 'BET015', // Equipment que pode estar em contrato
      modeloId: 'modelo-betoneira',
      grupoId: 'grupo-concreto',
      descricao: 'Betoneira 400L - Em Transferência',
      quantidade: 1
    }],
    status: 'EM_TRANSITO' as const,
    criadoEm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    atualizadoEm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    logs: [{
      em: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      porUsuarioId: 'user-1',
      porUsuarioNome: 'Admin',
      acao: 'CRIADA',
      detalhe: 'Transferência de teste para integração'
    }]
  };

  // Add to store if not exists
  const existingTransfer = transferenciasStore.transferencias.find(t => t.id === transferencia.id);
  if (!existingTransfer) {
    transferenciasStore.transferencias.push(transferencia);
  }

  // Seed sessão de contagem ativa que bloqueia equipamentos
  const sessaoContagem = {
    id: 'contagem-test-1',
    lojaId: 'loja-1',
    displayNo: 'CE-CENTRO-20240120-01',
    status: 'EM_CONTAGEM' as const,
    criadaEm: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    criadaPor: { id: 'user-1', nome: 'Admin' },
    filtros: { tipo: 'AMBOS' as const },
    log: []
  };

  const existingSessao = conferenciaStore.sessoes.find(s => s.id === sessaoContagem.id);
  if (!existingSessao) {
    conferenciaStore.sessoes.push(sessaoContagem);
    
    // Add some items to the counting session
    const itensContagem = [
      {
        id: 'item-contagem-1',
        sessaoId: sessaoContagem.id,
        lojaId: 'loja-1',
        tipo: 'SERIE' as const,
        codigo: 'AND010', // Another equipment that might be in contracts
        descricao: 'Andaime Tubular - Em Contagem',
        grupoNome: 'Andaimes',
        modeloNome: 'Tubular 2m',
        qtdContada: null,
        observacao: ''
      }
    ];

    conferenciaStore.itens.push(...itensContagem);
  }

  console.log('Integration test data seeded');
}