import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Conta, 
  Transfer, 
  Lancamento, 
  Conciliacao, 
  ExtratoLinha, 
  Match,
  TransferConfig 
} from '@/types/financeiro';

interface FinanceiroState {
  // Contas
  contas: Conta[];
  
  // Transferências
  transferencias: Transfer[];
  lancamentos: Lancamento[];
  
  // Conciliação
  conciliacoes: Conciliacao[];
  extratoLinhas: ExtratoLinha[];
  matches: Match[];
  
  // Config
  config: TransferConfig;
  
  // Actions - Contas
  addConta: (conta: Omit<Conta, 'id' | 'createdAt'>) => void;
  updateConta: (id: string, updates: Partial<Conta>) => void;
  getContasByLoja: (lojaId: string) => Conta[];
  updateSaldoConta: (contaId: string, valor: number, operacao: 'add' | 'subtract') => void;
  
  // Actions - Transferências
  createTransfer: (transfer: Omit<Transfer, 'id' | 'createdAtISO'>) => string;
  updateTransfer: (id: string, updates: Partial<Transfer>) => void;
  efetivarTransfer: (id: string) => void;
  cancelarTransfer: (id: string) => void;
  estornarTransfer: (id: string, motivo: string) => void;
  getTransfersByLoja: (lojaId: string) => Transfer[];
  
  // Actions - Lançamentos
  addLancamento: (lancamento: Omit<Lancamento, 'id' | 'createdAtISO'>) => void;
  getLancamentosByConta: (contaId: string, periodo?: { ini: string; fim: string }) => Lancamento[];
  
  // Actions - Conciliação
  createConciliacao: (conciliacao: Omit<Conciliacao, 'id' | 'criadoEmISO'>) => string;
  addExtratoLinhas: (conciliacaoId: string, linhas: Omit<ExtratoLinha, 'id' | 'conciliacaoId'>[]) => void;
  createMatch: (match: Omit<Match, 'id' | 'criadoEmISO'>) => void;
  removeMatch: (matchId: string) => void;
  fecharConciliacao: (conciliacaoId: string) => void;
  getConciliacaoById: (id: string) => Conciliacao | undefined;
  getExtratoByConc: (conciliacaoId: string) => ExtratoLinha[];
  getMatchesByConc: (conciliacaoId: string) => Match[];
  
  // Actions - Utilitárias
  seedInitialData: (lojaId: string) => void;
  clearData: () => void;
}

// Seed inicial para desenvolvimento
const createInitialContas = (lojaId: string): Conta[] => [
  {
    id: `conta-cc-${lojaId}`,
    lojaId,
    codigo: 'CC001',
    nome: 'Conta Corrente Principal',
    banco: 'Banco do Brasil',
    agencia: '1234-5',
    numero: '12345-6',
    moeda: 'BRL',
    saldoAtual: 25000.00,
    ativo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: `conta-poup-${lojaId}`,
    lojaId,
    codigo: 'CP001',
    nome: 'Conta Poupança',
    banco: 'Itaú',
    agencia: '5678-9',
    numero: '98765-4',
    moeda: 'BRL',
    saldoAtual: 15000.00,
    ativo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: `conta-inv-${lojaId}`,
    lojaId,
    codigo: 'CI001',
    nome: 'Conta Investimentos',
    banco: 'Santander',
    agencia: '9876-5',
    numero: '54321-0',
    moeda: 'BRL',
    saldoAtual: 50000.00,
    ativo: true,
    createdAt: new Date().toISOString()
  }
];

