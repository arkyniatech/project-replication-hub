import { useVeiculosStore } from '@/stores/veiculosStore';
import { useVeiculosConfigStore } from '@/stores/veiculosConfigStore';
import { format, differenceInHours } from 'date-fns';

// Relatório de Eficiência
export const getRelatorioEficiencia = (filtros: {
  periodo?: { inicio: string; fim: string };
  placa?: string;
  tipo?: string;
  postoId?: string;
  lojaId?: string;
}) => {
  const store = useVeiculosStore.getState();
  let abastecimentos = store.abastecimentos;

  // Aplicar filtros
  if (filtros.periodo) {
    abastecimentos = abastecimentos.filter(a =>
      a.data >= filtros.periodo!.inicio && a.data <= filtros.periodo!.fim
    );
  }

  if (filtros.postoId) {
    abastecimentos = abastecimentos.filter(a => a.posto_id === filtros.postoId);
  }

  // Enriquecer com dados do veículo e posto
  const relatorio = abastecimentos.map(abast => {
    const veiculo = store.veiculos.find(v => v.id === abast.veiculo_id);
    const posto = store.postos.find(p => p.id === abast.posto_id);

    if (!veiculo) return null;

    // Aplicar filtros de veículo
    if (filtros.placa && !veiculo.placa.toLowerCase().includes(filtros.placa.toLowerCase())) {
      return null;
    }
    if (filtros.tipo && veiculo.tipo !== filtros.tipo) return null;
    if (filtros.lojaId && veiculo.loja_id !== filtros.lojaId) return null;

    // Determinar flags usando configurações
    const configStore = useVeiculosConfigStore.getState();
    let flags = [];
    
    if (configStore.isKmAtipico(abast.km_percorrido)) {
      flags.push('KM Atípico');
    }
    
    if (configStore.isConsumoForaDaFaixa(veiculo.tipo, abast.km_por_l)) {
      flags.push('Consumo Fora da Faixa');
    }

    return {
      data: abast.data,
      placa: veiculo.placa,
      posto: posto?.nome || 'N/A',
      litros: abast.litros,
      kmPercorrido: abast.km_percorrido,
      kmPorL: abast.km_por_l,
      custoPorKm: abast.custo_por_km,
      flags: flags.join(', ') || '-'
    };
  }).filter(Boolean);

  // Calcular KPIs
  const porTipo = relatorio.reduce((acc, item) => {
    const veiculo = store.veiculos.find(v => v.placa === item!.placa);
    if (!veiculo) return acc;

    if (!acc[veiculo.tipo]) {
      acc[veiculo.tipo] = { totalKmL: 0, totalLitros: 0, count: 0 };
    }

    acc[veiculo.tipo].totalKmL += item!.kmPorL * item!.litros;
    acc[veiculo.tipo].totalLitros += item!.litros;
    acc[veiculo.tipo].count++;

    return acc;
  }, {} as Record<string, any>);

  const mediasPorTipo = Object.entries(porTipo).map(([tipo, dados]) => ({
    tipo,
    media: dados.totalLitros > 0 ? dados.totalKmL / dados.totalLitros : 0
  }));

  // Melhor e pior veículo
  const veiculosKmL = relatorio.reduce((acc, item) => {
    if (!acc[item!.placa]) {
      acc[item!.placa] = { totalKmL: 0, totalLitros: 0 };
    }
    acc[item!.placa].totalKmL += item!.kmPorL * item!.litros;
    acc[item!.placa].totalLitros += item!.litros;
    return acc;
  }, {} as Record<string, any>);

  const rankingVeiculos = Object.entries(veiculosKmL)
    .map(([placa, dados]) => ({
      placa,
      media: dados.totalLitros > 0 ? dados.totalKmL / dados.totalLitros : 0
    }))
    .sort((a, b) => b.media - a.media);

  const melhorVeiculo = rankingVeiculos[0] || null;
  const piorVeiculo = rankingVeiculos[rankingVeiculos.length - 1] || null;

  return {
    dados: relatorio,
    kpis: {
      mediasPorTipo,
      melhorVeiculo,
      piorVeiculo
    }
  };
};

// Relatório de Custos
export const getRelatorioCustos = (filtros: {
  periodo?: { inicio: string; fim: string };
  placa?: string;
  lojaId?: string;
}) => {
  const store = useVeiculosStore.getState();
  let veiculos = store.veiculos;

  // Aplicar filtros de veículo
  if (filtros.placa) {
    veiculos = veiculos.filter(v =>
      v.placa.toLowerCase().includes(filtros.placa!.toLowerCase())
    );
  }
  if (filtros.lojaId) {
    veiculos = veiculos.filter(v => v.loja_id === filtros.lojaId);
  }

  const relatorio = veiculos.map(veiculo => {
    // Calcular custo de combustível
    let abastecimentos = store.abastecimentos.filter(a => a.veiculo_id === veiculo.id);
    if (filtros.periodo) {
      abastecimentos = abastecimentos.filter(a =>
        a.data >= filtros.periodo!.inicio && a.data <= filtros.periodo!.fim
      );
    }

    const combustivel = abastecimentos.reduce((sum, a) => sum + (a.preco_litro * a.litros), 0);

    // Calcular custo de manutenção
    let manutencoes = store.manutencoes.filter(m => m.veiculo_id === veiculo.id);
    if (filtros.periodo) {
      manutencoes = manutencoes.filter(m =>
        m.data_abertura >= filtros.periodo!.inicio && m.data_abertura <= filtros.periodo!.fim
      );
    }

    const manutencao = manutencoes.reduce((sum, m) =>
      sum + (m.custo_pecas || 0) + (m.custo_mo || 0), 0
    );

    const total = combustivel + manutencao;
    const custoPorKm = veiculo.odometro_atual > 0 ? total / veiculo.odometro_atual : 0;

    return {
      veiculo: `${veiculo.placa} - ${veiculo.modelo}`,
      combustivel,
      manutencao,
      total,
      custoPorKm
    };
  });

  return relatorio.sort((a, b) => b.total - a.total);
};

