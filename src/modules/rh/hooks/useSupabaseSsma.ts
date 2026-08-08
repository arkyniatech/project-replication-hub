// @ts-nocheck
// rh_aso_exames/rh_treinamentos ainda não estão em types.ts (criadas no Bloco 12).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const TIPOS_ASO = [
  { value: 'admissional', label: 'Admissional' },
  { value: 'periodico', label: 'Periódico' },
  { value: 'retorno_trabalho', label: 'Retorno ao trabalho' },
  { value: 'mudanca_funcao', label: 'Mudança de função' },
  { value: 'demissional', label: 'Demissional' },
];

export interface AsoExame {
  id: string;
  pessoa_id: string;
  loja_id: string;
  tipo: string;
  data_exame: string;
  validade?: string | null;
  resultado: 'apto' | 'apto_com_restricao' | 'inapto';
  medico?: string | null;
  crm?: string | null;
  observacoes?: string | null;
  pessoa?: { nome: string } | null;
}

export interface Treinamento {
  id: string;
  pessoa_id: string;
  loja_id: string;
  norma: string;
  descricao?: string | null;
  data_realizacao: string;
  validade?: string | null;
  carga_horaria_h?: number | null;
  instituicao?: string | null;
  pessoa?: { nome: string } | null;
}

export function useSupabaseSsma() {
  const qc = useQueryClient();

  const { data: asoExames = [], isLoading: loadingAso, error: errAso } = useQuery({
    queryKey: ['rh-aso-exames'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_aso_exames')
        .select('*, pessoa:pessoas(nome)')
        .order('data_exame', { ascending: false });
      if (error) throw error;
      return data as AsoExame[];
    },
  });

  const { data: treinamentos = [], isLoading: loadingTrein, error: errTrein } = useQuery({
    queryKey: ['rh-treinamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_treinamentos')
        .select('*, pessoa:pessoas(nome)')
        .order('data_realizacao', { ascending: false });
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const registrarAso = useMutation({
    mutationFn: async (input: Partial<AsoExame>) => {
      const { data, error } = await supabase.from('rh_aso_exames').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-aso-exames'] }),
  });

  const registrarTreinamento = useMutation({
    mutationFn: async (input: Partial<Treinamento>) => {
      const { data, error } = await supabase.from('rh_treinamentos').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-treinamentos'] }),
  });

  return {
    asoExames, treinamentos,
    isLoading: loadingAso || loadingTrein,
    error: (errAso ?? errTrein) as Error | null,
    registrarAso, registrarTreinamento,
  };
}
