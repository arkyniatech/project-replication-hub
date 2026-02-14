import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseObras(lojaId?: string, clienteId?: string) {
  const queryClient = useQueryClient();

  const { data: obras = [], isLoading } = useQuery({
    queryKey: ['obras', lojaId, clienteId],
    queryFn: async () => {
      let query = supabase
        .from('obras')
        .select('*, cliente:clientes(*)')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar obras:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!lojaId || !!clienteId,
  });

  const createObra = useMutation({
    mutationFn: async (obra: any) => {
      const { data, error } = await supabase
        .from('obras')
        .insert(obra)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast.success('Obra criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar obra:', error);
      toast.error(error.message || 'Erro ao criar obra');
    },
  });

  const updateObra = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('obras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast.success('Obra atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar obra:', error);
      toast.error(error.message || 'Erro ao atualizar obra');
    },
  });

  const deleteObra = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast.success('Obra excluída com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir obra:', error);
      toast.error(error.message || 'Erro ao excluir obra');
    },
  });

  const setAsPadrao = useMutation({
    mutationFn: async ({ obraId, clienteId }: { obraId: string; clienteId: string }) => {
      // Primeiro, remove is_padrao de todas as obras do cliente
      const { error: resetError } = await supabase
        .from('obras')
        .update({ is_padrao: false })
        .eq('cliente_id', clienteId);

      if (resetError) throw resetError;

      // Depois, define a obra selecionada como padrão
      const { data, error } = await supabase
        .from('obras')
        .update({ is_padrao: true })
        .eq('id', obraId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      toast.success('Obra definida como padrão!');
    },
    onError: (error: any) => {
      console.error('Erro ao definir obra como padrão:', error);
      toast.error(error.message || 'Erro ao definir obra como padrão');
    },
  });

  return {
    obras,
    isLoading,
    createObra,
    updateObra,
    deleteObra,
    setAsPadrao,
  };
}
