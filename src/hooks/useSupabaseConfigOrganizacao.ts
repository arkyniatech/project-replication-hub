// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ConfigOrganizacao = Database['public']['Tables']['config_organizacao']['Row'];
type ConfigOrganizacaoInsert = Database['public']['Tables']['config_organizacao']['Insert'];
type ConfigOrganizacaoUpdate = Database['public']['Tables']['config_organizacao']['Update'];

export function useSupabaseConfigOrganizacao(lojaId?: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['config-organizacao', lojaId],
    queryFn: async () => {
      if (!lojaId) return null;

      const { data, error } = await supabase
        .from('config_organizacao')
        .select('*')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar config organização:', error);
        throw error;
      }

      return data as ConfigOrganizacao | null;
    },
    enabled: !!lojaId,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: ConfigOrganizacaoUpdate) => {
      if (!lojaId) throw new Error('Loja não selecionada');

      const { data: existing } = await supabase
        .from('config_organizacao')
        .select('id')
        .eq('loja_id', lojaId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('config_organizacao')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertData: ConfigOrganizacaoInsert = { 
          ...updates, 
          loja_id: lojaId,
          razao_social: updates.razao_social || '',
          cnpj: updates.cnpj || ''
        };
        
        const { data, error } = await supabase
          .from('config_organizacao')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-organizacao'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao salvar config:', error);
      toast.error(error.message || 'Erro ao salvar configuração');
    },
  });

  return {
    config,
    isLoading,
    updateConfig,
  };
}
