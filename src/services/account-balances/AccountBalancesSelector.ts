// Selector único para cálculo de saldos por conta
import {
  DateRange,
  AccountBalancesOptions,
  AccountBalancesResult,
  AccountBalance,
  BalancesCacheKey,
  BalancesDiagnostics,
  Bloqueio
} from '@/types/account-balances';
import { Conta, Lancamento, Conciliacao } from '@/types/financeiro';

interface EventBus {
  emit: (event: string, data: any) => void;
}

class AccountBalancesSelector {
  private cache = new Map<string, { result: AccountBalancesResult; timestamp: number }>();
  private versionCounters = {
    contas: 0,
    lancamentos: 0,
    bloqueios: 0,
    conciliacoes: 0
  };
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  // API principal
  getAccountBalances(
    dateRange: DateRange,
    opts: AccountBalancesOptions = {}
  ): AccountBalancesResult {
    const startTime = Date.now();
    const options = this.normalizeOptions(opts);
    
    // Gerar chave de cache
    const cacheKey = this.generateCacheKey(dateRange, options);
    const cacheKeyStr = JSON.stringify(cacheKey);
    
    // Verificar cache
    const cached = this.cache.get(cacheKeyStr);
    if (cached && Date.now() - cached.timestamp < 30000) { // Cache por 30s
      this.logDiagnostics(cacheKeyStr, cached.result, Date.now() - startTime, true);
      return cached.result;
    }

    // Calcular saldos
    const result = this.calculateBalances(dateRange, options);
    
    // Salvar no cache
    this.cache.set(cacheKeyStr, {
      result,
      timestamp: Date.now()
    });

    const executionTime = Date.now() - startTime;
    this.logDiagnostics(cacheKeyStr, result, executionTime, false);
    
    // Emitir evento
    this.eventBus.emit('balances:updated', {
      lojaId: options.lojaId,
      dateRange
    });

    return result;
  }

  private normalizeOptions(opts: AccountBalancesOptions): Required<AccountBalancesOptions> {
    return {
      lojaId: opts.lojaId || this.getLojaAtiva(),
      includePending: opts.includePending ?? false,
      accrual: opts.accrual ?? false,
      currency: opts.currency || 'BRL'
    };
  }

  private calculateBalances(
    dateRange: DateRange,
    options: Required<AccountBalancesOptions>
  ): AccountBalancesResult {
    // Buscar dados das stores
    const contas = this.getContas(options.lojaId);
    const lancamentos = this.getLancamentos(options.lojaId, options.includePending);
    const bloqueios = this.getBloqueios(options.lojaId);
    const conciliacoes = this.getConciliacoes(options.lojaId);

    const contasBalances: AccountBalance[] = contas.map(conta => {
      // Calcular opening balance (saldo anterior ao período)
      const openingEntries = lancamentos.filter(l => 
        l.contaId === conta.id && 
        this.getEffectiveDate(l, options.accrual) < dateRange.from
      );
      
      const opening = (conta.saldoAtual || 0) + this.calculateNetBalance(openingEntries);

      // Calcular movimentação do período
      const periodEntries = lancamentos.filter(l => 
        l.contaId === conta.id && 
        this.isInPeriod(this.getEffectiveDate(l, options.accrual), dateRange)
      );

      const credits = this.sumCredits(periodEntries);
      const debits = this.sumDebits(periodEntries);
      const closing = opening + credits - debits;

      // Bloqueios
      const contaBloqueios = bloqueios
        .filter(b => b.contaId === conta.id)
        .reduce((sum, b) => sum + b.valor, 0);

      const available = closing - contaBloqueios;

      // Conciliado até
      const conciliadoAte = this.getLastReconciledDate(conta.id, conciliacoes);

      // Pendentes
      const pendentes = {
        lanc: periodEntries.filter(l => !this.isEffetivated(l)).length,
        extrato: 0 // será calculado na conciliação
      };

      return {
        contaId: conta.id,
        contaCodigo: conta.codigo,
        contaNome: conta.nome,
        banco: conta.banco,
        agencia: conta.agencia,
        numero: conta.numero,
        moeda: 'BRL' as const,
        opening,
        credits,
        debits,
        closing,
        bloqueios: contaBloqueios,
        available,
        conciliadoAte,
        pendentes,
        lastUpdatedISO: new Date().toISOString()
      };
    });

    return {
      dataRef: dateRange.to,
      lojaId: options.lojaId,
      contas: contasBalances
    };
  }

  private generateCacheKey(
    dateRange: DateRange,
    options: Required<AccountBalancesOptions>
  ): BalancesCacheKey {
    return {
      lojaId: options.lojaId,
      dateRange,
      includePending: options.includePending,
      accrual: options.accrual,
      currency: options.currency,
      versionCounters: { ...this.versionCounters }
    };
  }

  private getEffectiveDate(lancamento: Lancamento, useAccrual: boolean): string {
    if (useAccrual && (lancamento as any).competencia) {
      return (lancamento as any).competencia;
    }
    return lancamento.data;
  }

  private isInPeriod(date: string, range: DateRange): boolean {
    return date >= range.from && date <= range.to;
  }

