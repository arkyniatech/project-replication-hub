import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseUserLojas() {
  const queryClient = useQueryClient();

  const addLojas = useMutation({
    mutationFn: async ({ userId, lojaIds }: { userId: string; lojaIds: string[] }) => {
      const lojasData = lojaIds.map(lojaId => ({
        user_id: userId,
        loja_id: lojaId
      }));

      const { data, error } = await supabase
        .from('user_lojas_permitidas')
        .insert(lojasData)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const removeLoja = useMutation({
    mutationFn: async ({ userId, lojaId }: { userId: string; lojaId: string }) => {
      const { error } = await supabase
        .from('user_lojas_permitidas')
        .delete()
        .eq('user_id', userId)
        .eq('loja_id', lojaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const updateLojas = useMutation({
    mutationFn: async ({ userId, lojaIds }: { userId: string; lojaIds: string[] }) => {
      // Remove todas as lojas antigas E verifica erro
      const { error: deleteError } = await supabase
        .from('user_lojas_permitidas')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // Adiciona as novas lojas
      if (lojaIds.length > 0) {
        const lojasData = lojaIds.map(lojaId => ({
          user_id: userId,
          loja_id: lojaId
        }));

        const { data, error } = await supabase
          .from('user_lojas_permitidas')
          .insert(lojasData)
          .select();
        
        if (error) throw error;
        return data;
      }
      return [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  return {
    addLojas,
    removeLoja,
    updateLojas
  };
}
