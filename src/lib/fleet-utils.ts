import { useVeiculosStore } from '@/stores/veiculosStore';
import { useVeiculosConfigStore } from '@/stores/veiculosConfigStore';
import { Veiculo, Abastecimento, Manutencao, TrocaOleo } from '@/types/veiculos';

// Selector para calcular Km por Litro médio de um veículo
export const getKmPorLitro = (veiculoId: string, periodo?: { inicio: string; fim: string }) => {
  const store = useVeiculosStore.getState();
  const abastecimentos = store.getAbastecimentosByVeiculo(veiculoId);
  
  if (!abastecimentos.length) return 0;
  
  let abastecimentosFiltrados = abastecimentos;
  if (periodo) {
    abastecimentosFiltrados = abastecimentos.filter(a => 
      a.data >= periodo.inicio && a.data <= periodo.fim
    );
  }
  
  if (!abastecimentosFiltrados.length) return 0;
  
  // Média ponderada por litros
  const totalKmPorL = abastecimentosFiltrados.reduce((sum, a) => sum + (a.km_por_l * a.litros), 0);
  const totalLitros = abastecimentosFiltrados.reduce((sum, a) => sum + a.litros, 0);
  
  return totalLitros > 0 ? totalKmPorL / totalLitros : 0;
};

// Selector para calcular custo de manutenção de um veículo
export const getCustoManutencao = (veiculoId: string, periodo?: { inicio: string; fim: string }) => {
  const store = useVeiculosStore.getState();
  const manutencoes = store.getManutencoesByVeiculo(veiculoId);
  
  if (!manutencoes.length) return { total: 0, porKm: 0 };
  
  let manutencoesFiltradas = manutencoes;
  if (periodo) {
    manutencoesFiltradas = manutencoes.filter(m => 
      m.data_abertura >= periodo.inicio && m.data_abertura <= periodo.fim
    );
  }
  
  const total = manutencoesFiltradas.reduce((sum, m) => 
    sum + (m.custo_pecas || 0) + (m.custo_mo || 0), 0
  );
  
  // Calcular custo por Km baseado na quilometragem do período
  const veiculo = store.veiculos.find(v => v.id === veiculoId);
  const porKm = veiculo && veiculo.odometro_atual > 0 ? total / veiculo.odometro_atual : 0;
  
  return { total, porKm };
};

// Selector para calcular tempo em oficina
export const getTempoEmOficina = (veiculoId: string, periodo?: { inicio: string; fim: string }) => {
  const store = useVeiculosStore.getState();
  const manutencoes = store.getManutencoesByVeiculo(veiculoId);
  
  if (!manutencoes.length) return 0;
  
  let manutencoesFiltradas = manutencoes;
  if (periodo) {
    manutencoesFiltradas = manutencoes.filter(m => 
      m.data_abertura >= periodo.inicio && m.data_abertura <= periodo.fim
    );
  }
  
  return manutencoesFiltradas.reduce((sum, m) => sum + m.tempo_parado_h, 0);
};

// Selector para alertas de troca de óleo
export const getAlertasTrocaOleo = (veiculoId: string) => {
  const store = useVeiculosStore.getState();
  const configStore = useVeiculosConfigStore.getState();
  const veiculo = store.veiculos.find(v => v.id === veiculoId);
  const oleo = store.getVeiculoOleoAtual(veiculoId);
  const trocas = store.getTrocasOleoByVeiculo(veiculoId);

  if (!veiculo || !oleo || !trocas.length) {
    return { status: 'sem_dados', percentualKm: 0, diasRestantes: 0 };
  }

  const ultimaTroca = trocas[0];
  const kmDesdeUltima = veiculo.odometro_atual - ultimaTroca.km_atual;
  const percentualKm = (kmDesdeUltima / oleo.intervalo_km) * 100;

  const hoje = new Date();
  const dataUltimaTroca = new Date(ultimaTroca.data);
  const proxDataTroca = new Date(dataUltimaTroca.getTime() + (oleo.intervalo_meses * 30 * 24 * 60 * 60 * 1000));
  const diasRestantes = Math.ceil((proxDataTroca.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));

  // Usar configurações para semáforo
  const margemKm = configStore.config.alertasOleo.margemKm;
  const margemDias = configStore.config.alertasOleo.margemPrazoDias;

  if (percentualKm >= 100 || diasRestantes <= 0) {
    return { status: 'vencido', percentualKm, diasRestantes };
  } else if (percentualKm >= (margemKm * 100) || diasRestantes <= margemDias) {
    return { status: 'alerta', percentualKm, diasRestantes };
  } else {
    return { status: 'ok', percentualKm, diasRestantes };
  }
};

