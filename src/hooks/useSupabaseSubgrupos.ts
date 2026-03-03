// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos temporários até Supabase sincronizar
type Subgrupo = {
  id: string;
  grupo_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
};

type SubgrupoInsert = Omit<Subgrupo, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type SubgrupoUpdate = Partial<SubgrupoInsert>;

export function useSupabaseSubgrupos(grupoId?: string) {
  const queryClient = useQueryClient();

  // Query para listar subgrupos
  const { data: subgrupos = [], isLoading, error } = useQuery({
    queryKey: ['subgrupos', grupoId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('subgrupos_equipamentos')
        .select('*, grupos_equipamentos(*)')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (grupoId) {
        query = query.eq('grupo_id', grupoId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar subgrupos:', error);
        throw error;
      }

      return data as (Subgrupo & { grupos_equipamentos: any })[];
    },
  });

  // Query para buscar um subgrupo específico
  const useSubgrupo = (subgrupoId: string) => {
    return useQuery({
      queryKey: ['subgrupo', subgrupoId],
      queryFn: async () => {
        const { data, error } = await (supabase as any)
          .from('subgrupos_equipamentos')
          .select('*, grupos_equipamentos(*)')
          .eq('id', subgrupoId)
          .single();

        if (error) {
          console.error('Erro ao buscar subgrupo:', error);
          throw error;
        }

        return data as Subgrupo & { grupos_equipamentos: any };
      },
      enabled: !!subgrupoId,
    });
  };

  // Mutation para criar subgrupo
  const createSubgrupo = useMutation({
    mutationFn: async (subgrupo: SubgrupoInsert) => {
      const { data, error } = await (supabase as any)
        .from('subgrupos_equipamentos')
        .insert(subgrupo)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar subgrupo:', error);
        throw error;
      }

      return data as Subgrupo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subgrupos'] });
      toast.success('Subgrupo criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar subgrupo:', error);
      toast.error(error.message || 'Erro ao criar subgrupo');
    },
  });

  // Mutation para atualizar subgrupo
  const updateSubgrupo = useMutation({
    mutationFn: async ({ id, ...updates }: SubgrupoUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('subgrupos_equipamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar subgrupo:', error);
        throw error;
      }

      return data as Subgrupo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subgrupos'] });
      toast.success('Subgrupo atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar subgrupo:', error);
      toast.error(error.message || 'Erro ao atualizar subgrupo');
    },
  });

  // Mutation para deletar (inativar) subgrupo
  const deleteSubgrupo = useMutation({
    mutationFn: async (subgrupoId: string) => {
      const { error } = await (supabase as any)
        .from('subgrupos_equipamentos')
        .update({ ativo: false })
        .eq('id', subgrupoId);

      if (error) {
        console.error('Erro ao inativar subgrupo:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subgrupos'] });
      toast.success('Subgrupo inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar subgrupo:', error);
      toast.error(error.message || 'Erro ao inativar subgrupo');
    },
  });

  return {
    subgrupos,
    isLoading,
    error,
    useSubgrupo,
    createSubgrupo,
    updateSubgrupo,
    deleteSubgrupo,
  };
}
