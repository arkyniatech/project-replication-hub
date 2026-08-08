import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export const MOTIVOS_DESLIGAMENTO = [
  { value: 'pedido_demissao', label: 'Pedido de demissão' },
  { value: 'sem_justa_causa', label: 'Dispensa sem justa causa' },
  { value: 'justa_causa', label: 'Justa causa' },
  { value: 'acordo_484a', label: 'Acordo (art. 484-A)' },
  { value: 'termino_contrato', label: 'Término de contrato' },
  { value: 'falecimento', label: 'Falecimento' },
  { value: 'outro', label: 'Outro' },
];

export interface Desligamento {
  id: string;
  pessoa_id: string;
  vinculo_id?: string | null;
  loja_id: string;
  motivo: string;
  data_alvo?: string | null;
  data_efetiva?: string | null;
  tipo_aviso?: 'trabalhado' | 'indenizado' | 'dispensado' | null;
  simulacao_id?: string | null;
  observacoes?: string | null;
  status: 'aberto' | 'concluido' | 'cancelado';
  created_at: string;
  pessoa?: { nome: string } | null;
}

export function useSupabaseDesligamentos() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rh-desligamentos'] });
    // concluir desligamento inativa a pessoa e encerra o vínculo
    qc.invalidateQueries({ queryKey: ['pessoas'] });
    qc.invalidateQueries({ queryKey: ['pessoa-vinculo'] });
  };

  const { data: desligamentos = [], isLoading, error } = useQuery({
    queryKey: ['rh-desligamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_desligamentos')
        .select('*, pessoa:pessoas(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Desligamento[];
    },
  });

  const criar = useMutation({
    mutationFn: async (input: Partial<Desligamento>) => {
      const { data, error } = await supabase.from('rh_desligamentos').insert([input as TablesInsert<'rh_desligamentos'>]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Desligamento> & { id: string }) => {
      const { error } = await supabase.from('rh_desligamentos').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { desligamentos, isLoading, error: error as Error | null, criar, atualizar };
}
