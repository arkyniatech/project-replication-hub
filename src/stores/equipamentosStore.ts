import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Loja, 
  Grupo, 
  Modelo, 
  EquipamentoCompleto, 
  Transferencia, 
  TipoItem,
  StatusEquipamento,
  TimelineEventEquipamento 
} from '@/types/equipamentos';
import { getAppConfig } from '@/lib/storage';
import type { Loja as LojaConfig } from '@/types/index';

interface HistoricoPreco {
  id: string;
  modeloId: string;
  lojaId?: string;
  periodo?: string;
  valorAnterior?: number;
  valorNovo?: number;
  descricao?: string;
  usuario: string;
  dataISO: string;
}

interface EquipamentosState {
  // Entities
  lojas: Loja[];
  grupos: Grupo[];
  modelos: Modelo[];
  equipamentos: EquipamentoCompleto[];
  transferencias: Transferencia[];
  historicoPrecos: HistoricoPreco[];
  
  // Actions
  // Grupos
  addGrupo: (grupo: Omit<Grupo, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateGrupo: (id: string, updates: Partial<Grupo>) => void;
  deleteGrupo: (id: string) => void;
  
  // Modelos
  addModelo: (modelo: Omit<Modelo, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateModelo: (id: string, updates: Partial<Modelo>) => void;
  deleteModelo: (id: string) => void;
  clonarPrecoParaTodasLojas: (modeloId: string, lojaOrigemId: string) => void;
  
  // Equipamentos
  addEquipamento: (equipamento: Omit<EquipamentoCompleto, 'id' | 'createdAt' | 'updatedAt' | 'historico'>) => string;
  updateEquipamento: (id: string, updates: Partial<EquipamentoCompleto>) => void;
  inativarEquipamento: (id: string, motivo?: string) => void;
  duplicarEquipamento: (equipamento: EquipamentoCompleto) => Omit<EquipamentoCompleto, 'id' | 'createdAt' | 'updatedAt' | 'historico'>;
  
  // Transferências
  iniciarTransferencia: (equipId: string, origemLojaId: string, destinoLojaId: string, qtd: number, usuario: { id: string, nome: string, perfil: string }) => string;
  aceitarTransferencia: (transfId: string, usuario: { id: string, nome: string }) => void;
  recusarTransferencia: (transfId: string, motivo: string, usuario: { id: string, nome: string }) => void;
  cancelarTransferencia: (transfId: string) => void;
  
  // Helpers
  syncLojas: () => void;
  verificarDuplicidadeCodigo: (codigo: string) => boolean;
  verificarDuplicidadeSerie: (serie: string) => boolean;
  getEquipamentosByLoja: (lojaId: string) => EquipamentoCompleto[];
  getDisponibilidadePorLoja: (lojaId: string) => Record<StatusEquipamento, number>;
  
  // Timeline
  addTimelineEvent: (equipId: string, event: Omit<TimelineEventEquipamento, 'id' | 'timestamp'>) => void;
  
  // Histórico de preços
  addHistoricoPreco: (entry: Omit<HistoricoPreco, 'id' | 'dataISO'>) => void;
  
  // Transfer methods (mock)
  transferirEquipamento: (modeloId: string, origemLojaId: string, destinoLojaId: string, quantidade: number) => void;
  alterarStatusEquipamento: (equipamentoId: string, novoStatus: StatusEquipamento) => void;
  alterarLojaEquipamento: (equipamentoId: string, novaLojaId: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDateTime = () => new Date().toISOString();

const convertLojaConfigToEquipLoja = (loja: LojaConfig): Loja => ({
  id: loja.id,
  nome: loja.nome,
  sigla: loja.apelido, // Use apelido as sigla
  ativo: loja.ativo,
});

const initializeLojas = (): Loja[] => {
  try {
    const config = getAppConfig();
    return (config.lojas || []).map(convertLojaConfigToEquipLoja);
  } catch {
    return [];
  }
};

export const useEquipamentosStore = create<EquipamentosState>()(
  persist(
    (set, get) => ({
      // Initial state - Load lojas from config
      lojas: initializeLojas(),
      grupos: [],
      modelos: [],
      equipamentos: [],
      transferencias: [],
      historicoPrecos: [],
      
      // Helpers
      syncLojas: () => {
        try {
          const config = getAppConfig();
          const lojas = (config.lojas || []).map(convertLojaConfigToEquipLoja);
          set({ lojas });
          console.log('🏢 Lojas sincronizadas:', lojas.length);
        } catch (error) {
          console.error('Erro ao sincronizar lojas:', error);
        }
      },
      
      // Grupos
      addGrupo: (grupoData) => {
        const id = generateId();
        const grupo: Grupo = {
          ...grupoData,
          id,
          createdAt: formatDateTime(),
          updatedAt: formatDateTime(),
        };
        
        set((state) => ({
          grupos: [...state.grupos, grupo]
        }));
        
        return id;
      },
      
      updateGrupo: (id, updates) => {
        set((state) => ({
          grupos: state.grupos.map(g => 
            g.id === id ? { ...g, ...updates, updatedAt: formatDateTime() } : g
          )
        }));
      },
      
      deleteGrupo: (id) => {
        set((state) => ({
          grupos: state.grupos.filter(g => g.id !== id)
        }));
      },
      
      // Modelos
      addModelo: (modeloData) => {
        const id = generateId();
        const modelo: Modelo = {
          ...modeloData,
          id,
          createdAt: formatDateTime(),
          updatedAt: formatDateTime(),
        };
        
        set((state) => ({
          modelos: [...state.modelos, modelo]
        }));
        
        return id;
      },
      
      updateModelo: (id, updates) => {
        set((state) => ({
          modelos: state.modelos.map(m => 
            m.id === id ? { ...m, ...updates, updatedAt: formatDateTime() } : m
          )
        }));
      },
      
      deleteModelo: (id) => {
        set((state) => ({
          modelos: state.modelos.filter(m => m.id !== id)
        }));
      },
      
      clonarPrecoParaTodasLojas: (modeloId, lojaOrigemId) => {
        const { modelos, lojas } = get();
        const modelo = modelos.find(m => m.id === modeloId);
        
        if (!modelo || !modelo.tabelaPorLoja[lojaOrigemId]) return;
        
        const precoOrigem = modelo.tabelaPorLoja[lojaOrigemId];
        const novaTabela = { ...modelo.tabelaPorLoja };
        
        lojas.forEach(loja => {
          novaTabela[loja.id] = { ...precoOrigem };
        });
        
        get().updateModelo(modeloId, { tabelaPorLoja: novaTabela });
      },
      
      // Equipamentos
      addEquipamento: (equipamentoData) => {
        const id = generateId();
        const equipamento: EquipamentoCompleto = {
          ...equipamentoData,
          id,
          historico: [{
            id: generateId(),
            timestamp: formatDateTime(),
            tipo: 'CRIACAO',
            descricao: 'Equipamento criado',
            usuario: 'Sistema'
          }],
          createdAt: formatDateTime(),
          updatedAt: formatDateTime(),
        };
        
        set((state) => ({
          equipamentos: [...state.equipamentos, equipamento]
        }));
        
        return id;
      },
      
      updateEquipamento: (id, updates) => {
        set((state) => ({
          equipamentos: state.equipamentos.map(e => 
            e.id === id ? { ...e, ...updates, updatedAt: formatDateTime() } : e
          )
        }));
      },
      
      inativarEquipamento: (id, motivo = '') => {
        const equipamento = get().equipamentos.find(e => e.id === id);
        if (!equipamento) return;
        
        // Verificar se pode inativar
        if (['LOCADO', 'RESERVADO', 'EM_TRANSPORTE'].includes(equipamento.statusGlobal)) {
          throw new Error('Não é possível inativar equipamento com status atual');
        }
        
        get().updateEquipamento(id, { statusGlobal: 'INATIVO' });
        get().addTimelineEvent(id, {
          tipo: 'INATIVACAO',
          descricao: `Equipamento inativado${motivo ? `: ${motivo}` : ''}`,
          usuario: 'Sistema'
        });
      },
      
      duplicarEquipamento: (equipamento) => {
        const { id, createdAt, updatedAt, historico, ...dadosBase } = equipamento;
        
        return {
          ...dadosBase,
          id: '', // Será gerado no addEquipamento
          numeroSerie: equipamento.tipo === 'SERIALIZADO' ? '' : equipamento.numeroSerie,
        };
      },
      
      // Transferências
      iniciarTransferencia: (equipId, origemLojaId, destinoLojaId, qtd, usuario) => {
        const { equipamentos } = get();
        const equipamento = equipamentos.find(e => e.id === equipId);
        
        if (!equipamento) throw new Error('Equipamento não encontrado');
        
        // Validações
        if (equipamento.tipo === 'SERIALIZADO') {
          if (equipamento.lojaAtualId !== origemLojaId) {
            throw new Error('Equipamento não está na loja de origem');
          }
          if (['LOCADO', 'RESERVADO'].includes(equipamento.statusGlobal)) {
            throw new Error('Equipamento não está disponível para transferência');
          }
        } else {
          const saldoOrigem = equipamento.saldosPorLoja[origemLojaId]?.qtd || 0;
          if (saldoOrigem < qtd) {
            throw new Error('Saldo insuficiente na loja de origem');
          }
        }
        
        const transferencia: Transferencia = {
          id: generateId(),
          equipId,
          origemLojaId,
          destinoLojaId,
          qtd,
          status: 'PENDENTE_ACEITE',
          criadoPor: usuario,
          criadoEm: formatDateTime(),
        };
        
        // Atualizar estado do equipamento
        if (equipamento.tipo === 'SERIALIZADO') {
          get().updateEquipamento(equipId, { statusGlobal: 'EM_TRANSPORTE' });
        } else {
          const novosSaldos = { ...equipamento.saldosPorLoja };
          novosSaldos[origemLojaId] = { qtd: (novosSaldos[origemLojaId]?.qtd || 0) - qtd };
          get().updateEquipamento(equipId, { saldosPorLoja: novosSaldos });
        }
        
        get().addTimelineEvent(equipId, {
          tipo: 'TRANSFERENCIA_ENVIADA',
          descricao: `Transferência enviada para ${destinoLojaId}`,
          usuario: usuario.nome
        });
        
        set((state) => ({
          transferencias: [...state.transferencias, transferencia]
        }));
        
        return transferencia.id;
      },
      
      aceitarTransferencia: (transfId, usuario) => {
        const { transferencias, equipamentos } = get();
        const transferencia = transferencias.find(t => t.id === transfId);
        const equipamento = equipamentos.find(e => e.id === transferencia?.equipId);
        
        if (!transferencia || !equipamento) return;
        
        // Atualizar transferência
        set((state) => ({
          transferencias: state.transferencias.map(t =>
            t.id === transfId ? {
              ...t,
              status: 'ACEITA',
              recebidoPor: usuario,
              recebidoEm: formatDateTime()
            } : t
          )
        }));
        
        // Atualizar equipamento
        if (equipamento.tipo === 'SERIALIZADO') {
          get().updateEquipamento(equipamento.id, {
            statusGlobal: 'DISPONIVEL',
            lojaAtualId: transferencia.destinoLojaId
          });
        } else {
          const novosSaldos = { ...equipamento.saldosPorLoja };
          novosSaldos[transferencia.destinoLojaId] = {
            qtd: (novosSaldos[transferencia.destinoLojaId]?.qtd || 0) + transferencia.qtd
          };
          get().updateEquipamento(equipamento.id, { saldosPorLoja: novosSaldos });
        }
        
        get().addTimelineEvent(equipamento.id, {
          tipo: 'TRANSFERENCIA_RECEBIDA',
          descricao: `Transferência recebida por ${usuario.nome}`,
          usuario: usuario.nome
        });
      },
      
      recusarTransferencia: (transfId, motivo, usuario) => {
        set((state) => ({
          transferencias: state.transferencias.map(t =>
            t.id === transfId ? {
              ...t,
              status: 'RECUSADA',
              motivoRecusa: motivo,
              recebidoPor: usuario,
              recebidoEm: formatDateTime()
            } : t
          )
        }));
      },
      
      cancelarTransferencia: (transfId) => {
        const { transferencias, equipamentos } = get();
        const transferencia = transferencias.find(t => t.id === transfId);
        const equipamento = equipamentos.find(e => e.id === transferencia?.equipId);
        
        if (!transferencia || !equipamento) return;
        
        // Reverter estado do equipamento
        if (equipamento.tipo === 'SERIALIZADO') {
          get().updateEquipamento(equipamento.id, { statusGlobal: 'DISPONIVEL' });
        } else {
          const novosSaldos = { ...equipamento.saldosPorLoja };
          novosSaldos[transferencia.origemLojaId] = {
            qtd: (novosSaldos[transferencia.origemLojaId]?.qtd || 0) + transferencia.qtd
          };
          get().updateEquipamento(equipamento.id, { saldosPorLoja: novosSaldos });
        }
        
        set((state) => ({
          transferencias: state.transferencias.map(t =>
            t.id === transfId ? { ...t, status: 'CANCELADA' } : t
          )
        }));
      },
      
      // Código de equipamento agora é gerado pelo backend via RPC gerar_codigo_equipamento
      // Formato: LA + código numérico da loja (3 dígitos) + sequencial (3 dígitos)
      // Exemplo: LA001042 = Loja 001, equipamento 042
      
      verificarDuplicidadeCodigo: (codigo) => {
        const { equipamentos } = get();
        return equipamentos.some(e => e.id === codigo);
      },
      
      verificarDuplicidadeSerie: (serie) => {
        const { equipamentos } = get();
        return equipamentos.some(e => 
          e.tipo === 'SERIALIZADO' && e.numeroSerie === serie
        );
      },
      
      getEquipamentosByLoja: (lojaId) => {
        const { equipamentos } = get();
        return equipamentos.filter(e => {
          if (e.tipo === 'SERIALIZADO') {
            return e.lojaAtualId === lojaId;
          } else {
            return (e.saldosPorLoja[lojaId]?.qtd || 0) > 0;
          }
        });
      },
      
      getDisponibilidadePorLoja: (lojaId) => {
        const equipamentos = get().getEquipamentosByLoja(lojaId);
        const contadores: Record<StatusEquipamento, number> = {
          DISPONIVEL: 0,
          RESERVADO: 0,
          LOCADO: 0,
          EM_REVISAO: 0,
          MANUTENCAO: 0,
          EM_TRANSPORTE: 0,
          INATIVO: 0,
        };
        
        equipamentos.forEach(e => {
          if (e.tipo === 'SERIALIZADO') {
            contadores[e.statusGlobal]++;
          } else {
            contadores[e.statusGlobal] += (e.saldosPorLoja[lojaId]?.qtd || 0);
          }
        });
        
        return contadores;
      },
      
      addTimelineEvent: (equipId, event) => {
        const timelineEvent: TimelineEventEquipamento = {
          ...event,
          id: generateId(),
          timestamp: formatDateTime(),
        };
        
        set((state) => ({
          equipamentos: state.equipamentos.map(e =>
            e.id === equipId ? {
              ...e,
              historico: [...e.historico, timelineEvent]
            } : e
          )
        }));
      },
      
      addHistoricoPreco: (entry) => {
        const historicoEntry: HistoricoPreco = {
          ...entry,
          id: generateId(),
          dataISO: formatDateTime(),
        };
        
        set((state) => ({
          historicoPrecos: [...state.historicoPrecos, historicoEntry]
        }));
      },

      // Transfer methods (mock implementations)
      transferirEquipamento: (modeloId, origemLojaId, destinoLojaId, quantidade) => {
        // Mock implementation - in real app would update database
        console.log(`Mock transfer: ${quantidade} units of model ${modeloId} from ${origemLojaId} to ${destinoLojaId}`);
      },

      alterarStatusEquipamento: (equipamentoId, novoStatus) => {
        set(state => ({
          equipamentos: state.equipamentos.map(eq =>
            eq.id === equipamentoId
              ? { ...eq, statusGlobal: novoStatus }
              : eq
          )
        }));
      },

      alterarLojaEquipamento: (equipamentoId, novaLojaId) => {
        set(state => ({
          equipamentos: state.equipamentos.map(eq =>
            eq.id === equipamentoId
              ? { ...eq, lojaAtualId: novaLojaId }
              : eq
          )
        }));
      }
    }),
    {
      name: 'equipamentos-storage',
    }
  )
);