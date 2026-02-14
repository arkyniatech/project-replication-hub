import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Transferencia, 
  TransferItem, 
  TransferStatus, 
  MotivoRecusa,
  FiltrosTransferencia,
  KPIsTransferencia,
  TransferLog 
} from '@/types/transferencias';
import { useEquipamentosStore } from './equipamentosStore';
import { getLojaAtivaId } from '@/hooks/useMultiunidade';

// Event System para notificar mudanças nos KPIs
type TransferEventType = 'CRIAR' | 'ACEITAR' | 'NEGAR' | 'CANCELAR';

interface TransferEvent {
  id: string;
  type: TransferEventType;
  transferId: string;
  origemLojaId: string;
  destinoLojaId: string;
  itens: TransferItem[];
  timestamp: string;
}

type EventListener = (event: TransferEvent) => void;

interface TransferenciasState {
  transferencias: Transferencia[];
  loading: boolean;
  filtros: FiltrosTransferencia;
  nextNumero: number;
  
  // Event System
  eventListeners: EventListener[];
  
  // Actions
  criarTransferencia: (payload: {
    destinoLojaId: string;
    itens: TransferItem[];
    motorista?: string;
    veiculo?: string;
    observacoes?: string;
  }) => Promise<string>;
  
  aceitar: (id: string) => Promise<void>;
  negar: (id: string, motivo: MotivoRecusa, detalhe?: string) => Promise<void>;
  cancelar: (id: string) => Promise<void>;
  
  // Getters
  getTransferenciasPendentesRecebidas: (lojaId: string) => Transferencia[];
  getTransferenciasPendentesEnviadas: (lojaId: string) => Transferencia[];
  getHistorico: (filtros?: FiltrosTransferencia) => Transferencia[];
  getKPIs: (lojaId: string) => KPIsTransferencia;
  
  // Utils
  setFiltros: (filtros: Partial<FiltrosTransferencia>) => void;
  clearFiltros: () => void;
  addLog: (id: string, log: Omit<TransferLog, 'em'>) => void;
  
  // Event System
  subscribe: (listener: EventListener) => () => void;
  publishEvent: (event: Omit<TransferEvent, 'id' | 'timestamp'>) => void;
}

const getCurrentUser = () => ({
  id: 'user-mock-1',
  nome: 'Usuário Atual'
});

const getCurrentLoja = async () => {
  // Get current loja from multiunidade hook
  const lojaId = getLojaAtivaId();
  
  if (!lojaId) {
    return { id: '', nome: 'Loja não selecionada' };
  }

  // Import supabase dynamically to avoid circular dependencies
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    const { data, error } = await supabase
      .from('lojas')
      .select('id, nome')
      .eq('id', lojaId)
      .single();
    
    if (error || !data) {
      return { id: lojaId, nome: 'Loja Desconhecida' };
    }
    
    return { id: data.id, nome: data.nome };
  } catch (error) {
    console.error('Erro ao buscar loja:', error);
    return { id: lojaId, nome: 'Loja Desconhecida' };
  }
};