  private calculateNetBalance(entries: Lancamento[]): number {
    return entries.reduce((sum, entry) => {
      return sum + (entry.tipo === 'CREDITO' ? entry.valor : -entry.valor);
    }, 0);
  }

  private sumCredits(entries: Lancamento[]): number {
    return entries
      .filter(e => e.tipo === 'CREDITO')
      .reduce((sum, e) => sum + e.valor, 0);
  }

  private sumDebits(entries: Lancamento[]): number {
    return entries
      .filter(e => e.tipo === 'DEBITO')
      .reduce((sum, e) => sum + e.valor, 0);
  }

  private isEffetivated(lancamento: Lancamento): boolean {
    // Mock: considerar efetivado se não tiver status ou se status for EFETIVADA
    const status = (lancamento as any).status;
    return !status || status === 'EFETIVADA';
  }

  private getLastReconciledDate(contaId: string, conciliacoes: Conciliacao[]): string | undefined {
    const contaConcils = conciliacoes
      .filter(c => c.contaId === contaId && c.status === 'FECHADA')
      .sort((a, b) => b.periodo.fim.localeCompare(a.periodo.fim));
    
    return contaConcils[0]?.periodo.fim;
  }

  // Métodos para buscar dados das stores (a serem implementados conforme as stores)
  private getContas(lojaId: string): Conta[] {
    // Será implementado para buscar da store real
    if (typeof window !== 'undefined' && (window as any).financeiroStore) {
      return (window as any).financeiroStore.getState().contas.filter((c: Conta) => c.lojaId === lojaId);
    }
    return [];
  }

  private getLancamentos(lojaId: string, includePending: boolean): Lancamento[] {
    // Será implementado para buscar da store real
    if (typeof window !== 'undefined' && (window as any).financeiroStore) {
      const lancamentos = (window as any).financeiroStore.getState().lancamentos
        .filter((l: Lancamento) => {
          // Filtrar por loja através da conta
          const conta = this.getContas(lojaId).find(c => c.id === l.contaId);
          return conta && (includePending || this.isEffetivated(l));
        });
      return lancamentos;
    }
    return [];
  }

  private getBloqueios(lojaId: string): Bloqueio[] {
    // Mock: retornar array vazio por enquanto
    return [];
  }

  private getConciliacoes(lojaId: string): Conciliacao[] {
    // Será implementado para buscar da store real
    if (typeof window !== 'undefined' && (window as any).financeiroStore) {
      return (window as any).financeiroStore.getState().conciliacoes
        .filter((c: Conciliacao) => c.lojaId === lojaId);
    }
    return [];
  }

  private getLojaAtiva(): string {
    // Será implementado para buscar da store de multiunidade
    if (typeof window !== 'undefined' && (window as any).multiunidadeStore) {
      return (window as any).multiunidadeStore.getState().lojaAtiva?.id || 'loja-1';
    }
    return 'loja-1';
  }

  // Métodos de invalidação e observabilidade
  invalidateCache(reason: 'contas' | 'lancamentos' | 'bloqueios' | 'conciliacoes') {
    this.versionCounters[reason]++;
    this.cache.clear();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AccountBalances] Cache invalidated: ${reason} (v${this.versionCounters[reason]})`);
    }
  }

  private logDiagnostics(
    cacheKey: string,
    result: AccountBalancesResult,
    executionTime: number,
    cacheHit: boolean
  ) {
    if (process.env.NODE_ENV === 'development') {
      const diagnostics: BalancesDiagnostics = {
        cacheKey: cacheKey.substring(0, 100) + '...',
        executionTimeMs: executionTime,
        contas: result.contas.map(c => ({
          contaId: c.contaId,
          contaNome: c.contaNome,
          openingEntries: 0, // seria calculado no processo real
          periodEntries: 0,  // seria calculado no processo real
          totalCredits: c.credits,
          totalDebits: c.debits,
          bloqueios: c.bloqueios || 0
        })),
        totalProcessedEntries: result.contas.length,
        cacheHit
      };

      console.log('[AccountBalances] Diagnostics:', diagnostics);
      
      // Emitir evento de diagnósticos
      this.eventBus.emit('balances:diagnostics', diagnostics);
    }
  }

  // Método utilitário para exportar diagnósticos
  exportDiagnostics(): BalancesDiagnostics | null {
    // Retorna os últimos diagnósticos se em desenvolvimento
    return process.env.NODE_ENV === 'development' ? null : null;
  }
}

// Singleton instance
let selectorInstance: AccountBalancesSelector | null = null;

export function getAccountBalancesSelector(): AccountBalancesSelector {
  if (!selectorInstance) {
    const eventBus = {
      emit: (event: string, data: any) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(event, { detail: data }));
        }
      }
    };
    selectorInstance = new AccountBalancesSelector(eventBus);
  }
  return selectorInstance;
}

// Hook para React
export function useAccountBalances(dateRange: DateRange, options?: AccountBalancesOptions) {
  const selector = getAccountBalancesSelector();
  return selector.getAccountBalances(dateRange, options);
}