import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMultiunidade } from './useMultiunidade';

export interface ProdutividadeManutencao {
  id: string;
  data_iso: string;
  loja_id: string;
  mecanico_id?: string;
  auxiliar_id?: string;
  limpas: number;
  liberadas: number;
  aguard_diag: number;
  aguard_peca: number;
  suportes: number;
  andaimes_limpas: number;
  andaimes_liberadas: number;
  escoras_limpas: number;
  escoras_liberadas: number;
  created_at: string;
  updated_at: string;
}

export function useSupabaseProdutividadeManutencao(dataInicio?: string, dataFim?: string) {
  const queryClient = useQueryClient();
  const { lojaAtual } = useMultiunidade();
  const lojaId = lojaAtual?.id;

  // Query para listar produtividade
  const { data: produtividade = [], isLoading, error } = useQuery({
    queryKey: ['produtividade-manutencao', lojaId, dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from('produtividade_manutencao')
        .select('*')
        .eq('loja_id', lojaId!)
        .order('data_iso', { ascending: false });

      if (dataInicio) {
        query = query.gte('data_iso', dataInicio);
      }

      if (dataFim) {
        query = query.lte('data_iso', dataFim);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar produtividade:', error);
        throw error;
      }

      return data as ProdutividadeManutencao[];
    },
    enabled: !!lojaId,
  });

  // Query para produtividade do dia
  const { data: produtividadeHoje } = useQuery({
    queryKey: ['produtividade-hoje', lojaId],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('produtividade_manutencao')
        .select('*')
        .eq('loja_id', lojaId!)
        .eq('data_iso', hoje)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar produtividade de hoje:', error);
        throw error;
      }

      return data as ProdutividadeManutencao | null;
    },
    enabled: !!lojaId,
  });

  // Query para produtividade da semana
  const { data: produtividadeSemana = [] } = useQuery({
    queryKey: ['produtividade-semana', lojaId],
    queryFn: async () => {
      const semanaAtras = new Date();
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      const cutoff = semanaAtras.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('produtividade_manutencao')
        .select('*')
        .eq('loja_id', lojaId!)
        .gte('data_iso', cutoff)
        .order('data_iso', { ascending: true });

      if (error) {
        console.error('Erro ao buscar produtividade da semana:', error);
        throw error;
      }

      return data as ProdutividadeManutencao[];
    },
    enabled: !!lojaId,
  });

  // Query para produtividade do mês
  const { data: produtividadeMes = [] } = useQuery({
    queryKey: ['produtividade-mes', lojaId],
    queryFn: async () => {
      const mesAtras = new Date();
      mesAtras.setMonth(mesAtras.getMonth() - 1);
      const cutoff = mesAtras.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('produtividade_manutencao')
        .select('*')
        .eq('loja_id', lojaId!)
        .gte('data_iso', cutoff)
        .order('data_iso', { ascending: true });

      if (error) {
        console.error('Erro ao buscar produtividade do mês:', error);
        throw error;
      }

      return data as ProdutividadeManutencao[];
    },
    enabled: !!lojaId,
  });

  // Mutation para registrar/atualizar produtividade
  const registrarProdutividade = useMutation({
    mutationFn: async (dados: Omit<ProdutividadeManutencao, 'id' | 'created_at' | 'updated_at'>) => {
      // Tenta atualizar se já existe
      const { data: existing } = await supabase
        .from('produtividade_manutencao')
        .select('id')
        .eq('data_iso', dados.data_iso)
        .eq('loja_id', dados.loja_id)
        .eq('mecanico_id', dados.mecanico_id || null)
        .eq('auxiliar_id', dados.auxiliar_id || null)
        .maybeSingle();

      if (existing) {
        // Atualiza
        const { data, error } = await supabase
          .from('produtividade_manutencao')
          .update(dados)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insere
        const { data, error } = await supabase
          .from('produtividade_manutencao')
          .insert(dados)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtividade-manutencao'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-semana'] });
      queryClient.invalidateQueries({ queryKey: ['produtividade-mes'] });
      toast.success('Produtividade registrada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar produtividade:', error);
      toast.error(error.message || 'Erro ao registrar produtividade');
    },
  });

  return {
    produtividade,
    produtividadeHoje,
    produtividadeSemana,
    produtividadeMes,
    isLoading,
    error,
    registrarProdutividade,
  };
}