// Função para calcular KPIs da frota
export const getFleetKPIs = (lojaId?: string, periodo?: { inicio: string; fim: string }) => {
  const store = useVeiculosStore.getState();
  const veiculos = lojaId 
    ? store.getVeiculosByLoja(lojaId)
    : store.veiculos;
  
  if (!veiculos.length) {
    return {
      proximasTrocasOleo: [],
      veiculoMaisEconomico: null,
      veiculoMenosEconomico: null,
      maiorCustoManutencao: null,
      maiorTempoOficina: null,
      percentualPreventivaEmDia: 0,
      custoTotalFrota: 0
    };
  }
  
  // Próximas trocas de óleo com semáforo
  const proximasTrocasOleo = veiculos.map(v => ({
    veiculo: v,
    alerta: getAlertasTrocaOleo(v.id)
  })).filter(item => item.alerta.status !== 'sem_dados');
  
  // Veículo mais e menos econômico
  const consumoVeiculos = veiculos.map(v => ({
    veiculo: v,
    kmPorL: getKmPorLitro(v.id, periodo)
  })).filter(item => item.kmPorL > 0);
  
  const veiculoMaisEconomico = consumoVeiculos.length > 0 
    ? consumoVeiculos.reduce((max, curr) => curr.kmPorL > max.kmPorL ? curr : max)
    : null;
    
  const veiculoMenosEconomico = consumoVeiculos.length > 0
    ? consumoVeiculos.reduce((min, curr) => curr.kmPorL < min.kmPorL ? curr : min)
    : null;
  
  // Maior custo de manutenção
  const custosManutencao = veiculos.map(v => ({
    veiculo: v,
    custo: getCustoManutencao(v.id, periodo)
  })).filter(item => item.custo.total > 0);
  
  const maiorCustoManutencao = custosManutencao.length > 0
    ? custosManutencao.reduce((max, curr) => curr.custo.total > max.custo.total ? curr : max)
    : null;
  
  // Maior tempo em oficina
  const temposOficina = veiculos.map(v => ({
    veiculo: v,
    tempoHoras: getTempoEmOficina(v.id, periodo)
  })).filter(item => item.tempoHoras > 0);
  
  const maiorTempoOficina = temposOficina.length > 0
    ? temposOficina.reduce((max, curr) => curr.tempoHoras > max.tempoHoras ? curr : max)
    : null;
  
  // Percentual preventiva em dia
  const veiculosComAlerta = proximasTrocasOleo.filter(item => 
    item.alerta.status === 'alerta' || item.alerta.status === 'vencido'
  ).length;
  const percentualPreventivaEmDia = veiculos.length > 0 
    ? ((veiculos.length - veiculosComAlerta) / veiculos.length) * 100
    : 0;
  
  // Custo total da frota (combustível + manutenção)
  let custoTotalCombustivel = 0;
  let custoTotalManutencao = 0;
  
  if (periodo) {
    veiculos.forEach(v => {
      const abastecimentos = store.getAbastecimentosByVeiculo(v.id)
        .filter(a => a.data >= periodo.inicio && a.data <= periodo.fim);
      custoTotalCombustivel += abastecimentos.reduce((sum, a) => sum + (a.preco_litro * a.litros), 0);
      
      custoTotalManutencao += getCustoManutencao(v.id, periodo).total;
    });
  }
  
  const custoTotalFrota = custoTotalCombustivel + custoTotalManutencao;
  
  return {
    proximasTrocasOleo,
    veiculoMaisEconomico,
    veiculoMenosEconomico,
    maiorCustoManutencao,
    maiorTempoOficina,
    percentualPreventivaEmDia,
    custoTotalFrota
  };
};

// Função para obter dados da lista/grid da frota
export const getFleetGridData = (lojaId?: string) => {
  const store = useVeiculosStore.getState();
  const veiculos = lojaId 
    ? store.getVeiculosByLoja(lojaId)
    : store.veiculos;
  
  return veiculos.map(veiculo => {
    const trocas = store.getTrocasOleoByVeiculo(veiculo.id);
    const manutencoes = store.getManutencoesByVeiculo(veiculo.id);
    const ultimaTroca = trocas[0];
    const ultimaManutencao = manutencoes[0];
    const alertaOleo = getAlertasTrocaOleo(veiculo.id);
    
    return {
      ...veiculo,
      ultimaTroca: ultimaTroca ? {
        data: ultimaTroca.data,
        km: ultimaTroca.km_atual
      } : null,
      ultimaManutencao: ultimaManutencao ? {
        data: ultimaManutencao.data_abertura,
        oficina: store.oficinas.find(o => o.id === ultimaManutencao.oficina_id)?.nome || 'N/A',
        servico: store.servicos.find(s => s.id === ultimaManutencao.servico_id)?.servico_especifico || 'N/A'
      } : null,
      alertaOleo
    };
  });
};