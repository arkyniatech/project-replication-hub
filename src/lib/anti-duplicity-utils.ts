import { DuplicityMatch, DuplicityFingerprints, DuplicityIndex, AntiDuplicityConfig } from '@/types';

// Funções para normalização e fingerprints
export function normalizeDocNumber(docNumero: string): string {
  return docNumero?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
}

export function normalizeFiscalKey(chaveFiscal44: string): string {
  return chaveFiscal44?.replace(/[^0-9]/g, '') || '';
}

// Gerar hash simples (simulação de SHA1)
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function buildFingerprints(titulo: any): DuplicityFingerprints {
  const fingerprints: DuplicityFingerprints = {};

  // fpExact: fornecedorId + docTipo + docNumero normalizado + valor
  if (titulo.fornecedorId && titulo.docTipo && titulo.docNumero && titulo.valorTotal) {
    const normalizedDoc = normalizeDocNumber(titulo.docNumero);
    const exactKey = `${titulo.fornecedorId}|${titulo.docTipo}|${normalizedDoc}|${titulo.valorTotal.toFixed(2)}`;
    fingerprints.fpExact = simpleHash(exactKey);
  }

  // fpFiscal: fornecedorId + chaveFiscal44 (apenas dígitos)
  if (titulo.fornecedorId && titulo.chaveFiscal44) {
    const normalizedKey = normalizeFiscalKey(titulo.chaveFiscal44);
    if (normalizedKey.length === 44) {
      const fiscalKey = `${titulo.fornecedorId}|${normalizedKey}`;
      fingerprints.fpFiscal = simpleHash(fiscalKey);
    }
  }

  // fpStrong: fornecedorId + emissao + valor + qtdParcelas + categoria
  if (titulo.fornecedorId && titulo.emissaoISO && titulo.valorTotal && titulo.qtdParcelas && titulo.categoriaN2) {
    const emissaoYYYYMMDD = titulo.emissaoISO.substring(0, 10).replace(/-/g, '');
    const strongKey = `${titulo.fornecedorId}|${emissaoYYYYMMDD}|${titulo.valorTotal.toFixed(2)}|${titulo.qtdParcelas}|${titulo.categoriaN2}`;
    fingerprints.fpStrong = simpleHash(strongKey);
  }

  return fingerprints;
}

// Atualizar índice de duplicidades
export function updateDupIndex(titulo: any, oldTitulo?: any): void {
  const dupIndex = getDupIndex();

  // Remover referências antigas se editando
  if (oldTitulo) {
    const oldFingerprints = buildFingerprints(oldTitulo);
    removeFromIndex(dupIndex, oldFingerprints, titulo.id);
  }

  // Adicionar novas referências se título não cancelado
  if (titulo.status !== 'cancelado') {
    const fingerprints = buildFingerprints(titulo);
    addToIndex(dupIndex, fingerprints, titulo.id);
  }

  // Salvar índice atualizado
  localStorage.setItem('cp.dupIndex', JSON.stringify(dupIndex));
}

function addToIndex(index: DuplicityIndex, fingerprints: DuplicityFingerprints, tituloId: string): void {
  if (fingerprints.fpExact) {
    if (!index.exact[fingerprints.fpExact]) index.exact[fingerprints.fpExact] = [];
    if (!index.exact[fingerprints.fpExact].includes(tituloId)) {
      index.exact[fingerprints.fpExact].push(tituloId);
    }
  }

  if (fingerprints.fpFiscal) {
    if (!index.fiscal[fingerprints.fpFiscal]) index.fiscal[fingerprints.fpFiscal] = [];
    if (!index.fiscal[fingerprints.fpFiscal].includes(tituloId)) {
      index.fiscal[fingerprints.fpFiscal].push(tituloId);
    }
  }

  if (fingerprints.fpStrong) {
    if (!index.strong[fingerprints.fpStrong]) index.strong[fingerprints.fpStrong] = [];
    if (!index.strong[fingerprints.fpStrong].includes(tituloId)) {
      index.strong[fingerprints.fpStrong].push(tituloId);
    }
  }
}

function removeFromIndex(index: DuplicityIndex, fingerprints: DuplicityFingerprints, tituloId: string): void {
  if (fingerprints.fpExact && index.exact[fingerprints.fpExact]) {
    index.exact[fingerprints.fpExact] = index.exact[fingerprints.fpExact].filter(id => id !== tituloId);
    if (index.exact[fingerprints.fpExact].length === 0) {
      delete index.exact[fingerprints.fpExact];
    }
  }

  if (fingerprints.fpFiscal && index.fiscal[fingerprints.fpFiscal]) {
    index.fiscal[fingerprints.fpFiscal] = index.fiscal[fingerprints.fpFiscal].filter(id => id !== tituloId);
    if (index.fiscal[fingerprints.fpFiscal].length === 0) {
      delete index.fiscal[fingerprints.fpFiscal];
    }
  }

  if (fingerprints.fpStrong && index.strong[fingerprints.fpStrong]) {
    index.strong[fingerprints.fpStrong] = index.strong[fingerprints.fpStrong].filter(id => id !== tituloId);
    if (index.strong[fingerprints.fpStrong].length === 0) {
      delete index.strong[fingerprints.fpStrong];
    }
  }
}

export function getDupIndex(): DuplicityIndex {
  const stored = localStorage.getItem('cp.dupIndex');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Erro ao carregar índice de duplicidade:', e);
    }
  }
  
  return { exact: {}, fiscal: {}, strong: {} };
}

