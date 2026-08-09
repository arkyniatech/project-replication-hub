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

export interface ProvisaoSnapshot {
  id: string;
  pessoa_id: string;
  competencia: string;
  provisao_13: number;
  provisao_ferias: number;
  provisao_ferias_terco: number;
  encargos_patronais: number;
  total_adquirido: number;
  pessoa?: { nome: string } | null;
}

export function useProvisaoSnapshots(competencia: string) {
  return useQuery({
    queryKey: ['provisao-snapshots', competencia],
    enabled: !!competencia,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('provisao_snapshots')
        .select('*, pessoa:pessoas(nome)')
        .eq('competencia', competencia)
        .order('total_adquirido', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProvisaoSnapshot[];
    },
  });
}

export function useGerarProvisoes() {
  return useMutation({
    mutationFn: async (competencia: string) => {
      const { data, error } = await (supabase as any).rpc('gerar_provisao_snapshots', {
        p_competencia: competencia,
      });
      if (error) throw error;
      return data as { competencia: string; pessoas: number; total: number };
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
