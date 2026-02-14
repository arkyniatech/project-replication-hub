// Utilitários para equipamentos conforme especificações

export const PERIODOS = [
  { key: 'DIARIA', label: 'Diária' },
  { key: 'SEMANA', label: '7 dias' },
  { key: 'QUINZENA', label: '14 dias' },
  { key: 'D21', label: '21 dias' },
  { key: 'MES', label: '28 dias' },
] as const;

export type PeriodoKey = typeof PERIODOS[number]['key'];

// Formatação monetária brasileira
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Parse de valor monetário brasileiro (aceita vírgula e ponto)
export function parseMoneyBR(value: string): number {
  if (!value) return 0;
  
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.]/g, '');
  
  // Se tem vírgula, considera como separador decimal brasileiro
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace('.', '').replace(',', '.')) || 0;
  }
  
  // Senão, considera ponto como decimal
  return parseFloat(cleaned) || 0;
}

// Formatar código com padding
export function padCodigo(n: number, min: number = 3): string {
  return String(n).padStart(min, '0');
}

// Diferença entre tabelas de preços para histórico
export function diffTabelaPrecos(
  prev: Record<string, Record<string, number>>,
  next: Record<string, Record<string, number>>,
  lojas: Array<{ id: string; nome: string }>
): Array<{
  lojaId: string;
  lojaNome: string;
  periodo: PeriodoKey;
  valorAnterior: number;
  valorNovo: number;
}> {
  const changes: Array<{
    lojaId: string;
    lojaNome: string;
    periodo: PeriodoKey;
    valorAnterior: number;
    valorNovo: number;
  }> = [];

  lojas.forEach(loja => {
    PERIODOS.forEach(periodo => {
      const valorAnterior = prev[loja.id]?.[periodo.key] || 0;
      const valorNovo = next[loja.id]?.[periodo.key] || 0;

      if (valorAnterior !== valorNovo) {
        changes.push({
          lojaId: loja.id,
          lojaNome: loja.nome,
          periodo: periodo.key,
          valorAnterior,
          valorNovo,
        });
      }
    });
  });

  return changes;
}

// Validar prefixo de código
export function validatePrefixoCodigo(prefixo: string): boolean {
  return /^[A-Z0-9]{2,6}$/.test(prefixo);
}

// Gerar próximo código baseado no modelo
export function gerarProximoCodigo(prefixo: string, sequencial: number): string {
  if (!prefixo) return '';
  return `${prefixo.toUpperCase()}${padCodigo(sequencial, 3)}`;
}

// Verificar se tabela de preços tem pelo menos um valor
export function hasAnyPrice(tabelaPorLoja: Record<string, Record<string, number>>): boolean {
  return Object.values(tabelaPorLoja).some(tabela => 
    Object.values(tabela).some(preco => preco > 0)
  );
}