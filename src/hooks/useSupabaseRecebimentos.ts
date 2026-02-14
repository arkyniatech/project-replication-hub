import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseRecebimentos(lojaId?: string, tituloId?: string) {
  const queryClient = useQueryClient();

  const { data: recebimentos = [], isLoading } = useQuery({
    queryKey: ['recebimentos', lojaId, tituloId],
    queryFn: async () => {
      console.log('[useSupabaseRecebimentos] Buscando recebimentos com:', { lojaId, tituloId });
      
      let query = supabase
        .from('recebimentos')
        .select(`
          *,
          titulo:titulos(
            id, 
            numero, 
            valor, 
            cliente_id,
            cliente:clientes(id, nome, razao_social),
            contrato:contratos(id, numero)
          )
        `)
        .order('data', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      if (tituloId) {
        query = query.eq('titulo_id', tituloId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useSupabaseRecebimentos] Erro ao buscar recebimentos:', error);
        throw error;
      }

      console.log('[useSupabaseRecebimentos] Recebimentos encontrados:', data?.length || 0);
      return data || [];
    },
    enabled: true, // Sempre habilitado para usuários autenticados
  });

  const createRecebimento = useMutation({
    mutationFn: async (recebimento: any) => {
      const { data, error } = await (supabase as any)
        .from('recebimentos')
        .insert(recebimento)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Recebimento registrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar recebimento:', error);
      toast.error(error.message || 'Erro ao criar recebimento');
    },
  });

  const deleteRecebimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('recebimentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Recebimento excluído com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir recebimento:', error);
      toast.error(error.message || 'Erro ao excluir recebimento');
    },
  });

  return {
    recebimentos,
    isLoading,
    createRecebimento,
    deleteRecebimento,
  };
}
