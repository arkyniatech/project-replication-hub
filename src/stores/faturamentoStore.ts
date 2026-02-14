import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  LancamentoFaturavel,
  FaturaEmitida,
  FaturamentoFilters,
  FaturamentoKPIs,
  FaturamentoException,
  FaturamentoConfig,
  MensagemTemplate,
  FaturaTimelineEvent
} from '@/types/faturamento';
import type { 
  EmissaoAvulsaConfig,
  EmissaoAvulsaStats,
  EmissaoAvulsaEvent 
} from '@/types/emissao-avulsa';
import { generateNumber } from '@/lib/numeracao';
import { addDays, format } from 'date-fns';

interface FaturamentoState {
  // Data
  lancamentosFaturaveis: LancamentoFaturavel[];
  faturasEmitidas: FaturaEmitida[];
  mensagensTemplates: MensagemTemplate[];
  config: FaturamentoConfig & {
    featureFlags: {
      emissaoAvulsa: boolean;
    };
  };
  
  // Emissão Avulsa
  emissaoAvulsaConfig: EmissaoAvulsaConfig;
  emissaoAvulsaStats: EmissaoAvulsaStats;
  emissaoAvulsaEvents: EmissaoAvulsaEvent[];
  
  // UI State
  filtros: FaturamentoFilters;
  kpis: FaturamentoKPIs;
  exceptions: FaturamentoException[];
  
  // Actions
  setFiltros: (filtros: FaturamentoFilters) => void;
  salvarFiltrosPadrao: (filtros: FaturamentoFilters) => void;
  recuperarFiltrosPadrao: () => FaturamentoFilters | null;
  
  carregarLancamentos: (filtros: FaturamentoFilters) => void;
  toggleSelecionado: (lancamentoId: string) => void;
  selecionarTodos: (selecionado: boolean) => void;
  excluirDaSelecao: (lancamentoId: string) => void;
  
  emitirFatura: (dadosFatura: {
    unidadeId: string;
    clienteId: string;
    clienteNome: string;
    vencimento: string;
    formaPagamento: string;
    observacoes?: string;
    instrucoesCobranca?: string;
  }) => string;
  
  gerarCobranca: (faturaId: string) => Promise<{ success: boolean; error?: string }>;
  enviarFatura: (faturaId: string, canal: 'EMAIL' | 'WHATSAPP', destinatario: string) => void;
  cancelarFatura: (faturaId: string, motivo: string) => void;
  
  calcularKPIs: () => void;
  addException: (exception: FaturamentoException) => void;
  clearExceptions: () => void;
  
  addTimelineEvent: (faturaId: string, event: Omit<FaturaTimelineEvent, 'id' | 'timestamp'>) => void;
  
  // Emissão Avulsa Actions
  addEmissaoAvulsaEvent: (event: EmissaoAvulsaEvent) => void;
  updateEmissaoAvulsaStats: () => void;
  getEmissaoAvulsaUsage: (periodo: 'mes' | 'ano') => number;
  
  // Data management
  clearData: () => void;
}

// Data will come from Supabase (contratos, titulos, etc)

const defaultConfig: FaturamentoConfig & { featureFlags: { emissaoAvulsa: boolean } } = {
  diasProtesto: 5,
  multaPercentual: 2,
  jurosAoDia: 0.033,
  modelosPadrao: {
    email: 'email_cobranca_padrao',
    whatsapp: 'whatsapp_cobranca_padrao'
  },
  bloqueioInadimplencia: true,
  exigirJustificativa: true,
  featureFlags: {
    emissaoAvulsa: true
  }
};

const defaultEmissaoAvulsaConfig: EmissaoAvulsaConfig = {
  enabled: true,
  maxItensPorFatura: 10,
  telemetria: {
    contadorMensal: 0,
    ultimoUso: null,
    usuarioId: 'admin'
  }
};

const defaultEmissaoAvulsaStats: EmissaoAvulsaStats = {
  totalEmissoes: 0,
  mesAtual: 0,
  mediaMensal: 0,
  formasPreferidas: {
    'PIX': 0,
    'BOLETO': 0,
    'OUTRO': 0
  }
};

const mockTemplates: MensagemTemplate[] = [
  {
    id: 'email_cobranca_padrao',
    nome: 'E-mail Cobrança Padrão',
    tipo: 'EMAIL',
    assunto: 'Fatura {{numeroFatura}} - {{nomeCliente}}',
    corpo: 'Prezado cliente,\n\nSegue em anexo a fatura {{numeroFatura}} no valor de {{valorTotal}}, com vencimento em {{dataVencimento}}.\n\nAtenciosamente,\nEquipe Financeira',
    variaveis: ['numeroFatura', 'nomeCliente', 'valorTotal', 'dataVencimento']
  },
  {
    id: 'whatsapp_cobranca_padrao',
    nome: 'WhatsApp Cobrança Padrão',
    tipo: 'WHATSAPP',
    corpo: 'Olá! Sua fatura {{numeroFatura}} de {{valorTotal}} vence em {{dataVencimento}}. Link para 2ª via: {{linkSegundaVia}}',
    variaveis: ['numeroFatura', 'valorTotal', 'dataVencimento', 'linkSegundaVia']
  }
];

