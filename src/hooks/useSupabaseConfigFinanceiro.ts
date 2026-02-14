import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ConfigFinanceiro = Database['public']['Tables']['config_financeiro']['Row'];
type ConfigFinanceiroInsert = Database['public']['Tables']['config_financeiro']['Insert'];
type ConfigFinanceiroUpdate = Database['public']['Tables']['config_financeiro']['Update'];

export function useSupabaseConfigFinanceiro(lojaId?: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-financeiro', lojaId],
    queryFn: async () => {
      if (!lojaId) return null;

      const { data, error } = await supabase
        .from('config_financeiro')
        .select('*')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar config financeiro:', error);
        throw error;
      }

      return data as ConfigFinanceiro | null;
    },
    enabled: !!lojaId,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: ConfigFinanceiroUpdate) => {
      if (!lojaId) throw new Error('Loja não selecionada');

      const { data: existing } = await supabase
        .from('config_financeiro')
        .select('id')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('config_financeiro')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertData: ConfigFinanceiroInsert = { 
          ...updates, 
          loja_id: lojaId
        };
        
        const { data, error } = await supabase
          .from('config_financeiro')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-financeiro'] });
      toast.success('Configuração financeira salva!');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar config financeiro:', error);
      toast.error(error.message || 'Erro ao salvar');
    },
  });

  return {
    config,
    isLoading,
    updateConfig,
  };
}