// Buscar duplicidades
export function dupSearch(titulo: any, config?: AntiDuplicityConfig): DuplicityMatch[] {
  if (!config?.habilitado) return [];

  const matches: DuplicityMatch[] = [];
  const fingerprints = buildFingerprints(titulo);
  const dupIndex = getDupIndex();
  
  // Dados mockados de títulos para comparação
  const titulosPagar = JSON.parse(localStorage.getItem('titulosPagar') || '[]');
  
  // Verificar matches bloqueantes
  if (config.regras.chaveFiscal && fingerprints.fpFiscal) {
    const fiscalMatches = dupIndex.fiscal[fingerprints.fpFiscal] || [];
    fiscalMatches.forEach(tituloId => {
      if (tituloId !== titulo.id) {
        const matchTitulo = titulosPagar.find((t: any) => t.id === tituloId);
        if (matchTitulo) {
          matches.push(createMatch(matchTitulo, 'BLOQUEANTE', 'fiscal'));
        }
      }
    });
  }

  if (config.regras.docNumeroValor && fingerprints.fpExact) {
    const exactMatches = dupIndex.exact[fingerprints.fpExact] || [];
    exactMatches.forEach(tituloId => {
      if (tituloId !== titulo.id) {
        const matchTitulo = titulosPagar.find((t: any) => t.id === tituloId);
        if (matchTitulo) {
          matches.push(createMatch(matchTitulo, 'BLOQUEANTE', 'exact'));
        }
      }
    });
  }

  // Verificar matches de alerta
  if (config.regras.checagemForte && fingerprints.fpStrong) {
    const strongMatches = dupIndex.strong[fingerprints.fpStrong] || [];
    strongMatches.forEach(tituloId => {
      if (tituloId !== titulo.id) {
        const matchTitulo = titulosPagar.find((t: any) => t.id === tituloId);
        if (matchTitulo && !matches.some(m => m.tituloId === tituloId)) {
          matches.push(createMatch(matchTitulo, 'ALERTA', 'strong'));
        }
      }
    });
  }

  // Verificar fuzzy matching (opcional)
  if (config.regras.fuzzyMatching && titulo.docNumero) {
    titulosPagar.forEach((t: any) => {
      if (t.id !== titulo.id && 
          t.fornecedorId === titulo.fornecedorId && 
          t.docNumero &&
          !matches.some(m => m.tituloId === t.id)) {
        
        const similarity = calculateSimilarity(titulo.docNumero, t.docNumero);
        const valorProx = Math.abs(titulo.valorTotal - t.valorTotal) / titulo.valorTotal;
        
        if (similarity <= 2 && valorProx <= 0.01) { // <= 2 chars diferentes e valor ±1%
          const match = createMatch(t, 'INFO', 'fuzzy');
          match.similarity = similarity;
          matches.push(match);
        }
      }
    });
  }

  return matches;
}

function createMatch(titulo: any, tipo: 'BLOQUEANTE' | 'ALERTA' | 'INFO', motivo: string): DuplicityMatch {
  return {
    id: `match-${titulo.id}`,
    tipo,
    motivo: motivo as any,
    tituloId: titulo.id,
    unidadeId: titulo.unidadeId || 'loja1',
    fornecedorId: titulo.fornecedorId,
    docTipo: titulo.docTipo,
    docNumero: titulo.docNumero,
    chaveFiscal44: titulo.chaveFiscal44,
    emissao: titulo.emissaoISO || titulo.emissao,
    valorTotal: titulo.valorTotal,
    status: titulo.status || 'em_edicao'
  };
}

// Calcular similaridade (Levenshtein distance simplificada)
function calculateSimilarity(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Configuração padrão
export function getDefaultAntiDuplicityConfig(): AntiDuplicityConfig {
  return {
    habilitado: true,
    regras: {
      chaveFiscal: true,
      docNumeroValor: true,
      checagemForte: true,
      crossLoja: true,
      fuzzyMatching: false
    },
    politica: {
      alertas: 'avisar'
    },
    limites: {
      financeiro: 5000,
      gestor: 20000,
      admin: Infinity
    },
    mensagens: {
      bloqueante: 'Título com características idênticas já cadastrado. Revise antes de prosseguir.',
      alerta: 'Encontrados títulos similares. Recomenda-se revisão para evitar duplicidade.',
      info: 'Títulos com características parecidas encontrados para referência.'
    }
  };
}

// Verificar se usuário pode forçar duplicidade
export function canForceDuplicity(valorTitulo: number, perfilId: string): boolean {
  const config = getAntiDuplicityConfig();
  
  switch (perfilId) {
    case 'admin':
      return true;
    case 'gestor':
      return valorTitulo <= config.limites.gestor;
    case 'financeiro':
      return valorTitulo <= config.limites.financeiro;
    default:
      return false;
  }
}

// Obter configuração de anti-duplicidade
export function getAntiDuplicityConfig(): AntiDuplicityConfig {
  const config = JSON.parse(localStorage.getItem('config') || '{}');
  return config.financeiro?.antiDuplicidade || getDefaultAntiDuplicityConfig();
}

// Salvar configuração de anti-duplicidade
export function saveAntiDuplicityConfig(config: AntiDuplicityConfig): void {
  const appConfig = JSON.parse(localStorage.getItem('config') || '{}');
  if (!appConfig.financeiro) appConfig.financeiro = {};
  appConfig.financeiro.antiDuplicidade = config;
  localStorage.setItem('config', JSON.stringify(appConfig));
}