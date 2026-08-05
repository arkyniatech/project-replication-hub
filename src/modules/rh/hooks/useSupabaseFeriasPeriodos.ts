// @ts-nocheck
// ferias_periodos / ferias_agendamentos ainda não estão em types.ts (criadas no Bloco 2).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export interface FeriasPeriodo {
  id: string;
  pessoa_id: string;
  loja_id: string;
  aquisicao_inicio: string;
  aquisicao_fim: string;
  concessivo_fim: string;
  dias_direito: number;
  dias_gozados: number;
  dias_vendidos_abono: number;
  dias_saldo: number;
  status: string;
  pessoa?: { nome: string; cargo?: string } | null;
}

export interface SolicitarFeriasInput {
  periodo_id: string;
  pessoa_id: string;
  loja_id: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  observacao?: string;
}

const DISPONIVEL = ['adquirido', 'vencido', 'dobro_devido', 'parcialmente_gozado', 'programado'];

export function useSupabaseFeriasPeriodos() {
  const queryClient = useQueryClient();

  const { data: periodos = [], isLoading } = useQuery({
    queryKey: ['ferias-periodos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ferias_periodos')
        .select('*, pessoa:pessoas(nome, cargo)')
        .order('concessivo_fim', { ascending: true });
      if (error) throw error;
      return data as FeriasPeriodo[];
    },
  });

  const solicitarFerias = useMutation({
    mutationFn: async (input: SolicitarFeriasInput) => {
      const { data, error } = await supabase
        .from('ferias_agendamentos')
        .insert([{ ...input, status: 'solicitado' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-periodos'] });
    },
  });

  const vencidos = periodos.filter((p) => p.status === 'vencido' || p.status === 'dobro_devido');
  const aVencer = periodos.filter(
    (p) => p.status === 'adquirido' && differenceInCalendarDays(parseISO(p.concessivo_fim), new Date()) <= 90,
  );

  /** Período mais urgente disponível de uma pessoa (o de menor prazo concessivo). */
  const periodoAConsumir = (pessoaId: string) =>
    periodos
      .filter((p) => p.pessoa_id === pessoaId && DISPONIVEL.includes(p.status))
      .sort((a, b) => a.concessivo_fim.localeCompare(b.concessivo_fim))[0] ?? null;

  return { periodos, vencidos, aVencer, isLoading, solicitarFerias, periodoAConsumir };
}
