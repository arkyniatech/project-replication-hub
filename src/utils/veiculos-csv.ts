import { formatCSVField } from './csv';

export interface RelatorioEficienciaData {
  data: string;
  placa: string;
  posto: string;
  litros: number;
  kmPercorrido: number;
  kmPorL: number;
  custoPorKm: number;
  flags: string;
}

export interface RelatorioCustosData {
  veiculo: string;
  combustivel: number;
  manutencao: number;
  total: number;
  custoPorKm: number;
}

export interface RelatorioDisponibilidadeData {
  veiculo: string;
  horasOperando: number;
  horasOficina: number;
  disponibilidade: number;
}

export interface RelatorioManutencoesData {
  numeroOS: string;
  veiculo: string;
  oficina: string;
  servico: string;
  entrada: string;
  saida: string;
  tempoParada: number;
  custoPecas: number;
  custoMO: number;
  total: number;
}

export const exportRelatorioEficienciaCSV = (
  data: RelatorioEficienciaData[],
  filtros: any,
  loja: string
) => {
  const headers = [
    'Data',
    'Placa', 
    'Posto',
    'Litros',
    'Km Percorrido',
    'Km/L',
    'Custo/Km',
    'Flags'
  ];

  const rows = data.map(item => [
    new Date(item.data).toLocaleDateString('pt-BR'),
    item.placa,
    item.posto,
    item.litros.toFixed(2).replace('.', ','),
    item.kmPercorrido.toString(),
    item.kmPorL.toFixed(2).replace('.', ','),
    `R$ ${item.custoPorKm.toFixed(4).replace('.', ',')}`,
    item.flags
  ]);

  generateCSV('relatorio_eficiencia', headers, rows, loja);
};

export const exportRelatorioCustosCSV = (
  data: RelatorioCustosData[],
  filtros: any,
  loja: string
) => {
  const headers = [
    'Veículo',
    'Combustível (R$)',
    'Manutenção (R$)',
    'Total (R$)',
    'R$/Km'
  ];

  const rows = data.map(item => [
    item.veiculo,
    `R$ ${item.combustivel.toFixed(2).replace('.', ',')}`,
    `R$ ${item.manutencao.toFixed(2).replace('.', ',')}`,
    `R$ ${item.total.toFixed(2).replace('.', ',')}`,
    `R$ ${item.custoPorKm.toFixed(4).replace('.', ',')}`
  ]);

  generateCSV('relatorio_custos', headers, rows, loja);
};

export const exportRelatorioDisponibilidadeCSV = (
  data: RelatorioDisponibilidadeData[],
  filtros: any,
  loja: string
) => {
  const headers = [
    'Veículo',
    'Horas Operando',
    'Horas Oficina',
    'Disponibilidade %'
  ];

  const rows = data.map(item => [
    item.veiculo,
    item.horasOperando.toFixed(1).replace('.', ','),
    item.horasOficina.toFixed(1).replace('.', ','),
    `${item.disponibilidade.toFixed(1).replace('.', ',')}%`
  ]);

  generateCSV('relatorio_disponibilidade', headers, rows, loja);
};

export const exportRelatorioManutencoesCSV = (
  data: RelatorioManutencoesData[],
  filtros: any,
  loja: string
) => {
  const headers = [
    'Nº OS',
    'Veículo',
    'Oficina',
    'Serviço',
    'Entrada',
    'Saída',
    'Tempo Parada (h)',
    'Custo Peças (R$)',
    'Custo MO (R$)',
    'Total (R$)'
  ];

  const rows = data.map(item => [
    item.numeroOS,
    item.veiculo,
    item.oficina,
    item.servico,
    item.entrada ? new Date(item.entrada).toLocaleDateString('pt-BR') : '',
    item.saida ? new Date(item.saida).toLocaleDateString('pt-BR') : '',
    item.tempoParada.toFixed(1).replace('.', ','),
    `R$ ${item.custoPecas.toFixed(2).replace('.', ',')}`,
    `R$ ${item.custoMO.toFixed(2).replace('.', ',')}`,
    `R$ ${item.total.toFixed(2).replace('.', ',')}`
  ]);

  generateCSV('relatorio_manutencoes', headers, rows, loja);
};

const generateCSV = (
  tipoRelatorio: string,
  headers: string[],
  rows: string[][],
  loja: string
) => {
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => formatCSVField(field)).join(';'))
    .join('\n');

  // Adicionar BOM para UTF-8
  const BOM = '\uFEFF';
  const csvBlob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  // Gerar nome do arquivo
  const hoje = new Date();
  const dataFormatada = hoje.getFullYear().toString() + 
    (hoje.getMonth() + 1).toString().padStart(2, '0') + 
    hoje.getDate().toString().padStart(2, '0');
  
  const lojaSlug = loja.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  const filename = `${tipoRelatorio}_${dataFormatada}_${lojaSlug}.csv`;

  // Download do arquivo
  const link = document.createElement('a');
  const url = URL.createObjectURL(csvBlob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};