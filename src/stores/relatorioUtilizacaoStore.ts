import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { startOfDay, endOfDay, isWithinInterval, differenceInDays, addDays, format } from 'date-fns';
import { useEquipamentosStore } from './equipamentosStore';
import { useContratosStore } from './contratosStore';

export interface FiltrosUtilizacao {
  lojaId: string;
  grupoId?: string;
  modeloId?: string;
  tipoControle: 'TODOS' | 'SERIE' | 'SALDO';
  exibicao: 'EQUIPAMENTO' | 'MODELO' | 'GRUPO';
  ordenarPor: 'UTILIZACAO' | 'DIAS_LOCADOS' | 'RECEITA' | 'CODIGO';
}

export interface ItemUtilizacao {
  id: string;
  codigo: string;
  nome: string;
  lojaId: string;
  lojaNome: string;
  tipo: 'SERIE' | 'SALDO';
  quantidade: number;
  diasPeriodo: number;
  diasLocados: number;
  diasManutencao: number;
  diasDisponiveis: number;
  utilizacaoPercent: number;
  receitaEstimada: number;
  contratos: Array<{
    numero: string;
    cliente: string;
    inicio: string;
    fim: string;
  }>;
  statusCalendario: Array<{
    data: string;
    status: 'LOCADO' | 'REVISAO' | 'DISPONIVEL';
  }>;
}

export interface KPIsUtilizacao {
  utilizacaoMedia: number;
  totalDiasLocados: number;
  totalDiasDisponiveis: number;
  receitaEstimada: number;
}

interface RelatorioUtilizacaoState {
  filtros: FiltrosUtilizacao;
  periodo: {
    inicio: string;
    fim: string;
  };
  
  // Actions
  setFiltros: (filtros: Partial<FiltrosUtilizacao>) => void;
  setPeriodo: (periodo: { inicio: string; fim: string }) => void;
  limparFiltros: () => void;
  
  // Selectors  
  getResumoUtilizacao: () => ItemUtilizacao[];
  getKPIs: () => KPIsUtilizacao;
  getCsvData: () => any[];
  getPdfData: () => any;
}

const calcularUtilizacao = (
  equipamento: any,
  contratos: any[],
  periodo: { inicio: string; fim: string },
  lojaNome: string
): ItemUtilizacao => {
  const dataInicio = startOfDay(new Date(periodo.inicio));
  const dataFim = endOfDay(new Date(periodo.fim));
  const diasPeriodo = differenceInDays(dataFim, dataInicio) + 1;
  
  // Calcular quantidade baseada no tipo
  const quantidade = equipamento.tipo === 'SERIALIZADO' ? 1 : 
    (equipamento.saldosPorLoja?.[equipamento.lojaAtualId || 'loja-1']?.qtd || 1);
  
  const capacidadeTotal = diasPeriodo * quantidade;
  
  // Encontrar contratos que afetam este equipamento
  const contratosRelevantes = contratos.filter(contrato => 
    contrato.lojaId === equipamento.lojaAtualId &&
    contrato.itens.some((item: any) => 
      (equipamento.tipo === 'SERIALIZADO' && item.equipId === equipamento.id) ||
      (equipamento.tipo === 'SALDO' && item.modeloId === equipamento.modeloId)
    )
  );
  
  let diasLocados = 0;
  const contratosInfo: Array<{ numero: string; cliente: string; inicio: string; fim: string }> = [];
  
  // Calcular dias locados
  contratosRelevantes.forEach(contrato => {
    contrato.itens.forEach((item: any) => {
      const relevante = (equipamento.tipo === 'SERIALIZADO' && item.equipId === equipamento.id) ||
                       (equipamento.tipo === 'SALDO' && item.modeloId === equipamento.modeloId);
      
      if (relevante && item.periodo) {
        const itemInicio = startOfDay(new Date(item.periodo.inicio));
        const itemFim = endOfDay(new Date(item.periodo.fim));
        
        // Verificar interseção com período do relatório
        const inicioInteracao = itemInicio > dataInicio ? itemInicio : dataInicio;
        const fimInteracao = itemFim < dataFim ? itemFim : dataFim;
        
        if (inicioInteracao <= fimInteracao) {
          const diasItem = differenceInDays(fimInteracao, inicioInteracao) + 1;
          diasLocados += diasItem;
          
          contratosInfo.push({
            numero: contrato.numero,
            cliente: contrato.clienteNome,
            inicio: format(itemInicio, 'dd/MM/yyyy'),
            fim: format(itemFim, 'dd/MM/yyyy')
          });
        }
      }
    });
  });
  
  // Mock de dias em manutenção (2-5% do período)
  const diasManutencao = Math.floor(diasPeriodo * (Math.random() * 0.03 + 0.02));
  
  const diasDisponiveis = Math.max(0, capacidadeTotal - diasLocados - diasManutencao);
  const utilizacaoPercent = capacidadeTotal > 0 ? (diasLocados / capacidadeTotal) * 100 : 0;
  
  // Receita estimada mock (R$ 150-300 por dia)
  const precoDiariaMock = Math.floor(Math.random() * 150) + 150;
  const receitaEstimada = diasLocados * precoDiariaMock;
  
  // Gerar calendário de status
  const statusCalendario: Array<{ data: string; status: 'LOCADO' | 'REVISAO' | 'DISPONIVEL' }> = [];
  for (let i = 0; i < diasPeriodo; i++) {
    const dataAtual = addDays(dataInicio, i);
    const dataStr = format(dataAtual, 'yyyy-MM-dd');
    
    // Verificar se está locado neste dia
    const locadoNesteAia = contratosRelevantes.some(contrato =>
      contrato.itens.some((item: any) => {
        const relevante = (equipamento.tipo === 'SERIALIZADO' && item.equipId === equipamento.id) ||
                         (equipamento.tipo === 'SALDO' && item.modeloId === equipamento.modeloId);
        
        if (relevante && item.periodo) {
          const itemInicio = new Date(item.periodo.inicio);
          const itemFim = new Date(item.periodo.fim);
          return dataAtual >= itemInicio && dataAtual <= itemFim;
        }
        return false;
      })
    );
    
    // Mock de revisão (3% dos dias)
    const emRevisao = !locadoNesteAia && Math.random() < 0.03;
    
    statusCalendario.push({
      data: dataStr,
      status: locadoNesteAia ? 'LOCADO' : emRevisao ? 'REVISAO' : 'DISPONIVEL'
    });
  }
  
  return {
    id: equipamento.id,
    codigo: equipamento.id,
    nome: equipamento.descricao || equipamento.id,
    lojaId: equipamento.lojaAtualId || 'loja-1',
    lojaNome,
    tipo: equipamento.tipo === 'SERIALIZADO' ? 'SERIE' : 'SALDO',
    quantidade,
    diasPeriodo,
    diasLocados,
    diasManutencao,
    diasDisponiveis,
    utilizacaoPercent,
    receitaEstimada,
    contratos: contratosInfo,
    statusCalendario
  };
};

