import { useContratoLogisticaSync } from '@/hooks/useContratoLogisticaSync';
import { useContratoManutencaoSync } from '@/hooks/useContratoManutencaoSync';
import { useEffect } from 'react';

/**
 * Componente para inicializar hooks globais do app.
 * Deve ser renderizado DENTRO do QueryClientProvider.
 */
export function AppInitializer() {
  // Hooks globais de sincronização (precisam estar dentro do QueryClientProvider)
  useContratoLogisticaSync();
  useContratoManutencaoSync();

  useEffect(() => {
    // Check for ?role= query param and set dev profile
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam) {
      localStorage.setItem('rh-dev-profile', roleParam);
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState(null, '', url.pathname + url.hash);
    }

    // Deferred: initialize contract integrations (no seeds)
    setTimeout(async () => {
      try {
        const { initializeContractIntegrations } = await import('@/utils/contract-integrations');
        initializeContractIntegrations();
        console.log('✅ Background initialization complete');
      } catch (error) {
        console.error('Error in background initialization:', error);
      }
    }, 1000);
  }, []);

  return null;
}
