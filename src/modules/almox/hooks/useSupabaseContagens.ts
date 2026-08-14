import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type ContagemRow = Database['public']['Tables']['almox_contagens']['Row'];
export type ContagemItemRow = Database['public']['Tables']['almox_contagem_itens']['Row'];
export type ContagemComItens = ContagemRow & { itens: ContagemItemRow[] };

export interface AbrirContagemInput {
  lojaId: string;
  tipo: 'PATRIMONIAL' | 'PECA' | 'CONSUMIVEL' | 'TODOS';
  grupo?: string | null;
  incluirZerados?: boolean;
  observacoes?: string | null;
}

/** Uma linha contada, do jeito que a tela de contagem envia. */
export interface LancamentoContagem {
  id: string;
  quantidade_contada: number | null;
  observacao?: string | null;
}

/** Contagem cega do almoxarifado: sessões, lançamento e processamento. */
export function useSupabaseContagens(lojaId?: string) {
  const qc = useQueryClient();

  const { data: contagens = [], isLoading, error } = useQuery({
    queryKey: ['almox-contagens', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];
      const { data, error } = await supabase
        .from('almox_contagens')
        .select('*, itens:almox_contagem_itens(*)')
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Erro ao buscar contagens:', error); throw error; }
      return (data ?? []) as unknown as ContagemComItens[];
    },
    enabled: !!lojaId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['almox-contagens'] });
    qc.invalidateQueries({ queryKey: ['almox-contagem'] });
  };

  const abrir = useMutation({
    mutationFn: async (input: AbrirContagemInput) => {
      const { data, error } = await supabase.rpc('abrir_contagem_almox', {
        p_loja_id: input.lojaId,
        p_tipo: input.tipo,
        p_grupo: input.grupo ?? null,
        p_incluir_zerados: input.incluirZerados ?? false,
        p_observacoes: input.observacoes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidate(); toast.success('Contagem aberta'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao abrir contagem'); },
  });

  /** Salva as quantidades digitadas. Em lote, para o operador não perder o que digitou. */
  const lancarContagem = useMutation({
    mutationFn: async (lancamentos: LancamentoContagem[]) => {
      if (!lancamentos.length) return;
      const agora = new Date().toISOString();
      const user = (await supabase.auth.getUser()).data.user;
      for (const l of lancamentos) {
        const { error } = await supabase
          .from('almox_contagem_itens')
          .update({
            quantidade_contada: l.quantidade_contada,
            observacao: l.observacao ?? null,
            contado_em: l.quantidade_contada === null ? null : agora,
            contado_por: l.quantidade_contada === null ? null : user?.id ?? null,
          })
          .eq('id', l.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Contagem salva'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao salvar contagem'); },
  });

  /** Decisão da revisão: ajustar (com justificativa) ou ignorar a divergência.
   *  Só grava os campos informados — enviar `justificativa: undefined` mantém
   *  o texto que já está no banco em vez de apagá-lo. */
  const definirAcao = useMutation({
    mutationFn: async (v: { itemId: string; acao?: 'AJUSTAR' | 'IGNORAR' | null; justificativa?: string | null }) => {
      const patch: Record<string, unknown> = {};
      if ('acao' in v) patch.acao = v.acao ?? null;
      if (v.justificativa !== undefined) patch.justificativa = v.justificativa;
      if (Object.keys(patch).length === 0) return;

      const { error } = await supabase
        .from('almox_contagem_itens')
        .update(patch)
        .eq('id', v.itemId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao definir ação'); },
  });

  const processar = useMutation({
    mutationFn: async (contagemId: string) => {
      const { data, error } = await supabase.rpc('processar_contagem_almox', { p_contagem_id: contagemId });
      if (error) throw error;
      return (data ?? 0) as number;
    },
    onSuccess: (aplicados) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['almox-estoque'] });
      qc.invalidateQueries({ queryKey: ['almox-movimentos'] });
      toast.success(aplicados > 0
        ? `Contagem processada — ${aplicados} ajuste(s) aplicados ao estoque`
        : 'Contagem processada sem ajustes de saldo');
    },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao processar contagem'); },
  });

  const cancelar = useMutation({
    mutationFn: async (contagemId: string) => {
      const { error } = await supabase.rpc('cancelar_contagem_almox', { p_contagem_id: contagemId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Contagem cancelada'); },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao cancelar contagem'); },
  });

  return { contagens, isLoading, error, abrir, lancarContagem, definirAcao, processar, cancelar };
}

/** Uma contagem específica com seus itens (tela de contagem e de revisão). */
export function useContagem(contagemId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['almox-contagem', contagemId],
    queryFn: async () => {
      if (!contagemId) return null;
      const { data, error } = await supabase
        .from('almox_contagens')
        .select('*, itens:almox_contagem_itens(*)')
        .eq('id', contagemId)
        .single();
      if (error) { console.error('Erro ao buscar contagem:', error); throw error; }
      return data as unknown as ContagemComItens;
    },
    enabled: !!contagemId,
  });

  return { contagem: data ?? null, isLoading, error };
}