// Relatório de Disponibilidade
export const getRelatorioDisponibilidade = (filtros: {
  periodo?: { inicio: string; fim: string };
  placa?: string;
  lojaId?: string;
}) => {
  const store = useVeiculosStore.getState();
  let veiculos = store.veiculos;

  // Aplicar filtros
  if (filtros.placa) {
    veiculos = veiculos.filter(v =>
      v.placa.toLowerCase().includes(filtros.placa!.toLowerCase())
    );
  }
  if (filtros.lojaId) {
    veiculos = veiculos.filter(v => v.loja_id === filtros.lojaId);
  }

  const agora = new Date();

  const relatorio = veiculos.map(veiculo => {
    let manutencoes = store.manutencoes.filter(m => m.veiculo_id === veiculo.id);

    if (filtros.periodo) {
      manutencoes = manutencoes.filter(m =>
        m.data_abertura >= filtros.periodo!.inicio && m.data_abertura <= filtros.periodo!.fim
      );
    }

    // Calcular horas em oficina
    const horasOficina = manutencoes.reduce((total, m) => {
      if (m.status === 'CONCLUIDA') {
        return total + m.tempo_parado_h;
      } else {
        // OS aberta - calcular até agora
        const entrada = new Date(m.dt_entradaISO || m.data_abertura);
        const horasAteAgora = differenceInHours(agora, entrada);
        return total + horasAteAgora;
      }
    }, 0);

    // Assumir que o período tem X horas totais (para simplificar, usar 24h * dias do período)
    let horasTotal = 24 * 30; // Padrão: 30 dias
    if (filtros.periodo) {
      const inicio = new Date(filtros.periodo.inicio);
      const fim = new Date(filtros.periodo.fim);
      const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      horasTotal = 24 * dias;
    }

    const horasOperando = Math.max(0, horasTotal - horasOficina);
    const disponibilidade = horasTotal > 0 ? (horasOperando / horasTotal) * 100 : 100;

    return {
      veiculo: `${veiculo.placa} - ${veiculo.modelo}`,
      horasOperando,
      horasOficina,
      disponibilidade
    };
  });

  return relatorio.sort((a, b) => b.disponibilidade - a.disponibilidade);
};

// Relatório de Manutenções
export const getRelatorioManutencoes = (filtros: {
  periodo?: { inicio: string; fim: string };
  placa?: string;
  oficinaId?: string;
  grupoId?: string;
  servicoId?: string;
  status?: 'ABERTA' | 'CONCLUIDA' | undefined;
  lojaId?: string;
}) => {
  const store = useVeiculosStore.getState();
  let manutencoes = store.manutencoes;

  // Aplicar filtros
  if (filtros.periodo) {
    manutencoes = manutencoes.filter(m =>
      m.data_abertura >= filtros.periodo!.inicio && m.data_abertura <= filtros.periodo!.fim
    );
  }

  if (filtros.oficinaId) {
    manutencoes = manutencoes.filter(m => m.oficina_id === filtros.oficinaId);
  }

  if (filtros.grupoId) {
    manutencoes = manutencoes.filter(m => m.grupo_id === filtros.grupoId);
  }

  if (filtros.servicoId) {
    manutencoes = manutencoes.filter(m => m.servico_id === filtros.servicoId);
  }

  if (filtros.status) {
    manutencoes = manutencoes.filter(m => m.status === filtros.status);
  }

  // Enriquecer dados e aplicar filtro de veículo
  const relatorio = manutencoes.map(manut => {
    const veiculo = store.veiculos.find(v => v.id === manut.veiculo_id);
    const oficina = store.oficinas.find(o => o.id === manut.oficina_id);
    const servico = store.servicos.find(s => s.id === manut.servico_id);

    if (!veiculo) return null;

    // Filtros de veículo
    if (filtros.placa && !veiculo.placa.toLowerCase().includes(filtros.placa.toLowerCase())) {
      return null;
    }
    if (filtros.lojaId && veiculo.loja_id !== filtros.lojaId) return null;

    const total = (manut.custo_pecas || 0) + (manut.custo_mo || 0);

    return {
      numeroOS: manut.id.slice(0, 8),
      veiculo: `${veiculo.placa} - ${veiculo.modelo}`,
      oficina: oficina?.nome || 'N/A',
      servico: servico?.servico_especifico || 'N/A',
      entrada: manut.dt_entradaISO || manut.data_abertura,
      saida: manut.dt_saidaISO || '',
      tempoParada: manut.tempo_parado_h,
      custoPecas: manut.custo_pecas || 0,
      custoMO: manut.custo_mo || 0,
      total
    };
  }).filter(Boolean);

  return relatorio.sort((a, b) => new Date(b!.entrada).getTime() - new Date(a!.entrada).getTime());
};