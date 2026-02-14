import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSupabaseTitulos(lojaId?: string, clienteId?: string, contratoId?: string) {
  const queryClient = useQueryClient();

  const { data: titulos = [], isLoading, error } = useQuery({
    queryKey: ['titulos', lojaId, clienteId, contratoId],
    queryFn: async () => {
      console.log('[useSupabaseTitulos] Buscando títulos com:', { lojaId, clienteId, contratoId });
      
      let query = supabase
        .from('titulos')
        .select(`
          *,
          cliente:clientes(id, nome, razao_social, cpf, cnpj),
          contrato:contratos(id, numero),
          fatura:faturas(id, numero)
        `)
        .order('vencimento', { ascending: false });

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
        console.error('[useSupabaseTitulos] Erro ao buscar títulos:', error);
        throw error;
      }

      console.log('[useSupabaseTitulos] Títulos encontrados:', data?.length || 0);
      
      // Transform snake_case from Supabase to camelCase for app compatibility
      const transformedData = (data || []).map((titulo: any) => ({
        id: titulo.id,
        numero: titulo.numero,
        contratoId: titulo.contrato_id,
        contrato: titulo.contrato,
        clienteId: titulo.cliente_id,
        cliente: titulo.cliente ? {
          ...titulo.cliente,
          nomeRazao: titulo.cliente.nome || titulo.cliente.razao_social
        } : undefined,
        aditivoId: titulo.aditivo_id,
        lojaId: titulo.loja_id,
        categoria: titulo.categoria,
        subcategoria: titulo.subcategoria,
        emissao: titulo.emissao,
        vencimento: titulo.vencimento,
        valor: titulo.valor,
        pago: titulo.pago,
        saldo: titulo.saldo,
        forma: titulo.forma,
        status: titulo.status,
        origem: titulo.origem,
        timeline: titulo.timeline || [],
        observacoes: titulo.observacoes,
        createdAt: titulo.created_at,
        updatedAt: titulo.updated_at
      }));
      
      return transformedData;
    },
    enabled: true, // Sempre habilitado para usuários autenticados
  });

  const createTitulo = useMutation({
    mutationFn: async (titulo: any) => {
      const { data, error } = await (supabase as any)
        .from('titulos')
        .insert(titulo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Título criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar título:', error);
      toast.error(error.message || 'Erro ao criar título');
    },
  });

  const updateTitulo = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await (supabase as any)
        .from('titulos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Título atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar título:', error);
      toast.error(error.message || 'Erro ao atualizar título');
    },
  });

  const deleteTitulo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('titulos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Título excluído com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir título:', error);
      toast.error(error.message || 'Erro ao excluir título');
    },
  });

  return {
    titulos,
    isLoading,
    error,
    createTitulo,
    updateTitulo,
    deleteTitulo,
  };
}
