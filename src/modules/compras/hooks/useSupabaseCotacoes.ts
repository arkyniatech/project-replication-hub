import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type CotacaoRow = Database['public']['Tables']['compras_cotacoes']['Row'];
export type CotacaoItemRow = Database['public']['Tables']['compras_cotacao_itens']['Row'];
export type PropostaRow = Database['public']['Tables']['compras_cotacao_propostas']['Row'];
export type PropostaItemRow = Database['public']['Tables']['compras_cotacao_proposta_itens']['Row'];

export type PropostaComItens = PropostaRow & {
  fornecedor: { id: string; nome: string; codigo: string } | null;
  itens: PropostaItemRow[];
};
export type CotacaoCompleta = CotacaoRow & {
  itens: CotacaoItemRow[];
  propostas: PropostaComItens[];
};

export interface NovaPropostaInput {
  cotacaoId: string;
  lojaId: string;
  fornecedorId: string;
  frete?: number;
  impostos?: number;
  desconto?: number;
  total: number;
  prazoGeralDias?: number;
  condicoesPagamento?: string;
  validadeProposta?: string | null;
  itens: { cotacaoItemId: string; precoUnit: number; prazoEntrega?: number | null; observacao?: string | null }[];
}

export interface ItemAvulso {
  item_catalogo_id?: string | null;
  sku?: string | null;
  descricao: string;
  unidade?: string;
  quantidade: number;
}

/** Cotações: originadas de requisição, de OS (pedido de peças) ou diretas/avulsas. */
export function useSupabaseCotacoes(lojaId?: string) {
  const qc = useQueryClient();

  const { data: cotacoes = [], isLoading, error } = useQuery({
    queryKey: ['compras-cotacoes', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];
      const { data, error } = await supabase
        .from('compras_cotacoes')
        .select(`*,
          itens:compras_cotacao_itens(*),
          propostas:compras_cotacao_propostas(*, fornecedor:fornecedores(id, nome, codigo), itens:compras_cotacao_proposta_itens(*))`)
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Erro ao buscar cotações:', error); throw error; }
      return (data ?? []) as unknown as CotacaoCompleta[];
    },
    enabled: !!lojaId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['compras-cotacoes'] });
    qc.invalidateQueries({ queryKey: ['compras-requisicoes'] });
    qc.invalidateQueries({ queryKey: ['compras-pedidos'] });
  };

  // Item 2 do ticket: cotação direta/avulsa (sem requisição de origem).
  const criarDireta = useMutation({
    mutationFn: async (v: { lojaId: string; itens: ItemAvulso[] }) => {
      const { data, error } = await supabase.rpc('criar_cotacao_direta', {
        p_loja_id: v.lojaId,
        p_itens: v.itens as never,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success('Cotação direta criada'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao criar cotação'); },
  });

  const criarDeOS = useMutation({
    mutationFn: async (osId: string) => {
      const { data, error } = await supabase.rpc('criar_cotacao_de_os', { p_os_id: osId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success('Cotação criada a partir da OS'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao gerar cotação da OS'); },
  });

  const adicionarProposta = useMutation({
    mutationFn: async (p: NovaPropostaInput) => {
      const { data: proposta, error } = await supabase
        .from('compras_cotacao_propostas')
        .insert({
          cotacao_id: p.cotacaoId,
          loja_id: p.lojaId,
          fornecedor_id: p.fornecedorId,
          frete: p.frete ?? 0,
          impostos: p.impostos ?? 0,
          desconto: p.desconto ?? 0,
          total: p.total,
          prazo_geral_dias: p.prazoGeralDias ?? 0,
          condicoes_pagamento: p.condicoesPagamento,
          validade_proposta: p.validadeProposta ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (p.itens.length) {
        const rows = p.itens.map((i) => ({
          proposta_id: proposta.id,
          cotacao_item_id: i.cotacaoItemId,
          loja_id: p.lojaId,
          preco_unit: i.precoUnit,
          prazo_entrega: i.prazoEntrega ?? null,
          observacao: i.observacao ?? null,
        }));
        const { error: e2 } = await supabase.from('compras_cotacao_proposta_itens').insert(rows);
        if (e2) throw e2;
      }
      return proposta;
    },
    onSuccess: () => { invalidate(); toast.success('Fornecedor adicionado à cotação'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao adicionar fornecedor'); },
  });

  const enviarParaAprovacao = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { error } = await supabase.from('compras_cotacoes').update({ status: 'para_aprovacao' }).eq('id', cotacaoId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Cotação enviada para aprovação'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao enviar para aprovação'); },
  });

  const aprovar = useMutation({
    mutationFn: async ({ cotacaoId, aprovacao }: { cotacaoId: string; aprovacao: Record<string, unknown> }) => {
      const { error } = await supabase.from('compras_cotacoes')
        .update({ status: 'aprovado', aprovacao: aprovacao as never })
        .eq('id', cotacaoId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Cotação aprovada'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao aprovar cotação'); },
  });

  const gerarPedidos = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { data, error } = await supabase.rpc('gerar_pedidos_de_cotacao', { p_cotacao_id: cotacaoId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success('Pedido de compra gerado'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao gerar pedido'); },
  });

  return { cotacoes, isLoading, error, criarDireta, criarDeOS, adicionarProposta, enviarParaAprovacao, aprovar, gerarPedidos };
}
