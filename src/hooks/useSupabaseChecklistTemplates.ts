import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistTemplate {
  id: string;
  modelo_id: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  itens: Array<{
    id: string;
    titulo: string;
    critico: boolean;
  }>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useSupabaseChecklistTemplates(modeloId?: string) {
  const queryClient = useQueryClient();

  // Query para listar templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['checklist-templates', modeloId],
    queryFn: async () => {
      let query = supabase
        .from('checklist_templates')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (modeloId) {
        query = query.eq('modelo_id', modeloId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
      }

      return data as ChecklistTemplate[];
    },
  });

  // Query para buscar um template específico
  const useTemplate = (templateId: string) => {
    return useQuery({
      queryKey: ['checklist-template', templateId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) {
          console.error('Erro ao buscar template:', error);
          throw error;
        }

        return data as ChecklistTemplate;
      },
      enabled: !!templateId,
    });
  };

  // Mutation para criar template
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert(template)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar template:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar template:', error);
      toast.error(error.message || 'Erro ao criar template');
    },
  });

  // Mutation para atualizar template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar template:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar template:', error);
      toast.error(error.message || 'Erro ao atualizar template');
    },
  });

  // Mutation para inativar template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('checklist_templates')
        .update({ ativo: false })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar template:', error);
      toast.error(error.message || 'Erro ao inativar template');
    },
  });

  return {
    templates,
    isLoading,
    error,
    useTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
