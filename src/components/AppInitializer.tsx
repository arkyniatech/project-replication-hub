import { useEffect } from 'react';
import { useContratoLogisticaSync } from '@/hooks/useContratoLogisticaSync';
import { useContratoManutencaoSync } from '@/hooks/useContratoManutencaoSync';
import { initializeMockData } from '@/lib/mock-data';
import { seedVeiculosData } from '@/utils/veiculos-seed';
import { seedContratosV2 } from '@/lib/contratos-v2-utils';

/**
 * Componente para inicializar hooks globais e dados do app.
 * Deve ser renderizado DENTRO do QueryClientProvider.
 */
export function AppInitializer() {
  // Hooks globais de sincronização (precisam estar dentro do QueryClientProvider)
  useContratoLogisticaSync();
  useContratoManutencaoSync();

  // Inicializar dados mock
  useEffect(() => {
    // Check for ?role= query param and set dev profile
    // This needs to happen immediately to avoid UI flicker if it affects rendering
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam) {
      localStorage.setItem('rh-dev-profile', roleParam);
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState(null, '', url.pathname + url.hash);
    }

    // Defer heavy initialization to unblock main thread
    const initData = async () => {
      // Small delay to allow UI to render first
      await new Promise(resolve => setTimeout(resolve, 100));

      const hasClientData = localStorage.getItem('erp-clientes');
      const hasVeiculosData = localStorage.getItem('veiculos-storage');

      // Group 1: Critical seeds (if missing) - Run in parallel
      const seedPromises = [];

      if (!sessionStorage.getItem('rh-initialized')) {
        seedPromises.push(
          Promise.all([
            import('@/modules/rh/utils/seedRhContent'),
            import('@/modules/rh/utils/seedRhContentMissing'),
            import('@/modules/rh/utils/seedRhMissing8')
          ]).then(([{ seedRhContent }, { seedRhContentMissing }, { seedRhMissing8 }]) => {
            console.log('🔄 Inicializando dados RH...');
            seedRhContent();
            seedRhContentMissing();
            seedRhMissing8();
            sessionStorage.setItem('rh-initialized', 'true');
          })
        );
      }

      if (!hasClientData) {
        seedPromises.push(Promise.resolve().then(() => {
          console.log('🔄 Inicializando dados mock (clientes, contratos)...');
          initializeMockData();
          seedContratosV2();
        }));
      }

      if (!hasVeiculosData) {
        seedPromises.push(Promise.resolve().then(() => {
          console.log('🔄 Inicializando dados de veículos...');
          seedVeiculosData();
        }));
      }

      // Execute seeds
      if (seedPromises.length > 0) {
        await Promise.all(seedPromises);
      }

      // Group 2: Background Integrations & Fixes - Defer further
      setTimeout(async () => {
        try {
          // Parallelize independent imports
          const [
            { initializeContractIntegrations },
            { sincronizarOSsPendentes },
            { fixEquipamentosSemOS },
            { seedSupabaseEquipamentos, limparEquipamentosSupabase }
          ] = await Promise.all([
            import('@/utils/contract-integrations'),
            import('@/lib/contratos-v2-utils'),
            import('@/utils/fixContratoManutencao'),
            import('@/utils/supabase-equipamentos-seed')
          ]);

          // Run logic
          initializeContractIntegrations();
          
          // These can run in background without awaiting
          sincronizarOSsPendentes();
          fixEquipamentosSemOS();

          // Global helpers
          (window as any).seedEquipamentos = seedSupabaseEquipamentos;
          (window as any).limparEquipamentos = limparEquipamentosSupabase;
          
          console.log('✅ Background initialization complete');
        } catch (error) {
          console.error('Error in background initialization:', error);
        }
      }, 1000); // 1-second delay for background tasks
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => initData());
    } else {
      setTimeout(initData, 0);
    }
  }, []);

  return null; // Este componente não renderiza nada
}
