import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos temporários até Supabase sincronizar
type Fornecedor = {
  id: string;
  codigo: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  cpf?: string;
  contato?: any;
  endereco?: any;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
};

type FornecedorInsert = Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type FornecedorUpdate = Partial<FornecedorInsert>;

export function useSupabaseFornecedores() {
  const queryClient = useQueryClient();

  // Query para listar fornecedores
  const { data: fornecedores = [], isLoading, error } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fornecedores')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fornecedores:', error);
        throw error;
      }

      return data as Fornecedor[];
    },
  });

  // Query para buscar um fornecedor específico
  const useFornecedor = (fornecedorId: string) => {
    return useQuery({
      queryKey: ['fornecedor', fornecedorId],
      queryFn: async () => {
        const { data, error } = await (supabase as any)
          .from('fornecedores')
          .select('*')
          .eq('id', fornecedorId)
          .single();

        if (error) {
          console.error('Erro ao buscar fornecedor:', error);
          throw error;
        }

        return data as Fornecedor;
      },
      enabled: !!fornecedorId,
    });
  };

  // Mutation para criar fornecedor
  const createFornecedor = useMutation({
    mutationFn: async (fornecedor: FornecedorInsert) => {
      const { data, error } = await (supabase as any)
        .from('fornecedores')
        .insert(fornecedor)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar fornecedor:', error);
        throw error;
      }

      return data as Fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar fornecedor:', error);
      toast.error(error.message || 'Erro ao criar fornecedor');
    },
  });

  // Mutation para atualizar fornecedor
  const updateFornecedor = useMutation({
    mutationFn: async ({ id, ...updates }: FornecedorUpdate & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('fornecedores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        throw error;
      }

      return data as Fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar fornecedor:', error);
      toast.error(error.message || 'Erro ao atualizar fornecedor');
    },
  });

  // Mutation para deletar (inativar) fornecedor
  const deleteFornecedor = useMutation({
    mutationFn: async (fornecedorId: string) => {
      const { error } = await (supabase as any)
        .from('fornecedores')
        .update({ ativo: false })
        .eq('id', fornecedorId);

      if (error) {
        console.error('Erro ao inativar fornecedor:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar fornecedor:', error);
      toast.error(error.message || 'Erro ao inativar fornecedor');
    },
  });

  return {
    fornecedores,
    isLoading,
    error,
    useFornecedor,
    createFornecedor,
    updateFornecedor,
    deleteFornecedor,
  };
}