export const useRelatorioUtilizacaoStore = create<RelatorioUtilizacaoState>()(
  persist(
    (set, get) => ({
      filtros: {
        lojaId: 'loja-1',
        tipoControle: 'TODOS',
        exibicao: 'EQUIPAMENTO',
        ordenarPor: 'UTILIZACAO'
      },
      periodo: {
        inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        fim: new Date().toISOString().split('T')[0]
      },
      
      setFiltros: (novosFiltros) => {
        set((state) => ({
          filtros: { ...state.filtros, ...novosFiltros }
        }));
      },
      
      setPeriodo: (periodo) => {
        set({ periodo });
      },
      
      limparFiltros: () => {
        set((state) => ({
          filtros: {
            lojaId: state.filtros.lojaId, // Manter loja
            tipoControle: 'TODOS',
            exibicao: 'EQUIPAMENTO',
            ordenarPor: 'UTILIZACAO'
          }
        }));
      },
      
      getResumoUtilizacao: () => {
        const { filtros, periodo } = get();
        const equipamentosStore = useEquipamentosStore.getState();
        const contratosStore = useContratosStore.getState();
        
        const equipamentos = equipamentosStore.getEquipamentosByLoja(filtros.lojaId);
        const contratos = contratosStore.getContratosPorLoja(filtros.lojaId);
        const loja = equipamentosStore.lojas.find(l => l.id === filtros.lojaId);
        const lojaNome = loja?.nome || 'Loja Principal';
        
        // Filtrar equipamentos
        let equipamentosFiltrados = equipamentos.filter(e => {
          if (filtros.tipoControle !== 'TODOS') {
            const tipoEquip = e.tipo === 'SERIALIZADO' ? 'SERIE' : 'SALDO';
            if (tipoEquip !== filtros.tipoControle) return false;
          }
          
          if (filtros.grupoId && e.grupoId !== filtros.grupoId) return false;
          if (filtros.modeloId && e.modeloId !== filtros.modeloId) return false;
          
          return e.statusGlobal !== 'INATIVO';
        });
        
        // Calcular utilização para cada equipamento
        let itens = equipamentosFiltrados.map(equipamento => 
          calcularUtilizacao(equipamento, contratos, periodo, lojaNome)
        );
        
        // Agrupar conforme exibição
        if (filtros.exibicao === 'MODELO') {
          const porModelo = new Map<string, ItemUtilizacao[]>();
          itens.forEach(item => {
            const modeloId = equipamentosFiltrados.find(e => e.id === item.id)?.modeloId || 'unknown';
            if (!porModelo.has(modeloId)) porModelo.set(modeloId, []);
            porModelo.get(modeloId)!.push(item);
          });
          
          itens = Array.from(porModelo.entries()).map(([modeloId, items]) => {
            const modelo = equipamentosStore.modelos.find(m => m.id === modeloId);
            return {
              id: modeloId,
              codigo: modelo?.nomeComercial || modeloId,
              nome: modelo?.nomeComercial || modeloId,
              lojaId: filtros.lojaId,
              lojaNome,
              tipo: items[0]?.tipo || 'SERIE',
              quantidade: items.reduce((sum, i) => sum + i.quantidade, 0),
              diasPeriodo: items[0]?.diasPeriodo || 0,
              diasLocados: items.reduce((sum, i) => sum + i.diasLocados, 0),
              diasManutencao: items.reduce((sum, i) => sum + i.diasManutencao, 0),
              diasDisponiveis: items.reduce((sum, i) => sum + i.diasDisponiveis, 0),
              utilizacaoPercent: items.length > 0 ? 
                items.reduce((sum, i) => sum + i.utilizacaoPercent, 0) / items.length : 0,
              receitaEstimada: items.reduce((sum, i) => sum + i.receitaEstimada, 0),
              contratos: items.flatMap(i => i.contratos),
              statusCalendario: items[0]?.statusCalendario || []
            };
          });
        } else if (filtros.exibicao === 'GRUPO') {
          const porGrupo = new Map<string, ItemUtilizacao[]>();
          itens.forEach(item => {
            const grupoId = equipamentosFiltrados.find(e => e.id === item.id)?.grupoId || 'unknown';
            if (!porGrupo.has(grupoId)) porGrupo.set(grupoId, []);
            porGrupo.get(grupoId)!.push(item);
          });
          
          itens = Array.from(porGrupo.entries()).map(([grupoId, items]) => {
            const grupo = equipamentosStore.grupos.find(g => g.id === grupoId);
            return {
              id: grupoId,
              codigo: grupo?.nome || grupoId,
              nome: grupo?.nome || grupoId,
              lojaId: filtros.lojaId,
              lojaNome,
              tipo: items[0]?.tipo || 'SERIE',
              quantidade: items.reduce((sum, i) => sum + i.quantidade, 0),
              diasPeriodo: items[0]?.diasPeriodo || 0,
              diasLocados: items.reduce((sum, i) => sum + i.diasLocados, 0),
              diasManutencao: items.reduce((sum, i) => sum + i.diasManutencao, 0),
              diasDisponiveis: items.reduce((sum, i) => sum + i.diasDisponiveis, 0),
              utilizacaoPercent: items.length > 0 ? 
                items.reduce((sum, i) => sum + i.utilizacaoPercent, 0) / items.length : 0,
              receitaEstimada: items.reduce((sum, i) => sum + i.receitaEstimada, 0),
              contratos: items.flatMap(i => i.contratos),
              statusCalendario: items[0]?.statusCalendario || []
            };
          });
        }
        
        // Ordenar
        itens.sort((a, b) => {
          switch (filtros.ordenarPor) {
            case 'UTILIZACAO':
              return b.utilizacaoPercent - a.utilizacaoPercent;
            case 'DIAS_LOCADOS':
              return b.diasLocados - a.diasLocados;
            case 'RECEITA':
              return b.receitaEstimada - a.receitaEstimada;
            case 'CODIGO':
              return a.codigo.localeCompare(b.codigo);
            default:
              return 0;
          }
        });
        
        return itens;
      },
      
      getKPIs: () => {
        const itens = get().getResumoUtilizacao();
        
        if (itens.length === 0) {
          return {
            utilizacaoMedia: 0,
            totalDiasLocados: 0,
            totalDiasDisponiveis: 0,
            receitaEstimada: 0
          };
        }
        
        const totalCapacidade = itens.reduce((sum, item) => 
          sum + (item.diasPeriodo * item.quantidade), 0);
        const totalLocados = itens.reduce((sum, item) => sum + item.diasLocados, 0);
        
        return {
          utilizacaoMedia: totalCapacidade > 0 ? (totalLocados / totalCapacidade) * 100 : 0,
          totalDiasLocados: totalLocados,
          totalDiasDisponiveis: itens.reduce((sum, item) => sum + item.diasDisponiveis, 0),
          receitaEstimada: itens.reduce((sum, item) => sum + item.receitaEstimada, 0)
        };
      },
      
      getCsvData: () => {
        const itens = get().getResumoUtilizacao();
        return itens.map(item => ({
          'Código': item.codigo,
          'Nome': item.nome,
          'Loja': item.lojaNome,
          'Tipo': item.tipo,
          'Quantidade': item.quantidade,
          'Dias do Período': item.diasPeriodo,
          'Dias Locados': item.diasLocados,
          'Dias Manutenção': item.diasManutencao,
          'Dias Disponíveis': item.diasDisponiveis,
          'Utilização %': item.utilizacaoPercent.toFixed(1),
          'Receita Estimada': `R$ ${item.receitaEstimada.toFixed(2)}`
        }));
      },
      
      getPdfData: () => {
        const { filtros, periodo } = get();
        const itens = get().getResumoUtilizacao();
        const kpis = get().getKPIs();
        
        return {
          titulo: 'Relatório de Utilização de Equipamentos',
          periodo: {
            inicio: periodo.inicio,
            fim: periodo.fim
          },
          filtros,
          kpis,
          itens: itens.slice(0, 20), // Top 20 para PDF
          geradoEm: new Date().toISOString()
        };
      }
    }),
    {
      name: 'relatorio-utilizacao-store',
    }
  )
);