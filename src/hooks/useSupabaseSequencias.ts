import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SequenciaNumeracao {
  id: string;
  loja_id: string;
  tipo: 'contrato' | 'os' | 'fatura' | 'titulo' | 'aditivo';
  prefixo: string;
  template: string;
  reset_modo: 'NUNCA' | 'ANUAL' | 'MENSAL';
  por_unidade: boolean;
  proximo_numero: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useSupabaseSequencias(lojaId?: string) {
  const queryClient = useQueryClient();

  // Buscar sequências
  const { data: sequencias, isLoading } = useQuery({
    queryKey: ['sequencias', lojaId],
    queryFn: async () => {
      let query = supabase
        .from('sequencias_numeracao')
        .select('*')
        .eq('ativo', true)
        .order('tipo');

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SequenciaNumeracao[];
    },
    enabled: true,
  });

  // Atualizar sequência
  const updateSequencia = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<SequenciaNumeracao> 
    }) => {
      const { data, error } = await supabase
        .from('sequencias_numeracao')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequencias'] });
      toast.success('Sequência atualizada com sucesso');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar sequência:', error);
      toast.error('Erro ao atualizar sequência');
    },
  });

  // Resetar visualização (atualizar próximo_numero para 1)
  const resetVisualizacao = useMutation({
    mutationFn: async (lojaIdToReset: string) => {
      const { data, error } = await supabase
        .from('sequencias_numeracao')
        .update({ proximo_numero: 1 })
        .eq('loja_id', lojaIdToReset);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequencias'] });
      toast.success('Visualização resetada');
    },
    onError: (error: Error) => {
      console.error('Erro ao resetar visualização:', error);
      toast.error('Erro ao resetar visualização');
    },
  });

  // Incrementar sequência (chamada pelo backend via RPC)
  const incrementarSequencia = useMutation({
    mutationFn: async ({ 
      lojaId, 
      tipo, 
      chaveContador 
    }: { 
      lojaId: string; 
      tipo: string; 
      chaveContador: string 
    }) => {
      const { data, error } = await supabase.rpc('incrementar_contador', {
        p_loja_id: lojaId,
        p_tipo: tipo,
        p_chave_contador: chaveContador,
      });

      if (error) throw error;
      return data as number;
    },
    onError: (error: Error) => {
      console.error('Erro ao incrementar contador:', error);
      toast.error('Erro ao gerar número do documento');
    },
  });

  return {
    sequencias,
    isLoading,
    updateSequencia: updateSequencia.mutate,
    resetVisualizacao: resetVisualizacao.mutate,
    incrementarSequencia: incrementarSequencia.mutateAsync,
    isUpdating: updateSequencia.isPending,
  };
}
