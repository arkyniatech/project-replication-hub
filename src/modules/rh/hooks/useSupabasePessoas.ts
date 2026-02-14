import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toPessoaUI, toPessoaDB } from '../adapters/pessoaAdapter';
import type { Pessoa } from '../types';

export function useSupabasePessoas() {
  const queryClient = useQueryClient();

  // Buscar todas as pessoas
  const { data: pessoas = [], isLoading, error } = useQuery({
    queryKey: ['pessoas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pessoas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Converter de snake_case para camelCase
      return (data || []).map(toPessoaUI);
    }
  });

  // Criar pessoa
  const createPessoa = useMutation({
    mutationFn: async (pessoaData: Omit<Pessoa, 'id'>) => {
      const dbData = toPessoaDB(pessoaData);
      
      const { data, error } = await supabase
        .from('pessoas')
        .insert([dbData])
        .select()
        .single();
      
      if (error) throw error;
      return toPessoaUI(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pessoas'] });
    }
  });

  // Atualizar pessoa
  const updatePessoa = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pessoa> }) => {
      const dbUpdates = toPessoaDB(updates as any);
      
      const { data, error } = await supabase
        .from('pessoas')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return toPessoaUI(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pessoas'] });
    }
  });

  // Remover (soft delete - mudar para inativo)
  const removePessoa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pessoas')
        .update({ situacao: 'inativo' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pessoas'] });
    }
  });

  return {
    pessoas,
    isLoading,
    error,
    createPessoa,
    updatePessoa,
    removePessoa
  };
}
