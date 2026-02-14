import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function useSupabaseAditivos(contratoId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar aditivos
  const { data: aditivos, isLoading } = useQuery({
    queryKey: ['aditivos', contratoId],
    queryFn: async () => {
      if (!contratoId) return [];
      
      const { data, error } = await supabase
        .from('aditivos_contratuais')
        .select('*')
        .eq('contrato_id', contratoId)
        .eq('status', 'ATIVO')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar aditivos:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!contratoId,
  });

  // Criar aditivo
  const createAditivo = useMutation({
    mutationFn: async (aditivo: any) => {
      console.log('[useSupabaseAditivos] Criando aditivo:', aditivo);
      
      const { data, error } = await supabase
        .from('aditivos_contratuais')
        .insert(aditivo)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseAditivos] Erro ao criar:', error);
        throw error;
      }
      
      console.log('[useSupabaseAditivos] Aditivo criado:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aditivos', contratoId] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({
        title: 'Aditivo criado',
        description: 'O aditivo foi criado com sucesso',
      });
    },
    onError: (error: any) => {
      console.error('Erro ao criar aditivo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o aditivo',
        variant: 'destructive',
      });
    },
  });

  // Atualizar aditivo
  const updateAditivo = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('aditivos_contratuais')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aditivos', contratoId] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({
        title: 'Aditivo atualizado',
        description: 'O aditivo foi atualizado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o aditivo',
        variant: 'destructive',
      });
    },
  });

  // Deletar aditivo (soft delete - muda status para CANCELADO)
  const deleteAditivo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aditivos_contratuais')
        .update({ status: 'CANCELADO' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aditivos', contratoId] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({
        title: 'Aditivo removido',
        description: 'O aditivo foi removido com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover o aditivo',
        variant: 'destructive',
      });
    },
  });

  // Gerar próximo número de renovação (formato: numeroContrato-sequencial)
  const gerarNumeroRenovacao = async (contratoNumero: string, contratoId: string): Promise<string> => {
    try {
      // Buscar todas as renovações existentes para este contrato
      const { data: renovacoes, error } = await supabase
        .from('aditivos_contratuais')
        .select('numero')
        .eq('contrato_id', contratoId)
        .eq('tipo', 'RENOVACAO')
        .order('criado_em', { ascending: true });

      if (error) {
        console.error('Erro ao buscar renovações:', error);
        // Fallback em caso de erro
        return `${contratoNumero}-01`;
      }

      // Contar quantas renovações já existem
      const totalRenovacoes = renovacoes?.length || 0;
      const proximoSequencial = totalRenovacoes + 1;
      
      // Formatar com zero à esquerda (01, 02, 03...)
      const sequencialFormatado = proximoSequencial.toString().padStart(2, '0');
      
      return `${contratoNumero}-${sequencialFormatado}`;
    } catch (error) {
      console.error('Erro ao gerar número de renovação:', error);
      return `${contratoNumero}-01`;
    }
  };

  return {
    aditivos,
    isLoading,
    createAditivo,
    updateAditivo,
    deleteAditivo,
    gerarNumeroRenovacao,
  };
}
