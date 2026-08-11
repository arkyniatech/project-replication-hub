import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import type { CatalogoItem } from './useSupabaseCatalogo';

export type EstoqueRow = Database['public']['Tables']['almox_estoque']['Row'];
export type EstoqueComItem = EstoqueRow & { item: CatalogoItem | null };

/** Saldo de estoque por loja + item, com o item do catálogo embutido. */
export function useSupabaseEstoque(lojaId?: string) {
  const qc = useQueryClient();

  const { data: estoque = [], isLoading, error } = useQuery({
    queryKey: ['almox-estoque', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];
      const { data, error } = await supabase
        .from('almox_estoque')
        .select('*, item:almox_catalogo_itens(*)')
        .eq('loja_id', lojaId);
      if (error) { console.error('Erro ao buscar estoque:', error); throw error; }
      return (data ?? []) as unknown as EstoqueComItem[];
    },
    enabled: !!lojaId,
  });

  const ajustarSaldo = useMutation({
    mutationFn: async (v: { itemId: string; lojaId: string; diferenca: number; justificativa: string }) => {
      const { error } = await supabase.rpc('ajustar_saldo_estoque', {
        p_item_id: v.itemId,
        p_loja_id: v.lojaId,
        p_diferenca: v.diferenca,
        p_justificativa: v.justificativa,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['almox-estoque'] });
      qc.invalidateQueries({ queryKey: ['almox-movimentos'] });
      toast.success('Saldo ajustado');
    },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao ajustar saldo'); },
  });

  return { estoque, isLoading, error, ajustarSaldo };
}
