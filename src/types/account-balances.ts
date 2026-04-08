// Tipos para o Selector de Saldos por Conta

export interface DateRange {
  from: string; // 'YYYY-MM-DD'
  to: string;   // 'YYYY-MM-DD'
}

export interface AccountBalancesOptions {
  lojaId?: string;
  includePending?: boolean;
  accrual?: boolean;
  currency?: 'BRL';
}

export interface AccountBalance {
  contaId: string;
  contaCodigo: string;
  contaNome: string;
  banco?: string;
  agencia?: string;
  numero?: string;
  moeda: 'BRL';
  opening: number;        // saldo anterior à data 'from'
  credits: number;        // somatório período (C)
  debits: number;         // somatório período (D)
  closing: number;        // opening + credits - debits
  bloqueios?: number;     // retenções/bloqueios
  available: number;      // closing - bloqueios
  conciliadoAte?: string; // maior data conciliada na conta
  pendentes?: {
    lanc: number;         // lançamentos pendentes
    extrato: number;      // linhas de extrato não pareadas
  };
  lastUpdatedISO: string;
}

export interface AccountBalancesResult {
  dataRef: string;        // 'YYYY-MM-DD' (to date)
  lojaId: string;
  contas: AccountBalance[];
}

// Tipos para fontes de dados
export interface Bloqueio {
  contaId: string;
  valor: number;
  motivo?: string;
}

// Cache key para memoização
export interface BalancesCacheKey {
  lojaId: string;
  dateRange: DateRange;
  includePending: boolean;
  accrual: boolean;
  currency: string;
  versionCounters: {
    contas: number;
    lancamentos: number;
    bloqueios: number;
    conciliacoes: number;
  };
}

// Diagnósticos (dev only)
export interface BalancesDiagnostics {
  cacheKey: string;
  executionTimeMs: number;
  contas: Array<{
    contaId: string;
    contaNome: string;
    openingEntries: number;
    periodEntries: number;
    totalCredits: number;
    totalDebits: number;
    bloqueios: number;
  }>;
  totalProcessedEntries: number;
  cacheHit: boolean;
}