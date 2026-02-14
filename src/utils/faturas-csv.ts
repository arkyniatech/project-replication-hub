import { format } from 'date-fns';

interface FaturaCSV {
  numero: string;
  emissao: string;
  cliente: string;
  contrato: string;
  tipo: string;
  forma: string;
  total: number;
}

interface FiltrosCSV {
  periodo?: { inicio: string; fim: string };
  loja: string;
  totalFaturas: number;
  totalValor: number;
}

export function gerarCSVRelatorioFaturas(
  faturas: FaturaCSV[],
  filtros: FiltrosCSV
): void {
  // Cabeçalhos
  const headers = [
    'Nº Fatura',
    'Emissão',
    'Cliente',
    'Contrato',
    'Tipo',
    'Forma de Pagamento',
    'Total (R$)',
  ];

  // Linhas de dados
  const rows = faturas.map((f) => [
    f.numero,
    format(new Date(f.emissao), 'dd/MM/yyyy'),
    f.cliente,
    f.contrato,
    f.tipo,
    f.forma,
    f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ]);

  // Montar CSV
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
    '', // Linha em branco
    `Total de Faturas;${filtros.totalFaturas}`,
    `Valor Total;R$ ${filtros.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  ].join('\n');

  // Adicionar BOM UTF-8 para garantir acentuação correta no Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const nomeArquivo = `faturas_${format(new Date(), 'yyyy-MM-dd')}_${filtros.loja.toLowerCase().replace(/\s+/g, '-')}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', nomeArquivo);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
