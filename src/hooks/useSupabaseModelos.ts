import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Modelo = Database['public']['Tables']['modelos_equipamentos']['Row'];
type ModeloInsert = Database['public']['Tables']['modelos_equipamentos']['Insert'];
type ModeloUpdate = Database['public']['Tables']['modelos_equipamentos']['Update'];
type HistoricoPreco = Database['public']['Tables']['historico_precos']['Row'];
type HistoricoPrecoInsert = Database['public']['Tables']['historico_precos']['Insert'];

export function useSupabaseModelos(grupoId?: string) {
  const queryClient = useQueryClient();

  // Query para listar modelos
  const { data: modelos = [], isLoading, error } = useQuery({
    queryKey: ['modelos', grupoId],
    queryFn: async () => {
      let query = supabase
        .from('modelos_equipamentos')
        .select('*, grupos_equipamentos(*)')
        .eq('ativo', true)
        .order('nome_comercial', { ascending: true });

      if (grupoId) {
        query = query.eq('grupo_id', grupoId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar modelos:', error);
        throw error;
      }

      return data as (Modelo & { grupos_equipamentos: any })[];
    },
  });

  // Query para buscar um modelo específico
  const useModelo = (modeloId: string) => {
    return useQuery({
      queryKey: ['modelo', modeloId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('modelos_equipamentos')
          .select('*, grupos_equipamentos(*)')
          .eq('id', modeloId)
          .single();

        if (error) {
          console.error('Erro ao buscar modelo:', error);
          throw error;
        }

        return data as Modelo & { grupos_equipamentos: any };
      },
      enabled: !!modeloId,
    });
  };

  // Query para histórico de preços
  const useHistoricoPrecos = (modeloId: string) => {
    return useQuery({
      queryKey: ['historico-precos', modeloId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('historico_precos')
          .select('*')
          .eq('modelo_id', modeloId)
          .order('data_iso', { ascending: false });

        if (error) {
          console.error('Erro ao buscar histórico:', error);
          throw error;
        }

        return data as HistoricoPreco[];
      },
      enabled: !!modeloId,
    });
  };

  // Mutation para criar modelo
  const createModelo = useMutation({
    mutationFn: async (modelo: ModeloInsert) => {
      const { data, error } = await supabase
        .from('modelos_equipamentos')
        .insert(modelo)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar modelo:', error);
        throw error;
      }

      return data as Modelo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos'] });
      toast.success('Modelo criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar modelo:', error);
      toast.error(error.message || 'Erro ao criar modelo');
    },
  });

  // Mutation para atualizar modelo
  const updateModelo = useMutation({
    mutationFn: async ({ id, ...updates }: ModeloUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('modelos_equipamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar modelo:', error);
        throw error;
      }

      return data as Modelo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos'] });
      toast.success('Modelo atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar modelo:', error);
      toast.error(error.message || 'Erro ao atualizar modelo');
    },
  });

  // Mutation para deletar (inativar) modelo
  const deleteModelo = useMutation({
    mutationFn: async (modeloId: string) => {
      const { error } = await supabase
        .from('modelos_equipamentos')
        .update({ ativo: false })
        .eq('id', modeloId);

      if (error) {
        console.error('Erro ao inativar modelo:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos'] });
      toast.success('Modelo inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar modelo:', error);
      toast.error(error.message || 'Erro ao inativar modelo');
    },
  });

  // Mutation para adicionar histórico de preços
  const addHistoricoPreco = useMutation({
    mutationFn: async (historico: HistoricoPrecoInsert) => {
      const { data, error } = await supabase
        .from('historico_precos')
        .insert(historico)
        .select()
        .single();

      if (error) {
        console.error('Erro ao registrar histórico:', error);
        throw error;
      }

      return data as HistoricoPreco;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico-precos'] });
    },
    onError: (error: any) => {
      console.error('Erro ao registrar histórico:', error);
    },
  });

  return {
    modelos,
    isLoading,
    error,
    useModelo,
    useHistoricoPrecos,
    createModelo,
    updateModelo,
    deleteModelo,
    addHistoricoPreco,
  };
}
