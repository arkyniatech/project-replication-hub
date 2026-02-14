import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ConfigNumeracao = Database['public']['Tables']['config_numeracao']['Row'];
type ConfigNumeracaoInsert = Database['public']['Tables']['config_numeracao']['Insert'];
type ConfigNumeracaoUpdate = Database['public']['Tables']['config_numeracao']['Update'];

export function useSupabaseConfigNumeracao(lojaId?: string) {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['config-numeracao', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];

      const { data, error } = await supabase
        .from('config_numeracao')
        .select('*')
        .eq('loja_id', lojaId)
        .order('tipo');

      if (error) {
        console.error('Erro ao buscar config numeração:', error);
        throw error;
      }

      return data as ConfigNumeracao[];
    },
    enabled: !!lojaId,
  });

  const updateConfig = useMutation({
    mutationFn: async ({
      tipo,
      updates,
    }: {
      tipo: string;
      updates: ConfigNumeracaoUpdate;
    }) => {
      if (!lojaId) throw new Error('Loja não selecionada');

      const { data: existing } = await supabase
        .from('config_numeracao')
        .select('id')
        .eq('loja_id', lojaId)
        .eq('tipo', tipo)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('config_numeracao')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertData: ConfigNumeracaoInsert = { 
          ...updates,
          loja_id: lojaId,
          tipo,
          prefixo: updates.prefixo || '',
          template: updates.template || ''
        };
        
        const { data, error } = await supabase
          .from('config_numeracao')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-numeracao'] });
      toast.success('Numeração atualizada!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar numeração:', error);
      toast.error(error.message || 'Erro ao atualizar');
    },
  });

  return {
    configs,
    isLoading,
    updateConfig,
  };
}