export const useTransferenciasStore = create<TransferenciasState>()(
  persist(
    (set, get) => ({
      transferencias: [],
      loading: false,
      filtros: {},
      nextNumero: 1,
      eventListeners: [],

      criarTransferencia: async (payload) => {
        const currentUser = getCurrentUser();
        const currentLoja = await getCurrentLoja();
        
        // Buscar loja destino do Supabase
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: destinoLoja, error } = await supabase
          .from('lojas')
          .select('id, nome')
          .eq('id', payload.destinoLojaId)
          .single();
        
        if (error || !destinoLoja) {
          throw new Error('Loja destino não encontrada');
        }

        const state = get();
        const id = crypto.randomUUID();
        const numero = state.nextNumero;
        const now = new Date().toISOString();

        const novaTransferencia: Transferencia = {
          id,
          numero,
          origemLojaId: currentLoja.id,
          origemLojaNome: currentLoja.nome,
          destinoLojaId: payload.destinoLojaId,
          destinoLojaNome: destinoLoja.nome,
          itens: payload.itens,
          motorista: payload.motorista,
          veiculo: payload.veiculo,
          observacoes: payload.observacoes,
          status: 'EM_TRANSITO',
          criadoEm: now,
          atualizadoEm: now,
          logs: [{
            em: now,
            porUsuarioId: currentUser.id,
            porUsuarioNome: currentUser.nome,
            acao: 'CRIADA',
            detalhe: `Transferência criada com ${payload.itens.length} item(s)`
          }]
        };

        // Atualizar saldos na origem (mock)
        const equipamentosStore = useEquipamentosStore.getState();
        payload.itens.forEach(item => {
          if (item.tipo === 'SALDO') {
            // Decrementar saldo na origem
            equipamentosStore.transferirEquipamento(item.modeloId, currentLoja.id, payload.destinoLojaId, item.quantidade);
          } else if (item.tipo === 'SERIAL' && item.codigoInterno) {
            // Marcar como em transporte
            equipamentosStore.alterarStatusEquipamento(item.codigoInterno, 'EM_TRANSPORTE');
          }
        });

        set(state => ({
          transferencias: [...state.transferencias, novaTransferencia],
          nextNumero: state.nextNumero + 1
        }));

        return id;
      },

      aceitar: async (id) => {
        const currentUser = getCurrentUser();
        const currentLoja = await getCurrentLoja();
        const now = new Date().toISOString();

        set(state => {
          const transferencia = state.transferencias.find(t => t.id === id);
          if (!transferencia || transferencia.destinoLojaId !== currentLoja.id) {
            return state;
          }

          // Atualizar saldos no destino (mock)
          const equipamentosStore = useEquipamentosStore.getState();
          transferencia.itens.forEach(item => {
            if (item.tipo === 'SALDO') {
              // Incrementar saldo no destino
              equipamentosStore.transferirEquipamento(item.modeloId, transferencia.origemLojaId, currentLoja.id, item.quantidade);
            } else if (item.tipo === 'SERIAL' && item.codigoInterno) {
              // Marcar como disponível na nova loja
              equipamentosStore.alterarStatusEquipamento(item.codigoInterno, 'DISPONIVEL');
              equipamentosStore.alterarLojaEquipamento(item.codigoInterno, currentLoja.id);
            }
          });

          // Publish event
          get().publishEvent({
            type: 'ACEITAR',
            transferId: id,
            origemLojaId: transferencia.origemLojaId,
            destinoLojaId: transferencia.destinoLojaId,
            itens: transferencia.itens
          });

          const updatedTransferencias = state.transferencias.map(t => 
            t.id === id 
              ? {
                  ...t,
                  status: 'RECEBIDA' as TransferStatus,
                  atualizadoEm: now,
                  logs: [...t.logs, {
                    em: now,
                    porUsuarioId: currentUser.id,
                    porUsuarioNome: currentUser.nome,
                    acao: 'ACEITA',
                    detalhe: `Transferência aceita na loja ${currentLoja.nome}`
                  }]
                }
              : t
          );

          return { ...state, transferencias: updatedTransferencias };
        });

      // Publish event  
      const transferencia = get().transferencias.find(t => t.id === id);
      if (transferencia) {
        get().publishEvent({
          type: 'NEGAR',
          transferId: id,
          origemLojaId: transferencia.origemLojaId,
          destinoLojaId: transferencia.destinoLojaId,
          itens: transferencia.itens
        });
      }
      },

      negar: async (id, motivo, detalhe) => {
        const currentUser = getCurrentUser();
        const currentLoja = await getCurrentLoja();
        const now = new Date().toISOString();

        set(state => {
          const transferencia = state.transferencias.find(t => t.id === id);
          if (!transferencia || transferencia.destinoLojaId !== currentLoja.id) {
            return state;
          }

          const updatedTransferencias = state.transferencias.map(t => 
            t.id === id 
              ? {
                  ...t,
                  status: 'RECUSADA' as TransferStatus,
                  atualizadoEm: now,
                  recusa: {
                    motivo,
                    detalhe,
                    porUsuarioId: currentUser.id,
                    porUsuarioNome: currentUser.nome,
                    em: now
                  },
                  logs: [...t.logs, {
                    em: now,
                    porUsuarioId: currentUser.id,
                    porUsuarioNome: currentUser.nome,
                    acao: 'RECUSADA',
                    detalhe: `Motivo: ${motivo}${detalhe ? ` - ${detalhe}` : ''}`
                  }]
                }
              : t
          );

          return { ...state, transferencias: updatedTransferencias };
        });

        // Publish event
        const transferencia = get().transferencias.find(t => t.id === id);
        if (transferencia) {
          get().publishEvent({
            type: 'CANCELAR',
            transferId: id,
            origemLojaId: transferencia.origemLojaId,
            destinoLojaId: transferencia.destinoLojaId,
            itens: transferencia.itens
          });
        }
      },

      cancelar: async (id) => {
        const currentUser = getCurrentUser();
        const currentLoja = await getCurrentLoja();
        const now = new Date().toISOString();

        set(state => {
          const transferencia = state.transferencias.find(t => t.id === id);
          if (!transferencia || transferencia.origemLojaId !== currentLoja.id || transferencia.status !== 'RECUSADA') {
            return state;
          }

          // Restaurar saldos na origem (mock)
          const equipamentosStore = useEquipamentosStore.getState();
          transferencia.itens.forEach(item => {
            if (item.tipo === 'SALDO') {
              // Restaurar saldo na origem
              equipamentosStore.transferirEquipamento(item.modeloId, transferencia.destinoLojaId, currentLoja.id, item.quantidade);
            } else if (item.tipo === 'SERIAL' && item.codigoInterno) {
              // Marcar como disponível na origem
              equipamentosStore.alterarStatusEquipamento(item.codigoInterno, 'DISPONIVEL');
            }
          });

          const updatedTransferencias = state.transferencias.map(t => 
            t.id === id 
              ? {
                  ...t,
                  status: 'CANCELADA' as TransferStatus,
                  atualizadoEm: now,
                  logs: [...t.logs, {
                    em: now,
                    porUsuarioId: currentUser.id,
                    porUsuarioNome: currentUser.nome,
                    acao: 'CANCELADA',
                    detalhe: 'Transferência cancelada após recusa'
                  }]
                }
              : t
          );

          return { ...state, transferencias: updatedTransferencias };
        });
      },

      getTransferenciasPendentesRecebidas: (lojaId) => {
        return get().transferencias.filter(t => 
          t.destinoLojaId === lojaId && t.status === 'EM_TRANSITO'
        );
      },

      getTransferenciasPendentesEnviadas: (lojaId) => {
        return get().transferencias.filter(t => 
          t.origemLojaId === lojaId && (t.status === 'EM_TRANSITO' || t.status === 'RECUSADA')
        );
      },

      getHistorico: (filtros) => {
        const state = get();
        let transferencias = state.transferencias;

        if (filtros?.periodo) {
          transferencias = transferencias.filter(t => {
            const data = new Date(t.criadoEm);
            const inicio = new Date(filtros.periodo!.inicio);
            const fim = new Date(filtros.periodo!.fim);
            return data >= inicio && data <= fim;
          });
        }

        if (filtros?.origemLojaId) {
          transferencias = transferencias.filter(t => t.origemLojaId === filtros.origemLojaId);
        }

        if (filtros?.destinoLojaId) {
          transferencias = transferencias.filter(t => t.destinoLojaId === filtros.destinoLojaId);
        }

        if (filtros?.status?.length) {
          transferencias = transferencias.filter(t => filtros.status!.includes(t.status));
        }

        if (filtros?.texto) {
          const texto = filtros.texto.toLowerCase();
          transferencias = transferencias.filter(t => 
            t.numero.toString().includes(texto) ||
            t.itens.some(item => 
              item.descricao.toLowerCase().includes(texto) ||
              item.codigoInterno?.toLowerCase().includes(texto)
            )
          );
        }

        return transferencias.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
      },

      getKPIs: (lojaId) => {
        const state = get();
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const hojeDia = hoje.toISOString().split('T')[0];

        return {
          pendenciasRecebidas: state.transferencias.filter(t => 
            t.destinoLojaId === lojaId && t.status === 'EM_TRANSITO'
          ).length,
          
          pendenciasEnviadas: state.transferencias.filter(t => 
            t.origemLojaId === lojaId && t.status === 'EM_TRANSITO'
          ).length,
          
          recebidasHoje: state.transferencias.filter(t => 
            t.destinoLojaId === lojaId && 
            t.status === 'RECEBIDA' && 
            t.atualizadoEm.startsWith(hojeDia)
          ).length,
          
          recusadasMes: state.transferencias.filter(t => {
            const dataRecusa = new Date(t.atualizadoEm);
            return (t.origemLojaId === lojaId || t.destinoLojaId === lojaId) && 
                   t.status === 'RECUSADA' && 
                   dataRecusa >= inicioMes;
          }).length
        };
      },

      setFiltros: (filtros) => {
        set(state => ({
          filtros: { ...state.filtros, ...filtros }
        }));
      },

      clearFiltros: () => {
        set({ filtros: {} });
      },

      addLog: (id, log) => {
        const now = new Date().toISOString();
        set(state => ({
          transferencias: state.transferencias.map(t => 
            t.id === id 
              ? { ...t, logs: [...t.logs, { ...log, em: now }] }
              : t
          )
        }));
      },

      subscribe: (listener) => {
        set(state => ({
          eventListeners: [...state.eventListeners, listener]
        }));
        
        // Return unsubscribe function
        return () => {
          set(state => ({
            eventListeners: state.eventListeners.filter(l => l !== listener)
          }));
        };
      },

      publishEvent: (event) => {
        const eventWithMeta: TransferEvent = {
          ...event,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        
        const { eventListeners } = get();
        eventListeners.forEach(listener => {
          try {
            listener(eventWithMeta);
          } catch (error) {
            console.error('Error in transfer event listener:', error);
          }
        });
      }
    }),
    {
      name: 'transferencias-store',
      version: 1
    }
  )
);

