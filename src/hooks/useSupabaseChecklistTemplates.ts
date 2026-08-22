import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChecklistTemplateRow, ChecklistTemplateItem, TipoChecklist } from '@/lib/checklist-os-utils';

type ChecklistTemplateInsert = {
  /** NULL = genérico. O banco permite nulo (migration 20251013215523:92). */
  modelo_id?: string | null;
  tipo: TipoChecklist;
  itens: ChecklistTemplateItem[];
  ativo?: boolean;
};

type ChecklistTemplateUpdate = Partial<ChecklistTemplateInsert>;

/**
 * Tabela `checklist_templates` — órfã desde que foi criada: até o Relay 75
 * nenhum código a lia. As policies são "Gestor pode gerenciar" (ALL) e
 * "Templates visíveis para autenticados" (SELECT com ativo = true), então a
 * listagem só enxerga ativos por construção do RLS.
 */
export function useSupabaseChecklistTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('checklist_templates')
        .select('*, modelo:modelos_equipamentos(id, nome_comercial)')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar templates de checklist:', error);
        throw error;
      }

      return (data ?? []) as (ChecklistTemplateRow & { modelo?: any })[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: ChecklistTemplateInsert) => {
      const { data, error } = await (supabase as any)
        .from('checklist_templates')
        .insert({
          modelo_id: template.modelo_id ?? null,
          tipo: template.tipo,
          itens: template.itens,
          ativo: template.ativo ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar template:', error);
        throw error;
      }

      return data as ChecklistTemplateRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template de checklist criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar template:', error);
      toast.error(error.message || 'Erro ao criar template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: ChecklistTemplateUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('checklist_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar template:', error);
        throw error;
      }

      return data as ChecklistTemplateRow;
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

  /** Inativa em vez de apagar: OS antigas guardam o checklist executado, mas
   *  a rastreabilidade de qual template o gerou some com o DELETE. */
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await (supabase as any)
        .from('checklist_templates')
        .update({ ativo: false })
        .eq('id', templateId);

      if (error) {
        console.error('Erro ao inativar template:', error);
        throw error;
      }
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
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
