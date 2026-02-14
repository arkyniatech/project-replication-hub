import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PessoaMovimento {
  id: string;
  pessoa_id: string;
  tipo: string;
  data: string;
  descricao: string;
  observacao?: string;
  usuario_id?: string;
  created_at: string;
  updated_at: string;
}

export function useSupabasePessoaMovimentos(pessoaId?: string) {
  const queryClient = useQueryClient();

  // Buscar movimentos de uma pessoa
  const { data: movimentos = [], isLoading, error } = useQuery({
    queryKey: ['pessoa-movimentos', pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      
      const { data, error } = await supabase
        .from('pessoa_movimentos')
        .select('*')
        .eq('pessoa_id', pessoaId)
        .order('data', { ascending: false });
      
      if (error) throw error;
      return data as PessoaMovimento[];
    },
    enabled: !!pessoaId
  });

  // Criar movimento
  const createMovimento = useMutation({
    mutationFn: async (movimento: Omit<PessoaMovimento, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('pessoa_movimentos')
        .insert([movimento])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pessoa-movimentos', pessoaId] });
    }
  });

  // Atualizar movimento
  const updateMovimento = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PessoaMovimento> }) => {
      const { data, error } = await supabase
        .from('pessoa_movimentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pessoa-movimentos', pessoaId] });
    }
  });

  // Remover movimento
  const removeMovimento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pessoa_movimentos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pessoa-movimentos', pessoaId] });
    }
  });

  return {
    movimentos,
    isLoading,
    error,
    createMovimento,
    updateMovimento,
    removeMovimento
  };
}
