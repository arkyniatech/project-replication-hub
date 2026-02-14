import { PoliticaID, politicas, WindowConfig } from '@/stores/politicasStore';
import { addMonths, lastDayOfMonth, format, parseISO } from 'date-fns';

export interface Contexto {
  cliente: { 
    id: string; 
    politica?: PoliticaID; 
    aplicarAuto?: boolean;
  };
  lojaId: string;
  periodoDias: 1 | 7 | 14 | 21 | 28;
  itens: Array<{ 
    modeloId: string; 
    grupoId: string; 
    qtd: number; 
    precoTabela: number;
  }>;
  dataEventoISO: string;
}

export interface ResultadoPolitica {
  descontoPctContrato: number;
  totalTabela: number;
  totalComDesconto: number;
  faturamentoAgrupado: {
    window: WindowConfig;
    billDate: string;
    dueDate: string;
    chaveAgrupamento: string;
  };
  explicacao: string[];
}

/**
 * Ajusta uma data para o dia desejado, respeitando o último dia do mês
 */
function safeDate(baseDate: Date, targetDay: number, monthShift: number): string {
  let targetDate = addMonths(baseDate, monthShift);
  const lastDay = lastDayOfMonth(targetDate).getDate();
  const finalDay = Math.min(targetDay, lastDay);
  
  targetDate.setDate(finalDay);
  return format(targetDate, 'yyyy-MM-dd');
}

/**
 * Encontra a janela correspondente para uma data
 */
function findWindow(politica: PoliticaID, dateISO: string): WindowConfig | null {
  const date = parseISO(dateISO);
  const dayOfMonth = date.getDate();
  const config = politicas[politica];
  
  if (!config) return null;
  
  for (const window of config.faturamento.windows) {
    if (dayOfMonth >= window.startDay && dayOfMonth <= window.endDay) {
      return window;
    }
  }
  
  // Fallback para última janela se não encontrou
  return config.faturamento.windows[config.faturamento.windows.length - 1];
}

/**
 * Constrói a chave de agrupamento para consolidação
 */
function buildAggregationKey(clienteId: string, billDate: string): string {
  return `${clienteId}:${billDate}`;
}

/**
 * Motor principal: aplica política comercial ao contexto
 */
export function aplicarPolitica(contexto: Contexto): ResultadoPolitica {
  const explicacao: string[] = [];
  
  // Se não tem política ou aplicar auto desabilitado, retornar sem desconto
  if (!contexto.cliente.politica || contexto.cliente.aplicarAuto === false) {
    const totalTabela = contexto.itens.reduce((sum, item) => 
      sum + (item.precoTabela * item.qtd), 0
    );
    
    explicacao.push('Nenhuma política aplicada (sem política ou auto-aplicação desabilitada).');
    
    // Retornar com valores default
    const dataEvento = parseISO(contexto.dataEventoISO);
    return {
      descontoPctContrato: 0,
      totalTabela,
      totalComDesconto: totalTabela,
      faturamentoAgrupado: {
        window: { startDay: 1, endDay: 30, billDay: 30, dueDay: 10, billMonthShift: 0, dueMonthShift: 1 },
        billDate: safeDate(dataEvento, 30, 0),
        dueDate: safeDate(dataEvento, 10, 1),
        chaveAgrupamento: buildAggregationKey(contexto.cliente.id, safeDate(dataEvento, 30, 0)),
      },
      explicacao,
    };
  }
  
  const politica = politicas[contexto.cliente.politica];
  const dataEvento = parseISO(contexto.dataEventoISO);
  
  // Calcular subtotal de tabela
  const totalTabela = contexto.itens.reduce((sum, item) => 
    sum + (item.precoTabela * item.qtd), 0
  );
  
  // Aplicar desconto
  const descontoPct = politica.descontoPct;
  const valorDesconto = totalTabela * (descontoPct / 100);
  const totalComDesconto = totalTabela - valorDesconto;
  
  explicacao.push(`Política ${politica.id} aplicada: ${politica.nome}`);
  explicacao.push(`Subtotal de tabela: R$ ${totalTabela.toFixed(2)}`);
  explicacao.push(`Desconto ${descontoPct}%: -R$ ${valorDesconto.toFixed(2)}`);
  explicacao.push(`Total com desconto: R$ ${totalComDesconto.toFixed(2)}`);
  
  // Determinar janela de faturamento
  const window = findWindow(contexto.cliente.politica, contexto.dataEventoISO);
  
  if (!window) {
    throw new Error('Não foi possível determinar janela de faturamento');
  }
  
  // Calcular datas de faturamento
  const billDate = safeDate(dataEvento, window.billDay, window.billMonthShift);
  const dueDate = safeDate(dataEvento, window.dueDay, window.dueMonthShift);
  const chaveAgrupamento = buildAggregationKey(contexto.cliente.id, billDate);
  
  explicacao.push(`Janela de faturamento: ${window.startDay}–${window.endDay} do mês`);
  explicacao.push(`Data de emissão da fatura: ${format(parseISO(billDate), 'dd/MM/yyyy')}`);
  explicacao.push(`Data de vencimento: ${format(parseISO(dueDate), 'dd/MM/yyyy')}`);
  explicacao.push(`Chave de agrupamento: ${chaveAgrupamento}`);
  
  return {
    descontoPctContrato: descontoPct,
    totalTabela,
    totalComDesconto,
    faturamentoAgrupado: {
      window,
      billDate,
      dueDate,
      chaveAgrupamento,
    },
    explicacao,
  };
}

/**
 * Verifica se uma data cai em uma janela específica
 */
export function verificarJanela(
  politica: PoliticaID, 
  dataISO: string, 
  windowIndex: number
): boolean {
  const date = parseISO(dataISO);
  const dayOfMonth = date.getDate();
  const config = politicas[politica];
  
  if (!config || !config.faturamento.windows[windowIndex]) return false;
  
  const window = config.faturamento.windows[windowIndex];
  return dayOfMonth >= window.startDay && dayOfMonth <= window.endDay;
}

/**
 * Retorna todas as janelas de uma política
 */
export function getJanelas(politica: PoliticaID): WindowConfig[] {
  const config = politicas[politica];
  return config ? config.faturamento.windows : [];
}