export const useFinanceiroStore = create<FinanceiroState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      contas: [],
      transferencias: [],
      lancamentos: [],
      conciliacoes: [],
      extratoLinhas: [],
      matches: [],
      config: {
        allowOverdraft: false,
        toleranciaDias: 3,
        taxaPadrao: 5.00
      },

      // Actions - Contas
      addConta: (conta) =>
        set((state) => ({
          contas: [
            ...state.contas,
            {
              ...conta,
              id: `conta-${Date.now()}`,
              createdAt: new Date().toISOString()
            }
          ]
        })),

      updateConta: (id, updates) =>
        set((state) => ({
          contas: state.contas.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          )
        })),

      getContasByLoja: (lojaId) => {
        const { contas } = get();
        if (contas.length === 0) {
          // Auto-seed se não houver contas para esta loja
          get().seedInitialData(lojaId);
          return get().contas.filter(c => c.lojaId === lojaId);
        }
        return contas.filter(c => c.lojaId === lojaId && c.ativo);
      },

      updateSaldoConta: (contaId, valor, operacao) =>
        set((state) => ({
          contas: state.contas.map((c) =>
            c.id === contaId
              ? {
                  ...c,
                  saldoAtual: operacao === 'add' 
                    ? c.saldoAtual + valor 
                    : c.saldoAtual - valor
                }
              : c
          )
        })),

      // Actions - Transferências
      createTransfer: (transfer) => {
        const id = `transfer-${Date.now()}`;
        set((state) => ({
          transferencias: [
            ...state.transferencias,
            {
              ...transfer,
              id,
              createdAtISO: new Date().toISOString()
            }
          ]
        }));
        return id;
      },

      updateTransfer: (id, updates) =>
        set((state) => ({
          transferencias: state.transferencias.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          )
        })),

      efetivarTransfer: (id) => {
        const { transferencias, updateSaldoConta, addLancamento } = get();
        const transfer = transferencias.find(t => t.id === id);
        
        if (!transfer || transfer.status !== 'PENDENTE') return;

        // Atualizar status
        get().updateTransfer(id, { status: 'EFETIVADA' });

        // Lançamentos
        const valorComTaxa = transfer.valor + (transfer.taxa || 0);
        
        // Débito na origem
        addLancamento({
          contaId: transfer.origemId,
          tipo: 'DEBITO',
          valor: valorComTaxa,
          data: transfer.data,
          origem: 'TRANSFERENCIA',
          refId: id,
          descricao: `Transferência para ${transfer.destinoId}`
        });

        // Crédito no destino
        addLancamento({
          contaId: transfer.destinoId,
          tipo: 'CREDITO',
          valor: transfer.valor,
          data: transfer.data,
          origem: 'TRANSFERENCIA',
          refId: id,
          descricao: `Transferência recebida de ${transfer.origemId}`
        });

        // Atualizar saldos
        updateSaldoConta(transfer.origemId, valorComTaxa, 'subtract');
        updateSaldoConta(transfer.destinoId, transfer.valor, 'add');
      },

      cancelarTransfer: (id) =>
        get().updateTransfer(id, { status: 'CANCELADA' }),

      estornarTransfer: (id, motivo) => {
        const { transferencias } = get();
        const transfer = transferencias.find(t => t.id === id);
        
        if (!transfer || transfer.status !== 'EFETIVADA') return;

        // Criar transferência inversa
        const estornoId = get().createTransfer({
          lojaId: transfer.lojaId,
          origemId: transfer.destinoId,
          destinoId: transfer.origemId,
          valor: transfer.valor,
          taxa: transfer.taxa,
          data: new Date().toISOString().split('T')[0],
          status: 'EFETIVADA',
          createdBy: 'system',
          descricao: `Estorno de ${id} - ${motivo}`,
          estornoDe: id
        });

        get().efetivarTransfer(estornoId);
      },

      getTransfersByLoja: (lojaId) => {
        const { transferencias } = get();
        return transferencias.filter(t => t.lojaId === lojaId);
      },

      // Actions - Lançamentos
      addLancamento: (lancamento) =>
        set((state) => ({
          lancamentos: [
            ...state.lancamentos,
            {
              ...lancamento,
              id: `lanc-${Date.now()}`,
              createdAtISO: new Date().toISOString()
            }
          ]
        })),

      getLancamentosByConta: (contaId, periodo) => {
        const { lancamentos } = get();
        let filtered = lancamentos.filter(l => l.contaId === contaId);
        
        if (periodo) {
          filtered = filtered.filter(l => 
            l.data >= periodo.ini && l.data <= periodo.fim
          );
        }
        
        return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      },

      // Actions - Conciliação
      createConciliacao: (conciliacao) => {
        const id = `conc-${Date.now()}`;
        set((state) => ({
          conciliacoes: [
            ...state.conciliacoes,
            {
              ...conciliacao,
              id,
              criadoEmISO: new Date().toISOString()
            }
          ]
        }));
        return id;
      },

      addExtratoLinhas: (conciliacaoId, linhas) =>
        set((state) => ({
          extratoLinhas: [
            ...state.extratoLinhas,
            ...linhas.map((linha, index) => ({
              ...linha,
              id: `extrato-${Date.now()}-${index}`,
              conciliacaoId,
              pareado: false
            }))
          ]
        })),

      createMatch: (match) =>
        set((state) => ({
          matches: [
            ...state.matches,
            {
              ...match,
              id: `match-${Date.now()}`,
              criadoEmISO: new Date().toISOString()
            }
          ],
          extratoLinhas: state.extratoLinhas.map(linha =>
            linha.id === match.extratoId 
              ? { ...linha, pareado: true }
              : linha
          )
        })),

      removeMatch: (matchId) => {
        const { matches } = get();
        const match = matches.find(m => m.id === matchId);
        
        if (match) {
          set((state) => ({
            matches: state.matches.filter(m => m.id !== matchId),
            extratoLinhas: state.extratoLinhas.map(linha =>
              linha.id === match.extratoId
                ? { ...linha, pareado: false }
                : linha
            )
          }));
        }
      },

      fecharConciliacao: (conciliacaoId) =>
        set((state) => ({
          conciliacoes: state.conciliacoes.map(c =>
            c.id === conciliacaoId ? { ...c, status: 'FECHADA' } : c
          )
        })),

      getConciliacaoById: (id) => {
        const { conciliacoes } = get();
        return conciliacoes.find(c => c.id === id);
      },

      getExtratoByConc: (conciliacaoId) => {
        const { extratoLinhas } = get();
        return extratoLinhas.filter(e => e.conciliacaoId === conciliacaoId);
      },

      getMatchesByConc: (conciliacaoId) => {
        const { matches } = get();
        return matches.filter(m => m.conciliacaoId === conciliacaoId);
      },

      // Actions - Utilitárias
      seedInitialData: (lojaId) => {
        const contasExistentes = get().contas.filter(c => c.lojaId === lojaId);
        if (contasExistentes.length === 0) {
          set((state) => ({
            contas: [...state.contas, ...createInitialContas(lojaId)]
          }));
        }
      },

      clearData: () =>
        set({
          contas: [],
          transferencias: [],
          lancamentos: [],
          conciliacoes: [],
          extratoLinhas: [],
          matches: []
        })
    }),
    {
      name: 'financeiro-store',
      version: 1
    }
  )
);

// Setup dos observers de account balances
if (typeof window !== 'undefined') {
  import('@/utils/account-balances-observer').then(({ setupAccountBalancesObserver }) => {
    setupAccountBalancesObserver();
  });
}