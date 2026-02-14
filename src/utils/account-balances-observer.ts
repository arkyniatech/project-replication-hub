// Observer para invalidar cache do selector quando dados mudarem
import { getAccountBalancesSelector } from '@/services/account-balances/AccountBalancesSelector';

// Setup dos listeners para invalidação de cache
export function setupAccountBalancesObserver() {
  const selector = getAccountBalancesSelector();

  // Listeners para eventos de mudança nos dados
  if (typeof window !== 'undefined') {
    // Invalidar cache quando transferências mudarem
    window.addEventListener('transferencia-created', () => {
      selector.invalidateCache('lancamentos');
    });

    window.addEventListener('transferencia-efetivada', () => {
      selector.invalidateCache('lancamentos');
    });

    window.addEventListener('transferencia-estornada', () => {
      selector.invalidateCache('lancamentos');
    });

    // Invalidar cache quando contas mudarem
    window.addEventListener('conta-created', () => {
      selector.invalidateCache('contas');
    });

    window.addEventListener('conta-updated', () => {
      selector.invalidateCache('contas');
    });

    // Invalidar cache quando conciliações mudarem
    window.addEventListener('conciliacao-fechada', () => {
      selector.invalidateCache('conciliacoes');
    });

    window.addEventListener('conciliacao-reaberta', () => {
      selector.invalidateCache('conciliacoes');
    });

    // Listener para diagnósticos (dev only)
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('balances:diagnostics', (event: any) => {
        console.group('🔍 Account Balances Diagnostics');
        console.log('Cache Key:', event.detail.cacheKey);
        console.log('Execution Time:', `${event.detail.executionTimeMs}ms`);
        console.log('Cache Hit:', event.detail.cacheHit ? '✅' : '❌');
        console.log('Total Processed Entries:', event.detail.totalProcessedEntries);
        console.table(event.detail.contas);
        console.groupEnd();
      });

      window.addEventListener('balances:updated', (event: any) => {
        console.log('💰 Balances Updated:', event.detail);
      });
    }
  }
}

// Hook para integrar com stores
export function useAccountBalancesIntegration() {
  // Este hook pode ser usado pelos stores para disparar invalidações
  const invalidateBalances = (reason: 'contas' | 'lancamentos' | 'bloqueios' | 'conciliacoes') => {
    const selector = getAccountBalancesSelector();
    selector.invalidateCache(reason);
  };

  return { invalidateBalances };
}