// Seed inicial
const seedTransferencias = () => {
  const store = useTransferenciasStore.getState();
  if (store.transferencias.length === 0) {
    // Seed com 4 exemplos
    const exemplos: Transferencia[] = [
      {
        id: 'trans-1',
        numero: 1,
        origemLojaId: 'loja-1',
        origemLojaNome: 'Loja Centro',
        destinoLojaId: 'loja-2',
        destinoLojaNome: 'Loja Norte',
        itens: [
          {
            id: 'item-1',
            tipo: 'SERIAL',
            codigoInterno: 'BET001',
            modeloId: 'modelo-1',
            grupoId: 'grupo-1',
            descricao: 'Betoneira 400L',
            quantidade: 1
          }
        ],
        status: 'EM_TRANSITO',
        criadoEm: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        atualizadoEm: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        logs: [
          {
            em: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            porUsuarioId: 'user-1',
            porUsuarioNome: 'João Silva',
            acao: 'CRIADA',
            detalhe: 'Transferência criada'
          }
        ]
      },
      {
        id: 'trans-2',
        numero: 2,
        origemLojaId: 'loja-2',
        origemLojaNome: 'Loja Norte',
        destinoLojaId: 'loja-1',
        destinoLojaNome: 'Loja Centro',
        itens: [
          {
            id: 'item-2',
            tipo: 'SALDO',
            modeloId: 'modelo-2',
            grupoId: 'grupo-1',
            descricao: 'Andaime Tubular',
            quantidade: 5
          }
        ],
        status: 'EM_TRANSITO',
        criadoEm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        atualizadoEm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        logs: [
          {
            em: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            porUsuarioId: 'user-2',
            porUsuarioNome: 'Maria Costa',
            acao: 'CRIADA',
            detalhe: 'Transferência criada com 5 unidades'
          }
        ]
      }
    ];

    useTransferenciasStore.setState({
      transferencias: exemplos,
      nextNumero: 3
    });
  }
};

// Auto-seed no load
setTimeout(seedTransferencias, 100);