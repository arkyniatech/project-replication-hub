import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseFaturas(lojaId?: string, clienteId?: string, contratoId?: string) {
  const queryClient = useQueryClient();

  const { data: faturas = [], isLoading } = useQuery({
    queryKey: ['faturas', lojaId, clienteId, contratoId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('faturas')
        .select('*, cliente:clientes(*), contrato:contratos(*)')
        .order('emissao', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      if (contratoId) {
        query = query.eq('contrato_id', contratoId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar faturas:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!lojaId || !!clienteId || !!contratoId,
  });

  const createFatura = useMutation({
    mutationFn: async (fatura: any) => {
      const { data, error } = await (supabase as any)
        .from('faturas')
        .insert(fatura)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas'] });
      toast.success('Fatura criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar fatura:', error);
      toast.error(error.message || 'Erro ao criar fatura');
    },
  });

  const updateFatura = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any)
        .from('faturas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas'] });
      toast.success('Fatura atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar fatura:', error);
      toast.error(error.message || 'Erro ao atualizar fatura');
    },
  });

  const deleteFatura = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('faturas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas'] });
      toast.success('Fatura excluída com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir fatura:', error);
      toast.error(error.message || 'Erro ao excluir fatura');
    },
  });

  return {
    faturas,
    isLoading,
    createFatura,
    updateFatura,
    deleteFatura,
  };
}

// Hook específico para relatórios com filtros avançados
export function useSupabaseFaturasRelatorio(filters?: {
  lojaId?: string;
  clienteId?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  formaPagamento?: string;
}) {
  return useQuery({
    queryKey: ['faturas-relatorio', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('faturas')
        .select(`
          id,
          numero,
          emissao,
          vencimento,
          tipo,
          forma_preferida,
          total,
          observacoes,
          created_at,
          clientes (
            nome,
            razao_social
          ),
          contratos!faturas_contrato_id_fkey (
            numero
          )
        `)
        .order('emissao', { ascending: false })
        .limit(1000);

      // Aplicar filtros
      if (filters?.lojaId && filters.lojaId !== 'todas') {
        query = query.eq('loja_id', filters.lojaId);
      }

      if (filters?.clienteId && filters.clienteId !== 'todos') {
        query = query.eq('cliente_id', filters.clienteId);
      }

      if (filters?.dataInicio && filters?.dataFim) {
        query = query
          .gte('emissao::date', filters.dataInicio)
          .lte('emissao::date', filters.dataFim);
      }

      if (filters?.tipo && filters.tipo !== 'todos') {
        query = query.eq('tipo', filters.tipo);
      }

      if (filters?.formaPagamento && filters.formaPagamento !== 'todas') {
        query = query.eq('forma_preferida', filters.formaPagamento);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar faturas para relatório:', error);
        throw error;
      }

      const totalFaturas = data?.length || 0;
      const totalValor = data?.reduce((sum: number, fatura: any) => sum + (fatura.total || 0), 0) || 0;

      return {
        faturas: data || [],
        totalFaturas,
        totalValor,
        preview: data?.slice(0, 5) || [],
      };
    },
    enabled: true, // ✅ Executar automaticamente ao montar o componente
  });
}
