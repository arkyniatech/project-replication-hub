import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook simplificado para sincronização Contratos ↔ Logística
 * 
 * A criação de tarefas agora é feita pelo trigger no banco de dados
 * (trg_criar_tarefa_logistica_ao_ativar). Este hook apenas escuta
 * mudanças via Realtime e invalida os caches relevantes.
 */
export function useContratoLogisticaSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('contratos-logistica-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'logistica_tarefas',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['logistica-tarefas'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
