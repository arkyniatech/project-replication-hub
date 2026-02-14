import type { TarefaLogistica, Motorista, Veiculo } from "@/types";

export interface CSVItineraryData {
  tarefas: TarefaLogistica[];
  data: string;
  loja: string;
  motorista?: Motorista;
  veiculo?: Veiculo;
}

export const generateItineraryCSV = (data: CSVItineraryData): void => {
  const { tarefas, data: selectedDate, loja, motorista, veiculo } = data;
  
  // Filtrar apenas tarefas válidas
  const tarefasValidas = tarefas.filter(t => 
    ['PROGRAMADO', 'EM_ROTA', 'REAGENDADO'].includes(t.status)
  );

  // Cabeçalhos das colunas
  const headers = [
    'data',
    'loja', 
    'motorista',
    'veiculo',
    'placa',
    'tipo',
    'contrato',
    'cliente',
    'telefone',
    'endereco',
    'bairro',
    'cidade',
    'hora_prevista',
    'duracao_min',
    'prioridade',
    'status',
    'observacao'
  ];

  // Converter tarefas para linhas CSV
  const rows = tarefasValidas.map(tarefa => {
    const enderecoParts = tarefa.endereco.split(' - ');
    const enderecoBase = enderecoParts[0] || tarefa.endereco;
    const bairro = enderecoParts[1] || '';
    const cidade = enderecoParts[2] || '';
    
    return [
      new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR'),
      loja,
      motorista?.nome || '',
      veiculo?.modelo || '',
      veiculo?.placa || '',
      tarefa.tipo,
      tarefa.contratoId || '',
      tarefa.cliente.nome,
      tarefa.cliente.fone || '',
      enderecoBase,
      bairro,
      cidade,
      new Date(tarefa.previstoISO).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      tarefa.duracaoMin.toString(),
      tarefa.prioridade,
      tarefa.status,
      tarefa.observacao || ''
    ];
  });

  // Combinar cabeçalhos e dados
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // Adicionar BOM para UTF-8
  const BOM = '\uFEFF';
  const csvBlob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });

  // Gerar nome do arquivo
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, '');
  };
  
  const motoristaSlug = motorista?.nome.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '') || 'sem_motorista';
    
  const lojaSlug = loja.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  const filename = `itinerario_${lojaSlug}_${motoristaSlug}_${formatDate(selectedDate)}.csv`;

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

export const formatCSVField = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = value.toString();
  
  // Escapar aspas duplicando-as
  const escapedValue = stringValue.replace(/"/g, '""');
  
  // Envolver em aspas se contém separador, quebra de linha ou aspas
  if (escapedValue.includes(';') || escapedValue.includes('\n') || escapedValue.includes('"')) {
    return `"${escapedValue}"`;
  }
  
  return escapedValue;
};