import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Grupo = Database['public']['Tables']['grupos_equipamentos']['Row'];
type GrupoInsert = Database['public']['Tables']['grupos_equipamentos']['Insert'];
type GrupoUpdate = Database['public']['Tables']['grupos_equipamentos']['Update'];

export function useSupabaseGrupos() {
  const queryClient = useQueryClient();

  // Query para listar grupos
  const { data: grupos = [], isLoading, error } = useQuery({
    queryKey: ['grupos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grupos_equipamentos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar grupos:', error);
        throw error;
      }

      return data as Grupo[];
    },
  });

  // Query para buscar um grupo específico
  const useGrupo = (grupoId: string) => {
    return useQuery({
      queryKey: ['grupo', grupoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('grupos_equipamentos')
          .select('*')
          .eq('id', grupoId)
          .single();

        if (error) {
          console.error('Erro ao buscar grupo:', error);
          throw error;
        }

        return data as Grupo;
      },
      enabled: !!grupoId,
    });
  };

  // Mutation para criar grupo
  const createGrupo = useMutation({
    mutationFn: async (grupo: GrupoInsert) => {
      const { data, error } = await supabase
        .from('grupos_equipamentos')
        .insert(grupo)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar grupo:', error);
        throw error;
      }

      return data as Grupo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar grupo:', error);
      toast.error(error.message || 'Erro ao criar grupo');
    },
  });

  // Mutation para atualizar grupo
  const updateGrupo = useMutation({
    mutationFn: async ({ id, ...updates }: GrupoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('grupos_equipamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar grupo:', error);
        throw error;
      }

      return data as Grupo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar grupo:', error);
      toast.error(error.message || 'Erro ao atualizar grupo');
    },
  });

  // Mutation para deletar (inativar) grupo
  const deleteGrupo = useMutation({
    mutationFn: async (grupoId: string) => {
      const { error } = await supabase
        .from('grupos_equipamentos')
        .update({ ativo: false })
        .eq('id', grupoId);

      if (error) {
        console.error('Erro ao inativar grupo:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos'] });
      toast.success('Grupo inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar grupo:', error);
      toast.error(error.message || 'Erro ao inativar grupo');
    },
  });

  return {
    grupos,
    isLoading,
    error,
    useGrupo,
    createGrupo,
    updateGrupo,
    deleteGrupo,
  };
}
