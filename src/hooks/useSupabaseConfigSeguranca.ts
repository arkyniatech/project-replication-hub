// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ConfigSeguranca = Database['public']['Tables']['config_seguranca']['Row'];
type ConfigSegurancaInsert = Database['public']['Tables']['config_seguranca']['Insert'];
type ConfigSegurancaUpdate = Database['public']['Tables']['config_seguranca']['Update'];

export function useSupabaseConfigSeguranca(lojaId?: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-seguranca', lojaId],
    queryFn: async () => {
      if (!lojaId) return null;

      const { data, error } = await supabase
        .from('config_seguranca')
        .select('*')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar config segurança:', error);
        throw error;
      }

      return data as ConfigSeguranca | null;
    },
    enabled: !!lojaId,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: ConfigSegurancaUpdate) => {
      if (!lojaId) throw new Error('Loja não selecionada');

      const { data: existing } = await supabase
        .from('config_seguranca')
        .select('id')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('config_seguranca')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertData: ConfigSegurancaInsert = { 
          ...updates,
          loja_id: lojaId
        };
        
        const { data, error } = await supabase
          .from('config_seguranca')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-seguranca'] });
      toast.success('Configuração de segurança salva!');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar config segurança:', error);
      toast.error(error.message || 'Erro ao salvar');
    },
  });

  return {
    config,
    isLoading,
    updateConfig,
  };
}
