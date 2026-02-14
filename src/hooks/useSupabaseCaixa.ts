import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Caixa = Database['public']['Tables']['caixa']['Row'];
type CaixaInsert = Database['public']['Tables']['caixa']['Insert'];
type CaixaUpdate = Database['public']['Tables']['caixa']['Update'];
type MovimentoCaixa = Database['public']['Tables']['movimentos_caixa']['Row'];
type MovimentoCaixaInsert = Database['public']['Tables']['movimentos_caixa']['Insert'];

export function useSupabaseCaixa(lojaId?: string) {
  const queryClient = useQueryClient();

  // Query para buscar caixa ativo do usuário
  const { data: caixaAtivo, isLoading: loadingAtivo } = useQuery({
    queryKey: ['caixa-ativo', lojaId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !lojaId) return null;

      const { data, error } = await supabase
        .from('caixa')
        .select('*')
        .eq('loja_id', lojaId)
        .eq('usuario_id', user.id)
        .eq('status', 'ABERTO')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao buscar caixa ativo:', error);
        throw error;
      }

      return data as Caixa | null;
    },
    enabled: !!lojaId,
  });

  // Query para listar movimentos do caixa
  const useMovimentos = (caixaId?: string) => {
    return useQuery({
      queryKey: ['movimentos-caixa', caixaId],
      queryFn: async () => {
        if (!caixaId) return [];

        const { data, error } = await supabase
          .from('movimentos_caixa')
          .select('*')
          .eq('caixa_id', caixaId)
          .order('ts', { ascending: false });

        if (error) {
          console.error('Erro ao buscar movimentos:', error);
          throw error;
        }

        return data as MovimentoCaixa[];
      },
      enabled: !!caixaId,
    });
  };

  // Query para histórico de caixas
  const useHistorico = (filters?: { dataInicio?: string; dataFim?: string }) => {
    return useQuery({
      queryKey: ['caixa-historico', lojaId, filters],
      queryFn: async () => {
        if (!lojaId) return [];

        let query = supabase
          .from('caixa')
          .select('*')
          .eq('loja_id', lojaId)
          .order('data_iso', { ascending: false });

        if (filters?.dataInicio) {
          query = query.gte('data_iso', filters.dataInicio);
        }
        if (filters?.dataFim) {
          query = query.lte('data_iso', filters.dataFim);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar histórico:', error);
          throw error;
        }

        return data as Caixa[];
      },
      enabled: !!lojaId,
    });
  };

  // Mutation para abrir caixa
  const abrirCaixa = useMutation({
    mutationFn: async (caixa: CaixaInsert) => {
      const { data, error } = await supabase
        .from('caixa')
        .insert(caixa)
        .select()
        .single();

      if (error) {
        console.error('Erro ao abrir caixa:', error);
        throw error;
      }

      return data as Caixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-ativo'] });
      toast.success('Caixa aberto com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao abrir caixa:', error);
      toast.error(error.message || 'Erro ao abrir caixa');
    },
  });

  // Mutation para fechar caixa
  const fecharCaixa = useMutation({
    mutationFn: async ({ id, fechamento }: { id: string; fechamento: any }) => {
      const { data, error } = await supabase
        .from('caixa')
        .update({
          status: 'FECHADO',
          fechamento,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao fechar caixa:', error);
        throw error;
      }

      return data as Caixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-ativo'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-historico'] });
      toast.success('Caixa fechado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao fechar caixa:', error);
      toast.error(error.message || 'Erro ao fechar caixa');
    },
  });

  // Mutation para adicionar movimento
  const addMovimento = useMutation({
    mutationFn: async (movimento: MovimentoCaixaInsert) => {
      const { data, error } = await supabase
        .from('movimentos_caixa')
        .insert(movimento)
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar movimento:', error);
        throw error;
      }

      return data as MovimentoCaixa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentos-caixa'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-ativo'] });
      toast.success('Movimento registrado!');
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar movimento:', error);
      toast.error(error.message || 'Erro ao registrar movimento');
    },
  });

  return {
    caixaAtivo,
    loadingAtivo,
    useMovimentos,
    useHistorico,
    abrirCaixa,
    fecharCaixa,
    addMovimento,
  };
}
