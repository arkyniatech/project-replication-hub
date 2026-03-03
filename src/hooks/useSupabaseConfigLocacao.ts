// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ConfigLocacao = Database['public']['Tables']['config_locacao']['Row'];
type ConfigLocacaoInsert = Database['public']['Tables']['config_locacao']['Insert'];
type ConfigLocacaoUpdate = Database['public']['Tables']['config_locacao']['Update'];

export function useSupabaseConfigLocacao(lojaId?: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-locacao', lojaId],
    queryFn: async () => {
      if (!lojaId) return null;

      const { data, error } = await supabase
        .from('config_locacao')
        .select('*')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar config locação:', error);
        throw error;
      }

      return data as ConfigLocacao | null;
    },
    enabled: !!lojaId,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: ConfigLocacaoUpdate) => {
      if (!lojaId) throw new Error('Loja não selecionada');

      const { data: existing } = await supabase
        .from('config_locacao')
        .select('id')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('config_locacao')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertData: ConfigLocacaoInsert = { 
          ...updates,
          loja_id: lojaId
        };
        
        const { data, error } = await supabase
          .from('config_locacao')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-locacao'] });
      toast.success('Parametrizações de locação salvas!');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar config locação:', error);
      toast.error(error.message || 'Erro ao salvar');
    },
  });

  return {
    config,
    isLoading,
    updateConfig,
  };
}
