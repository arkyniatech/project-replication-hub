// Dados financeiros mockados (LocaHub)
import { addDays, subDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface GenerateDataParams {
  dateRange?: DateRange;
  lojas?: string[];
  vendedor?: string;
}

interface FinancialData {
  kpis: {
    faturado: number;
    recebido: number;
    indiceCaixa: number;
    aReceberMes: number;
    aReceberProx: number;
    atrasado: number;
    percentualAtrasado: number;
  };
  sparklines: {
    faturado: Array<{ value: number }>;
    recebido: Array<{ value: number }>;
    indiceCaixa: Array<{ value: number }>;
    aReceberMes: Array<{ value: number }>;
    aReceberProx: Array<{ value: number }>;
    atrasado: Array<{ value: number }>;
  };
  trends: {
    faturado: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
    recebido: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
    indiceCaixa: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
    aReceberMes: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
    aReceberProx: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
    atrasado: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
  };
  chartData: {
    salesVsCash: Array<{
      date: string;
      faturado: number;
      recebido: number;
      conversao: number;
    }>;
    portfolio: Array<{
      categoria: string;
      aReceberMes: number;
      aReceberProx: number;
      atrasado: number;
      percentualAtrasado: number;
    }>;
    waterfall: Array<{
      categoria: string;
      valor: number;
      tipo: 'inicial' | 'positivo' | 'negativo' | 'final';
      acumulado: number;
    }>;
  };
  alerts: Array<{
    id: string;
    tipo: 'fuga_atraso' | 'recuperacao' | 'destaque_vendedor';
    titulo: string;
    descricao: string;
    valor: number;
    variacao: number;
    severidade: 'alta' | 'media' | 'baixa';
    cliente?: string;
    vendedor?: string;
  }>;
}

export function generateFinancialData(params: GenerateDataParams = {}): FinancialData {
  const { dateRange, lojas = ['1'], vendedor } = params;
  
  // Gerar dados base
  const baseValues = {
    faturado: 125000 + Math.random() * 50000,
    recebido: 98000 + Math.random() * 40000,
    aReceberMes: 380000 + Math.random() * 100000,
    aReceberProx: 720000 + Math.random() * 200000,
    atrasado: 85000 + Math.random() * 30000
  };

  const indiceCaixa = baseValues.faturado > 0 ? baseValues.recebido / baseValues.faturado : 0;
  const totalCarteira = baseValues.aReceberMes + baseValues.aReceberProx + baseValues.atrasado;
  const percentualAtrasado = totalCarteira > 0 ? (baseValues.atrasado / totalCarteira * 100) : 0;

  // Gerar sparklines (últimos 14 dias)
  const generateSparkline = (baseValue: number, volatility: number = 0.1) => {
    return Array.from({ length: 14 }, (_, i) => ({
      value: baseValue * (1 + (Math.random() - 0.5) * volatility)
    }));
  };

  // Gerar dados para o gráfico de vendas vs caixa (últimos 30 dias)
  const salesVsCashData = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), 'dd/MM');
    const faturado = 3000 + Math.random() * 8000;
    const recebido = faturado * (0.7 + Math.random() * 0.4);
    
    return {
      date,
      faturado,
      recebido,
      conversao: faturado > 0 ? (recebido / faturado * 100) : 0
    };
  });

  // Dados do portfolio por categoria
  const portfolioData = [
    {
      categoria: 'Contratos',
      aReceberMes: baseValues.aReceberMes * 0.6,
      aReceberProx: baseValues.aReceberProx * 0.7,
      atrasado: baseValues.atrasado * 0.5,
      percentualAtrasado: 0
    },
    {
      categoria: 'Serviços',
      aReceberMes: baseValues.aReceberMes * 0.3,
      aReceberProx: baseValues.aReceberProx * 0.2,
      atrasado: baseValues.atrasado * 0.3,
      percentualAtrasado: 0
    },
    {
      categoria: 'Vendas',
      aReceberMes: baseValues.aReceberMes * 0.1,
      aReceberProx: baseValues.aReceberProx * 0.1,
      atrasado: baseValues.atrasado * 0.2,
      percentualAtrasado: 0
    }
  ].map(item => ({
    ...item,
    percentualAtrasado: (item.aReceberMes + item.aReceberProx + item.atrasado) > 0 
      ? (item.atrasado / (item.aReceberMes + item.aReceberProx + item.atrasado) * 100) 
      : 0
  }));

  // Dados do waterfall
  const saldoAnterior = 850000;
  const faturadoPrazo = 45000;
  const recebidosPrazo = -62000;
  const novosAtrasos = 8500;
  const recebidosAtrasados = -12000;
  const saldoAtual = saldoAnterior + faturadoPrazo + recebidosPrazo + novosAtrasos + recebidosAtrasados;

  const waterfallData = [
    { categoria: 'Saldo Anterior', valor: saldoAnterior, tipo: 'inicial' as const, acumulado: saldoAnterior },
    { categoria: 'Faturado a Prazo', valor: faturadoPrazo, tipo: 'positivo' as const, acumulado: saldoAnterior + faturadoPrazo },
    { categoria: 'Recebidos no Prazo', valor: recebidosPrazo, tipo: 'negativo' as const, acumulado: saldoAnterior + faturadoPrazo + recebidosPrazo },
    { categoria: 'Novos Atrasos', valor: novosAtrasos, tipo: 'positivo' as const, acumulado: saldoAnterior + faturadoPrazo + recebidosPrazo + novosAtrasos },
    { categoria: 'Recebidos Atrasados', valor: recebidosAtrasados, tipo: 'negativo' as const, acumulado: saldoAtual },
    { categoria: 'Saldo Atual', valor: saldoAtual, tipo: 'final' as const, acumulado: saldoAtual }
  ];

  // Gerar alertas
  const alerts = [
    {
      id: '1',
      tipo: 'fuga_atraso' as const,
      titulo: 'Alta migração para atraso',
      descricao: 'R$ 15.400 em títulos venceram hoje sem pagamento',
      valor: 15400,
      variacao: 15400,
      severidade: 'alta' as const,
      cliente: 'Construtora ABC Ltda',
      vendedor: 'João Silva'
    },
    {
      id: '2',
      tipo: 'recuperacao' as const,
      titulo: 'Excelente recuperação',
      descricao: 'Cliente quitou R$ 28.900 em atraso',
      valor: 28900,
      variacao: -28900,
      severidade: 'baixa' as const,
      cliente: 'Metalúrgica XYZ S/A',
      vendedor: 'Maria Santos'
    },
    {
      id: '3',
      tipo: 'fuga_atraso' as const,
      titulo: 'Cliente em deterioração',
      descricao: 'Acúmulo de R$ 12.600 nos últimos 7 dias',
      valor: 12600,
      variacao: 12600,
      severidade: 'media' as const,
      cliente: 'Transportadora DEF',
      vendedor: 'Carlos Oliveira'
    }
  ];

  // Calcular trends (comparação com dia anterior - mock)
  const generateTrend = (value: number, type: 'currency' | 'percentage' = 'currency'): {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  } => {
    const variation = (Math.random() - 0.5) * 0.2; // -10% a +10%
    const direction: 'up' | 'down' | 'neutral' = variation > 0.02 ? 'up' : variation < -0.02 ? 'down' : 'neutral';
    
    let label: string;
    if (type === 'percentage') {
      label = `${variation > 0 ? '+' : ''}${(variation * 100).toFixed(1)}pp vs ontem`;
    } else {
      const variationValue = value * Math.abs(variation);
      label = `${variation > 0 ? '+' : '-'}${variationValue.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })} vs ontem`;
    }
    
    return { value: Math.abs(variation), direction, label };
  };

  return {
    kpis: {
      faturado: baseValues.faturado,
      recebido: baseValues.recebido,
      indiceCaixa,
      aReceberMes: baseValues.aReceberMes,
      aReceberProx: baseValues.aReceberProx,
      atrasado: baseValues.atrasado,
      percentualAtrasado
    },
    sparklines: {
      faturado: generateSparkline(baseValues.faturado, 0.15),
      recebido: generateSparkline(baseValues.recebido, 0.12),
      indiceCaixa: generateSparkline(indiceCaixa, 0.1),
      aReceberMes: generateSparkline(baseValues.aReceberMes, 0.08),
      aReceberProx: generateSparkline(baseValues.aReceberProx, 0.05),
      atrasado: generateSparkline(baseValues.atrasado, 0.2)
    },
    trends: {
      faturado: generateTrend(baseValues.faturado),
      recebido: generateTrend(baseValues.recebido),
      indiceCaixa: generateTrend(indiceCaixa, 'percentage'),
      aReceberMes: generateTrend(baseValues.aReceberMes),
      aReceberProx: generateTrend(baseValues.aReceberProx),
      atrasado: generateTrend(baseValues.atrasado)
    },
    chartData: {
      salesVsCash: salesVsCashData,
      portfolio: portfolioData,
      waterfall: waterfallData
    },
    alerts
  };
}