// @ts-nocheck
// ausencias ainda não está em types.ts (criada no Bloco 3).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Ausencia {
  id: string;
  pessoa_id: string;
  loja_id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  status: string;
  justificativa?: string;
  pessoa?: { nome: string } | null;
}

export interface RegistrarAusenciaInput {
  pessoa_id: string;
  loja_id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  justificativa?: string;
}

export function useSupabaseAusencias() {
  const qc = useQueryClient();

  const { data: ausencias = [], isLoading } = useQuery({
    queryKey: ['ausencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ausencias')
        .select('*, pessoa:pessoas(nome)')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as Ausencia[];
    },
  });

  const registrar = useMutation({
    mutationFn: async (input: RegistrarAusenciaInput) => {
      const { data, error } = await supabase.from('ausencias').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ausencias'] });
      // falta injustificada recalcula os dias de férias -> invalida também
      qc.invalidateQueries({ queryKey: ['ferias-periodos'] });
    },
  });

  return { ausencias, isLoading, registrar };
}
