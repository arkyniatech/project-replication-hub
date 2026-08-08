import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BancoHorasMovimento {
  id: string;
  pessoa_id: string;
  loja_id: string;
  ocorrido_em: string;
  tipo: 'credito' | 'debito' | 'pagamento' | 'expiracao';
  horas: number;
  saldo_apos: number;
  observacao?: string | null;
  created_at: string;
  pessoa?: { nome: string } | null;
}

export interface LancarMovimentoInput {
  pessoa_id: string;
  loja_id: string;
  tipo: 'credito' | 'debito' | 'pagamento' | 'expiracao';
  horas: number;
  observacao?: string;
}

export function useSupabaseBancoHoras() {
  const qc = useQueryClient();

  const { data: movimentos = [], isLoading } = useQuery({
    queryKey: ['banco-horas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banco_horas_movimentos')
        .select('*, pessoa:pessoas(nome)')
        .order('ocorrido_em', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BancoHorasMovimento[];
    },
  });

  const lancar = useMutation({
    mutationFn: async (input: LancarMovimentoInput) => {
      const { data, error } = await supabase.from('banco_horas_movimentos').insert([input]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banco-horas'] }),
  });

  // saldo corrente por pessoa = saldo_apos do movimento mais recente (lista já vem desc)
  const saldos: { pessoa_id: string; nome: string; saldo: number }[] = Object.values(
    movimentos.reduce((acc: any, m) => {
      if (!acc[m.pessoa_id]) {
        acc[m.pessoa_id] = { pessoa_id: m.pessoa_id, nome: m.pessoa?.nome ?? '—', saldo: Number(m.saldo_apos) };
      }
      return acc;
    }, {}),
  );

  return { movimentos, saldos, isLoading, lancar };
}
