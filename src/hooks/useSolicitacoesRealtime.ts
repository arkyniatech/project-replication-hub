import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para escutar mudanças em tempo real nas solicitações de manutenção
 */
export function useSolicitacoesRealtime(lojaId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!lojaId) return;

    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      // Canal para solicitacao_manutencao
      channel = supabase
        .channel(`solicitacoes-${lojaId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitacao_manutencao',
            filter: `loja_id=eq.${lojaId}`,
          },
          (payload) => {
            console.log('Solicitação atualizada:', payload);

            // Invalidar queries para forçar re-fetch
            queryClient.invalidateQueries({ queryKey: ['solicitacoes-manutencao'] });

            // Se for uma nova solicitação, mostrar toast
            if (payload.eventType === 'INSERT') {
              const newSol = payload.new as any;
              toast.info(`Nova solicitação: ${newSol.cliente_nome}`, {
                description: `Prioridade: ${newSol.prioridade}`,
              });
            }

            // Se for mudança de status crítica, notificar
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any;
              if (updated.status === 'CRITICA' || updated.prioridade === 'CRITICA') {
                toast.warning(`Solicitação CRÍTICA: ${updated.cliente_nome}`, {
                  description: `Status: ${updated.status}`,
                  duration: 10000,
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitacao_timeline',
          },
          (payload) => {
            console.log('Timeline atualizada:', payload);

            // Invalidar solicitação específica
            const timelineRecord = payload.new as any;
            if (timelineRecord.solicitacao_id) {
              queryClient.invalidateQueries({
                queryKey: ['solicitacao-manutencao', timelineRecord.solicitacao_id],
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'manut_event_bus',
            filter: `loja_id=eq.${lojaId}`,
          },
          (payload) => {
            console.log('Evento de manutenção:', payload);

            const event = payload.new as any;

            // Processar eventos conforme tipo
            if (event.tipo === 'LAUDO_REGISTRADO') {
              const laudo = event.payload;
              if (laudo.tipo === 'MAU_USO') {
                toast.error('Laudo de MAU USO registrado', {
                  description: 'Tarefa enviada ao Comercial',
                  duration: 10000,
                });
              }
            }

            if (event.tipo === 'NOTIFICAR_OFICINA') {
              toast.info('OS criada e enviada para Oficina', {
                description: `OS: ${event.payload?.os_id}`,
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [lojaId, queryClient]);
}
