import { useEffect } from 'react';
import { useSupabaseOrdensServico } from './useSupabaseOrdensServico';
import { useToast } from './use-toast';

/**
 * Hook para sincronizar eventos de contratos com o módulo de Manutenção.
 * 
 * Escuta o evento 'contrato:devolucaoConfirmada' e cria automaticamente
 * uma Ordem de Serviço (OS) na área AMARELA (pós-locação) para cada
 * equipamento devolvido.
 * 
 * Isso garante que os equipamentos apareçam no PainelMecanico e possam
 * ser processados pela equipe de manutenção.
 */
export function useContratoManutencaoSync() {
  const { createOS } = useSupabaseOrdensServico();
  const { toast } = useToast();

  useEffect(() => {
    const handleDevolucaoConfirmada = async (event: CustomEvent) => {
      const { contratoId, itens, dataDevolucao, horaDevolucao } = event.detail;

      console.log('[useContratoManutencaoSync] Devolução confirmada:', {
        contratoId,
        totalItens: itens?.length
      });

      if (!itens || itens.length === 0) {
        console.warn('[useContratoManutencaoSync] Nenhum item para processar');
        return;
      }

      try {
        // Criar OS para cada equipamento devolvido
        for (const item of itens) {
          if (!item.equipamentoId) {
            console.warn('[useContratoManutencaoSync] Item sem equipamentoId:', item);
            continue;
          }

          console.log('[useContratoManutencaoSync] Criando OS para equipamento:', item.equipamentoId);

          await createOS.mutateAsync({
            equipamento_id: item.equipamentoId,
            tipo: 'PREVENTIVA',
            origem: 'POS_LOCACAO',
            prioridade: 'MEDIA',
            contrato_id: contratoId
          });
        }

        console.log('[useContratoManutencaoSync] Todas as OS criadas com sucesso');

      } catch (error) {
        console.error('[useContratoManutencaoSync] Erro ao criar OS:', error);
        
        toast({
          title: "Aviso - Manutenção",
          description: "Houve um problema ao criar ordens de serviço para os equipamentos. Entre em contato com o suporte.",
          variant: "destructive",
          duration: 5000
        });
      }
    };

    // Adicionar listener para o evento customizado
    window.addEventListener('contrato:devolucaoConfirmada', handleDevolucaoConfirmada as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('contrato:devolucaoConfirmada', handleDevolucaoConfirmada as EventListener);
    };
  }, [createOS, toast]);
}
