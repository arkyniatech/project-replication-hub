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
