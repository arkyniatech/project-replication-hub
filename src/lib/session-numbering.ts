/**
 * Sistema de numeração amigável para sessões de conferência de estoque
 * Formato: CE-{LOJA}-{AAAA}{MM}{DD}-{SEQ}
 */
import { format } from 'date-fns';

export interface NumberingConfig {
  prefixo: string;
  larguraSequencial: number;
  mascara: 'PADRAO' | 'ALTERNATIVA';
}

export interface CounterStorage {
  [key: string]: number; // chave: "{lojaCodigo}-{yyyymmdd}", valor: próximo sequencial
}

export interface MigrationFlags {
  estoqueDisplayNo: boolean;
}

// Configuração padrão
const DEFAULT_CONFIG: NumberingConfig = {
  prefixo: 'CE',
  larguraSequencial: 2,
  mascara: 'PADRAO'
};

// Storage keys
const COUNTERS_KEY = 'conference_counters';
const MIGRATION_KEY = 'conference_migration';
const CONFIG_KEY = 'conference_numbering_config';

/**
 * Normaliza o nome/código da loja para usar na numeração
 * Remove espaços, acentos e caracteres especiais
 */
export function normalizeLoja(lojaNome: string): string {
  return lojaNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9]/g, '') // Remove caracteres especiais
    .substring(0, 6) // Máximo 6 caracteres
    .toUpperCase();
}

/**
 * Gera a chave única para o contador
 */
export function makeCounterKey(lojaCodigo: string, yyyymmdd: string): string {
  return `${lojaCodigo}-${yyyymmdd}`;
}

/**
 * Obtém a configuração de numeração
 */
export function getNumberingConfig(): NumberingConfig {
  const stored = localStorage.getItem(CONFIG_KEY);
  return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
}

/**
 * Salva a configuração de numeração
 */
export function setNumberingConfig(config: Partial<NumberingConfig>): void {
  const current = getNumberingConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
}

/**
 * Obtém os contadores do localStorage
 */
