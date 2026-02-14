import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseTemplates(lojaId?: string, tipo?: string) {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates-contratos', lojaId, tipo],
    queryFn: async () => {
      let query = (supabase as any)
        .from('templates_contratos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (lojaId) {
        query = query.or(`loja_id.eq.${lojaId},loja_id.is.null`);
      }

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
      }

      return data || [];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await (supabase as any)
        .from('templates_contratos')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-contratos'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar template:', error);
      toast.error(error.message || 'Erro ao criar template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any)
        .from('templates_contratos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-contratos'] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar template:', error);
      toast.error(error.message || 'Erro ao atualizar template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('templates_contratos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-contratos'] });
      toast.success('Template excluído com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir template:', error);
      toast.error(error.message || 'Erro ao excluir template');
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
