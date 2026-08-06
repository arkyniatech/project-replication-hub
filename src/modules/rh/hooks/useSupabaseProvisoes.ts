// @ts-nocheck
// rescisao_simulacoes / rescisao_itens ainda não estão em types.ts (criadas no Bloco 11).
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RescisaoItem {
  id: string;
  rubrica: string;
  descricao?: string;
  base?: number;
  aliquota?: number;
  quantidade?: number;
  valor: number;
  ordem: number;
}

export function useSimularRescisao() {
  return useMutation({
    mutationFn: async ({ pessoaId, motivo, data }: { pessoaId: string; motivo: string; data: string }) => {
      const { data: simId, error } = await supabase.rpc('simular_rescisao', {
        p_pessoa_id: pessoaId,
        p_motivo: motivo,
        p_data: data,
      });
      if (error) throw error;
      return simId as string;
    },
  });
}

export function useRescisaoResultado(simId?: string | null) {
  return useQuery({
    queryKey: ['rescisao-resultado', simId],
    enabled: !!simId,
    queryFn: async () => {
      const { data: itens } = await supabase.from('rescisao_itens').select('*').eq('simulacao_id', simId).order('ordem');
      const { data: sim } = await supabase.from('rescisao_simulacoes').select('*').eq('id', simId).maybeSingle();
      return { itens: (itens || []) as RescisaoItem[], total: Number(sim?.custo_empregador ?? 0) };
    },
  });
}
