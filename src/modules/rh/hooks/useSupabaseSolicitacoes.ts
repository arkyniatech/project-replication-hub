// @ts-nocheck
// rh_solicitacoes / rh_aprovacoes ainda não estão em types.ts (criadas no Bloco 7).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Solicitacao {
  id: string;
  tipo: string;
  pessoa_id: string;
  loja_id: string;
  titulo?: string | null;
  status: 'pendente' | 'em_aprovacao' | 'aprovada' | 'reprovada' | 'cancelada';
  created_at: string;
  pessoa?: { nome: string } | null;
}

export function useSupabaseSolicitacoes() {
  const qc = useQueryClient();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['rh-solicitacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_solicitacoes')
        .select('*, pessoa:pessoas(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Solicitacao[];
    },
  });

  const criar = useMutation({
    mutationFn: async ({ tipo, pessoa, titulo }: { tipo: string; pessoa: any; titulo?: string }) => {
      const { error } = await supabase.from('rh_solicitacoes').insert([{
        tipo,
        pessoa_id: pessoa.id,
        loja_id: pessoa.lojaId,
        titulo: titulo || null,
        status: 'pendente',
      }]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-solicitacoes'] }),
  });

  // aprovar/reprovar => insere rh_aprovacoes; trigger atualiza o status da solicitação
  const decidir = useMutation({
    mutationFn: async ({ solicitacaoId, decisao, motivo }: { solicitacaoId: string; decisao: 'aprovado' | 'reprovado'; motivo?: string }) => {
      const { error } = await supabase.from('rh_aprovacoes').insert([{
        solicitacao_id: solicitacaoId,
        decisao,
        motivo: motivo ?? null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rh-solicitacoes'] }),
  });

  return { solicitacoes, isLoading, criar, decidir };
}