export const useFaturamentoStore = create<FaturamentoState>()(
  persist(
    (set, get) => ({
      // Initial state
      lancamentosFaturaveis: [],
      faturasEmitidas: [],
      mensagensTemplates: mockTemplates,
      config: defaultConfig,
      
      // Emissão Avulsa
      emissaoAvulsaConfig: defaultEmissaoAvulsaConfig,
      emissaoAvulsaStats: defaultEmissaoAvulsaStats,
      emissaoAvulsaEvents: [],
      
      filtros: {
        unidadeId: '1', // Garantir valor válido
        dtIni: format(new Date(), 'yyyy-MM-01'),
        dtFim: format(new Date(), 'yyyy-MM-dd'),
      },
      
      kpis: {
        selecionados: 0,
        emAtraso: 0,
        proximos7Dias: 0
      },
      
      exceptions: [],
      
      // Actions
      setFiltros: (filtros) => {
        set({ filtros });
        get().carregarLancamentos(filtros);
        get().calcularKPIs();
      },
      
      salvarFiltrosPadrao: (filtros) => {
        localStorage.setItem('faturamento_filtros_padrao', JSON.stringify(filtros));
      },
      
      recuperarFiltrosPadrao: () => {
        const saved = localStorage.getItem('faturamento_filtros_padrao');
        return saved ? JSON.parse(saved) : null;
      },
      
      carregarLancamentos: (filtros) => {
        // Data will be loaded from Supabase via useSupabaseContratos hook
        // This method now just updates filtros, actual loading happens in component
        set({ lancamentosFaturaveis: [] });
      },
      
      toggleSelecionado: (lancamentoId) => {
        set(state => ({
          lancamentosFaturaveis: state.lancamentosFaturaveis.map(l => 
            l.id === lancamentoId ? { ...l, selecionado: !l.selecionado } : l
          )
        }));
        get().calcularKPIs();
      },
      
      selecionarTodos: (selecionado) => {
        set(state => ({
          lancamentosFaturaveis: state.lancamentosFaturaveis.map(l => ({ ...l, selecionado }))
        }));
        get().calcularKPIs();
      },
      
      excluirDaSelecao: (lancamentoId) => {
        set(state => ({
          lancamentosFaturaveis: state.lancamentosFaturaveis.map(l => 
            l.id === lancamentoId ? { ...l, selecionado: false } : l
          )
        }));
        get().calcularKPIs();
      },
      
      emitirFatura: (dadosFatura) => {
        const state = get();
        const itensSelecionados = state.lancamentosFaturaveis.filter(l => l.selecionado);
        
        if (itensSelecionados.length === 0) {
          throw new Error('Nenhum item selecionado para faturamento');
        }
        
        const numero = generateNumber('fatura', dadosFatura.unidadeId);
        const faturaId = `fatura_${Date.now()}`;
        
        const totais = {
          base: itensSelecionados.reduce((sum, item) => sum + item.subtotal, 0),
          descontos: 0,
          impostos: 0, // placeholder
          total: itensSelecionados.reduce((sum, item) => sum + item.subtotal, 0),
          itensSelecionados: itensSelecionados.length
        };
        
        const novaFatura: FaturaEmitida = {
          id: faturaId,
          numero,
          unidadeId: dadosFatura.unidadeId,
          clienteId: dadosFatura.clienteId,
          clienteNome: dadosFatura.clienteNome,
          itens: itensSelecionados,
          totais,
          vencimento: dadosFatura.vencimento,
          formaPagamento: dadosFatura.formaPagamento,
          status: 'EMITIDA',
          observacoes: dadosFatura.observacoes,
          emitidaEm: new Date().toISOString(),
          emitidaPor: 'admin', // TODO: get from auth
          timeline: [{
            id: `event_${Date.now()}`,
            tipo: 'EMISSAO',
            descricao: `Fatura ${numero} emitida`,
            usuario: 'admin',
            timestamp: new Date().toISOString()
          }]
        };
        
        set(state => ({
          faturasEmitidas: [...state.faturasEmitidas, novaFatura]
        }));
        
        return faturaId;
      },
      
      gerarCobranca: async (faturaId) => {
        const state = get();
        const fatura = state.faturasEmitidas.find(f => f.id === faturaId);
        
        if (!fatura) {
          return { success: false, error: 'Fatura não encontrada' };
        }
        
        // Mock da chamada para o BolePix
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simula chamada API
          
          const cobrancaId = `boleto_${Date.now()}`;
          
          set(state => ({
            faturasEmitidas: state.faturasEmitidas.map(f => 
              f.id === faturaId ? { ...f, cobrancaId } : f
            )
          }));
          
          get().addTimelineEvent(faturaId, {
            tipo: 'COBRANCA_GERADA',
            descricao: 'Cobrança PIX/Boleto gerada com sucesso',
            usuario: 'admin'
          });
          
          return { success: true };
        } catch (error) {
          return { success: false, error: 'Erro ao gerar cobrança' };
        }
      },
      
      enviarFatura: (faturaId, canal, destinatario) => {
        get().addTimelineEvent(faturaId, {
          tipo: 'ENVIADA',
          descricao: `Enviada via ${canal} para ${destinatario}`,
          usuario: 'admin'
        });
        
        set(state => ({
          faturasEmitidas: state.faturasEmitidas.map(f => 
            f.id === faturaId ? { ...f, status: 'ENVIADA' } : f
          )
        }));
      },
      
      cancelarFatura: (faturaId, motivo) => {
        get().addTimelineEvent(faturaId, {
          tipo: 'CANCELADA',
          descricao: `Cancelada: ${motivo}`,
          usuario: 'admin'
        });
        
        set(state => ({
          faturasEmitidas: state.faturasEmitidas.map(f => 
            f.id === faturaId ? { ...f, status: 'CANCELADA' } : f
          )
        }));
      },
      
      calcularKPIs: () => {
        const state = get();
        const selecionados = state.lancamentosFaturaveis
          .filter(l => l.selecionado)
          .reduce((sum, l) => sum + l.subtotal, 0);
        
        // KPIs serão calculados a partir de dados reais do Supabase
        // emAtraso e proximos7Dias virão de títulos reais
        set({
          kpis: {
            selecionados,
            emAtraso: 0, // Será preenchido com dados reais
            proximos7Dias: 0 // Será preenchido com dados reais
          }
        });
      },
      
      addException: (exception) => {
        set(state => ({
          exceptions: [...state.exceptions, exception]
        }));
      },
      
      clearExceptions: () => {
        set({ exceptions: [] });
      },
      
      addTimelineEvent: (faturaId, event) => {
        const timelineEvent: FaturaTimelineEvent = {
          ...event,
          id: `event_${Date.now()}`,
          timestamp: new Date().toISOString()
        };
        
        set(state => ({
          faturasEmitidas: state.faturasEmitidas.map(f => 
            f.id === faturaId 
              ? { ...f, timeline: [...f.timeline, timelineEvent] }
              : f
          )
        }));
      },
      
      // Emissão Avulsa Actions
      addEmissaoAvulsaEvent: (event) => {
        set(state => ({
          emissaoAvulsaEvents: [...state.emissaoAvulsaEvents, event]
        }));
        get().updateEmissaoAvulsaStats();
      },
      
      updateEmissaoAvulsaStats: () => {
        const state = get();
        const events = state.emissaoAvulsaEvents;
        const currentMonth = format(new Date(), 'yyyy-MM');
        
        const mesAtual = events.filter(e => 
          e.tipo === 'GERADA' && 
          e.timestamp.startsWith(currentMonth)
        ).length;
        
        const totalEmissoes = events.filter(e => e.tipo === 'GERADA').length;
        
        // Calcular média mensal (últimos 12 meses)
        const dozeMonthsAgo = new Date();
        dozeMonthsAgo.setMonth(dozeMonthsAgo.getMonth() - 12);
        
        const emissoesPeriodo = events.filter(e => 
          e.tipo === 'GERADA' && 
          new Date(e.timestamp) >= dozeMonthsAgo
        ).length;
        
        const mediaMensal = emissoesPeriodo / 12;
        
        // Formas preferidas
        const formasPreferidas = events
          .filter(e => e.tipo === 'GERADA')
          .reduce((acc, event) => {
            // Mock - poderia extrair da fatura
            const forma = 'PIX'; // placeholder
            acc[forma] = (acc[forma] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        
        set({
          emissaoAvulsaStats: {
            totalEmissoes,
            mesAtual,
            mediaMensal,
            formasPreferidas
          }
        });
      },
      
      getEmissaoAvulsaUsage: (periodo) => {
        const state = get();
        const events = state.emissaoAvulsaEvents.filter(e => e.tipo === 'GERADA');
        
        if (periodo === 'mes') {
          const currentMonth = format(new Date(), 'yyyy-MM');
          return events.filter(e => e.timestamp.startsWith(currentMonth)).length;
        } else {
          const currentYear = format(new Date(), 'yyyy');
          return events.filter(e => e.timestamp.startsWith(currentYear)).length;
        }
      },
      
      
      clearData: () => {
        set({
          lancamentosFaturaveis: [],
          faturasEmitidas: [],
          exceptions: [],
          emissaoAvulsaEvents: [],
          emissaoAvulsaStats: defaultEmissaoAvulsaStats,
          kpis: { selecionados: 0, emAtraso: 0, proximos7Dias: 0 }
        });
      }
    }),
    {
      name: 'faturamento-store',
      version: 1
    }
  )
);