import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PontoLancamento {
  id: string;
  pessoa_id: string;
  loja_id: string;
  data: string;
  entrada?: string | null;
  saida?: string | null;
  intervalo_min: number;
  horas_trabalhadas?: number | null;
  justificativa?: string | null;
  pessoa?: { nome: string } | null;
}

export interface LancarPontoInput {
  pessoa_id: string;
  loja_id: string;
  data: string;
  entrada?: string;
  saida?: string;
  intervalo_min?: number;
  horas_trabalhadas?: number;
  justificativa?: string;
}

export function useSupabasePonto() {
  const qc = useQueryClient();

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['ponto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ponto_lancamentos')
        .select('*, pessoa:pessoas(nome)')
        .order('data', { ascending: false });
      if (error) throw error;
      return data as PontoLancamento[];
    },
  });

  // upsert: re-lançar o mesmo dia atualiza (UNIQUE pessoa_id, data)
  const lancar = useMutation({
    mutationFn: async (input: LancarPontoInput) => {
      const { data, error } = await supabase
        .from('ponto_lancamentos')
        .upsert([input], { onConflict: 'pessoa_id,data' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ponto'] }),
  });

  return { lancamentos, isLoading, lancar };
}
