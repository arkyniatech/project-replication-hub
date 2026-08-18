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

// Gera código amigável de exibição: prefixo do grupo + número de série
// Exemplo: grupo "Containers" + S/N "081" → "CT-081"
export function formatCodigoExibicao(
  equipamento: { numero_serie?: string | null; codigo_interno?: string | null; grupos_equipamentos?: { nome?: string } | null; grupo_nome?: string | null } | null | undefined
): string {
  if (!equipamento) return '';
  const sn = (equipamento.numero_serie || '').trim();
  const grupoNome = equipamento.grupos_equipamentos?.nome || equipamento.grupo_nome || '';

  if (!sn) {
    // Fallback: código interno antigo
    return equipamento.codigo_interno || '';
  }

  // Prefixo: primeiras 2 letras significativas do grupo (sem acentos)
  const prefixo = grupoNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 2)
    .toUpperCase();

  return prefixo ? `${prefixo}-${sn}` : sn;
}

// #9.5: a busca de equipamento existia em duas versões — a lista casava 5
// campos e o modal de transferência casava 2, e nenhuma das duas era o código
// EXIBIDO. Como "BE-059" é derivado (formatCodigoExibicao) e não existe em
// coluna nenhuma, o modal nunca achava legado. Predicado único, uma fonte só.
export interface EquipamentoBuscavel {
  codigo_interno?: string | null;
  numero_serie?: string | null;
  grupo_nome?: string | null;
  modelo_nome?: string | null;
  grupos_equipamentos?: { nome?: string } | null;
  modelos_equipamentos?: { nome_comercial?: string } | null;
}

// Campos que a busca cobre — mesma ordem do placeholder mostrado ao usuário.
export function equipamentoMatchesBusca(
  equipamento: EquipamentoBuscavel | null | undefined,
  termo: string
): boolean {
  const term = (termo || '').trim().toLowerCase();
  if (!term) return true; // busca vazia não filtra
  if (!equipamento) return false;

  const grupoNome = equipamento.grupo_nome || equipamento.grupos_equipamentos?.nome || '';
  const modeloNome = equipamento.modelo_nome || equipamento.modelos_equipamentos?.nome_comercial || '';

  const campos = [
    equipamento.codigo_interno || '',
    formatCodigoExibicao({ ...equipamento, grupo_nome: grupoNome }),
    equipamento.numero_serie || '',
    modeloNome,
    grupoNome,
  ];

  return campos.some(campo => campo.toLowerCase().includes(term));
}

// Texto do campo de busca — mantido junto do predicado para que a promessa
// feita ao usuário e o que a busca realmente faz não voltem a divergir.
export const PLACEHOLDER_BUSCA_EQUIPAMENTO =
  'Digite código, número de série, modelo ou grupo...';

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

// Verificar se tabela de preços tem pelo menos um valor
export function hasAnyPrice(tabelaPorLoja: Record<string, Record<string, number>>): boolean {
  return Object.values(tabelaPorLoja).some(tabela => 
    Object.values(tabela).some(preco => preco > 0)
  );
}