import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { useCurrentUserName } from '@/hooks/useCurrentUserName';

export type RequisicaoRow = Database['public']['Tables']['compras_requisicoes']['Row'];
export type RequisicaoItemRow = Database['public']['Tables']['compras_requisicao_itens']['Row'];
export type RequisicaoComItens = RequisicaoRow & { itens: RequisicaoItemRow[] };

export interface RequisicaoItemInput {
  item_catalogo_id?: string | null;
  sku?: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  obs?: string | null;
}

export interface NovaRequisicaoInput {
  loja_id: string;
  categoria: 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL';
  prioridade: 'baixa' | 'media' | 'alta';
  centro_custo?: string | null;
  observacoes?: string | null;
  itens: RequisicaoItemInput[];
}

/** Requisições internas de compra (fluxo rascunho → solicitado → em_cotacao). */
export function useSupabaseRequisicoes(lojaId?: string) {
  const qc = useQueryClient();
  const solicitanteNome = useCurrentUserName();

  const { data: requisicoes = [], isLoading, error } = useQuery({
    queryKey: ['compras-requisicoes', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];
      const { data, error } = await supabase
        .from('compras_requisicoes')
        .select('*, itens:compras_requisicao_itens(*)')
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Erro ao buscar requisições:', error); throw error; }
      return (data ?? []) as unknown as RequisicaoComItens[];
    },
    enabled: !!lojaId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['compras-requisicoes'] });

  const criar = useMutation({
    mutationFn: async (input: NovaRequisicaoInput) => {
      const { itens, ...cab } = input;
      // numero fica vazio: o trigger BEFORE INSERT gera REQ-000001 por loja.
      const { data: req, error } = await supabase
        .from('compras_requisicoes')
        .insert({ ...cab, numero: '', solicitante_nome: solicitanteNome, status: 'rascunho' })
        .select()
        .single();
      if (error) throw error;
      if (itens.length) {
        const rows = itens.map((i) => ({ ...i, requisicao_id: req.id, loja_id: input.loja_id }));
        const { error: e2 } = await supabase.from('compras_requisicao_itens').insert(rows);
        if (e2) throw e2;
      }
      return req;
    },
    onSuccess: () => { invalidate(); toast.success('Requisição criada'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao criar requisição'); },
  });

  const editar = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: NovaRequisicaoInput }) => {
      const { itens, ...cab } = input;
      const { error } = await supabase.from('compras_requisicoes')
        .update({ centro_custo: cab.centro_custo, categoria: cab.categoria, prioridade: cab.prioridade, observacoes: cab.observacoes })
        .eq('id', id);
      if (error) throw error;

      // Insere os novos itens ANTES de apagar os antigos: se o insert falhar,
      // a requisição continua com os itens originais em vez de ficar vazia.
      const antigos = await supabase.from('compras_requisicao_itens').select('id').eq('requisicao_id', id);
      if (antigos.error) throw antigos.error;

      if (itens.length) {
        const rows = itens.map((i) => ({ ...i, requisicao_id: id, loja_id: input.loja_id }));
        const { error: e2 } = await supabase.from('compras_requisicao_itens').insert(rows);
        if (e2) throw e2;
      }

      const idsAntigos = (antigos.data ?? []).map((r) => r.id);
      if (idsAntigos.length) {
        const { error: e3 } = await supabase.from('compras_requisicao_itens').delete().in('id', idsAntigos);
        if (e3) throw e3;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Requisição atualizada'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao atualizar requisição'); },
  });

  // Item 1 do ticket: transição rascunho → solicitado (destrava o "Enviar para cotação").
  const solicitar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compras_requisicoes').update({ status: 'solicitado' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Requisição enviada para aprovação de compra'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao solicitar'); },
  });

  const enviarParaCotacao = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('criar_cotacao_de_requisicao', { p_requisicao_id: id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['compras-cotacoes'] });
      toast.success('Cotação aberta a partir da requisição');
    },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao enviar para cotação'); },
  });

  return { requisicoes, isLoading, error, criar, editar, solicitar, enviarParaCotacao };
}
