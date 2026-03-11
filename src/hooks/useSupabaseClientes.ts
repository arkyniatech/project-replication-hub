import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type ClienteInsert = Database['public']['Tables']['clientes']['Insert'];
type ClienteUpdate = Database['public']['Tables']['clientes']['Update'];

export function useSupabaseClientes(lojaId?: string) {
  const queryClient = useQueryClient();

  // Query para listar clientes
  const { data: clientes = [], isLoading, error } = useQuery({
    queryKey: ['clientes', lojaId],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        throw error;
      }

      return data as Cliente[];
    },
    enabled: true,
  });

  // Query para buscar um cliente específico
  const useCliente = (clienteId: string) => {
    return useQuery({
      queryKey: ['cliente', clienteId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', clienteId)
          .single();

        if (error) {
          console.error('Erro ao buscar cliente:', error);
          throw error;
        }

        return data as Cliente;
      },
      enabled: !!clienteId,
    });
  };

  // Mutation para criar cliente
  const createCliente = useMutation({
    mutationFn: async (cliente: ClienteInsert) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert(cliente)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar cliente:', error);
        throw error;
      }

      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar cliente:', error);
      const isRLS = error?.message?.includes('row-level security');
      toast.error(isRLS ? 'Sem permissão para cadastrar clientes nesta loja.' : (error.message || 'Erro ao cadastrar cliente'));
    },
  });

  // Mutation para atualizar cliente
  const updateCliente = useMutation({
    mutationFn: async ({ id, ...updates }: ClienteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw error;
      }

      return data as Cliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar cliente:', error);
      toast.error(error.message || 'Erro ao atualizar cliente');
    },
  });

  // Mutation para deletar (inativar) cliente
  const deleteCliente = useMutation({
    mutationFn: async (clienteId: string) => {
      const { error } = await supabase
        .from('clientes')
        .update({ ativo: false })
        .eq('id', clienteId);

      if (error) {
        console.error('Erro ao inativar cliente:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar cliente:', error);
      toast.error(error.message || 'Erro ao inativar cliente');
    },
  });

  return {
    clientes,
    isLoading,
    error,
    useCliente,
    createCliente,
    updateCliente,
    deleteCliente,
  };
}