export function getCounters(): CounterStorage {
  const stored = localStorage.getItem(COUNTERS_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Salva os contadores no localStorage
 */
export function saveCounters(counters: CounterStorage): void {
  localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

/**
 * Obtém o próximo sequencial para uma chave
 */
export function getNextSequential(key: string): number {
  const counters = getCounters();
  const current = counters[key] || 0;
  const next = current + 1;
  
  counters[key] = next;
  saveCounters(counters);
  
  return next;
}

/**
 * Constrói o displayNo baseado na configuração
 */
export function buildDisplayNo(params: {
  lojaCodigo: string;
  yyyymmdd: string;
  seq: number;
  config?: NumberingConfig;
}): string {
  const { lojaCodigo, yyyymmdd, seq, config = getNumberingConfig() } = params;
  
  const seqPadded = seq.toString().padStart(config.larguraSequencial, '0');
  
  if (config.mascara === 'ALTERNATIVA') {
    const year = yyyymmdd.substring(0, 4);
    const month = yyyymmdd.substring(4, 6);
    const day = yyyymmdd.substring(6, 8);
    return `${year}/${month}/${day}-${lojaCodigo}-${seqPadded}`;
  }
  
  // Formato padrão
  return `${config.prefixo}-${lojaCodigo}-${yyyymmdd}-${seqPadded}`;
}

/**
 * Gera um displayNo único para uma nova sessão
 */
export function generateDisplayNo(lojaNome: string, dataCreation: Date = new Date()): string {
  const lojaCodigo = normalizeLoja(lojaNome);
  const yyyymmdd = format(dataCreation, 'yyyyMMdd');
  const key = makeCounterKey(lojaCodigo, yyyymmdd);
  
  let seq = getNextSequential(key);
  let displayNo = buildDisplayNo({ lojaCodigo, yyyymmdd, seq });
  
  // Garantir unicidade - verificar se já existe na store de conferência
  let tentativas = 0;
  while (tentativas < 99 && displayNoExists(displayNo)) {
    seq = getNextSequential(key);
    displayNo = buildDisplayNo({ lojaCodigo, yyyymmdd, seq });
    tentativas++;
  }
  
  if (tentativas >= 99) {
    throw new Error('Não foi possível gerar um displayNo único após 99 tentativas');
  }
  
  return displayNo;
}

/**
 * Verifica se um displayNo já existe nas sessões
 */
export function displayNoExists(displayNo: string): boolean {
  const stored = localStorage.getItem('conference-store');
  if (!stored) return false;
  
  try {
    const data = JSON.parse(stored);
    const sessoes = data.state?.sessoes || [];
    return sessoes.some((s: any) => s.displayNo === displayNo);
  } catch {
    return false;
  }
}

/**
 * Obtém flags de migração
 */
export function getMigrationFlags(): MigrationFlags {
  const stored = localStorage.getItem(MIGRATION_KEY);
  return stored ? JSON.parse(stored) : { estoqueDisplayNo: false };
}

/**
 * Atualiza flags de migração
 */
export function setMigrationFlag(flag: keyof MigrationFlags, value: boolean): void {
  const current = getMigrationFlags();
  current[flag] = value;
  localStorage.setItem(MIGRATION_KEY, JSON.stringify(current));
}

/**
 * Migra sessões existentes sem displayNo
 */
export function migrateSessions(sessoes: any[], lojas: any[]): any[] {
  const flags = getMigrationFlags();
  
  if (flags.estoqueDisplayNo) {
    return sessoes; // Já migrado
  }
  
  const counters: CounterStorage = {};
  const sessoesAtualizadas = sessoes.map(sessao => {
    if (sessao.displayNo) return sessao; // Já tem displayNo
    
    const loja = lojas.find(l => l.id === sessao.lojaId);
    if (!loja) return sessao; // Loja não encontrada
    
    const lojaCodigo = normalizeLoja(loja.nome);
    const dataCreation = new Date(sessao.criadaEm);
    const yyyymmdd = format(dataCreation, 'yyyyMMdd');
    const key = makeCounterKey(lojaCodigo, yyyymmdd);
    
    // Obter próximo sequencial para esta data/loja
    counters[key] = (counters[key] || 0) + 1;
    
    const displayNo = buildDisplayNo({
      lojaCodigo,
      yyyymmdd,
      seq: counters[key]
    });
    
    return {
      ...sessao,
      displayNo
    };
  });
  
  // Atualizar contadores globais
  const globalCounters = getCounters();
  Object.entries(counters).forEach(([key, count]) => {
    globalCounters[key] = Math.max(globalCounters[key] || 0, count);
  });
  saveCounters(globalCounters);
  
  // Marcar como migrado
  setMigrationFlag('estoqueDisplayNo', true);
  
  return sessoesAtualizadas;
}

/**
 * Extrai informações de um displayNo para ordenação/busca
 */
export function parseDisplayNo(displayNo: string): {
  lojaCodigo?: string;
  year?: number;
  month?: number;
  day?: number;
  seq?: number;
  date?: Date;
} | null {
  try {
    // Tentar formato padrão: CE-LOJA-20250920-01
    const padrao = displayNo.match(/^([A-Z]+)-([A-Z0-9]+)-(\d{8})-(\d+)$/);
    if (padrao) {
      const [, , lojaCodigo, yyyymmdd, seqStr] = padrao;
      const year = parseInt(yyyymmdd.substring(0, 4));
      const month = parseInt(yyyymmdd.substring(4, 6));
      const day = parseInt(yyyymmdd.substring(6, 8));
      const seq = parseInt(seqStr);
      
      return {
        lojaCodigo,
        year,
        month,
        day,
        seq,
        date: new Date(year, month - 1, day)
      };
    }
    
    // Tentar formato alternativo: 2025/09/20-LOJA-01
    const alternativo = displayNo.match(/^(\d{4})\/(\d{2})\/(\d{2})-([A-Z0-9]+)-(\d+)$/);
    if (alternativo) {
      const [, yearStr, monthStr, dayStr, lojaCodigo, seqStr] = alternativo;
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const day = parseInt(dayStr);
      const seq = parseInt(seqStr);
      
      return {
        lojaCodigo,
        year,
        month,
        day,
        seq,
        date: new Date(year, month - 1, day)
      };
    }
    
    return null;
  } catch {
    return null;
  }
}