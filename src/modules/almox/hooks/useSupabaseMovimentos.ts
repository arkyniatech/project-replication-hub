import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type MovimentoRow = Database['public']['Tables']['almox_movimentos']['Row'];
export type MovimentoComItem = MovimentoRow & { item: { sku: string | null; descricao: string } | null };

/** Livro-razão de movimentos de estoque (entradas, saídas, ajustes). */
export function useSupabaseMovimentos(lojaId?: string, itemId?: string) {
  const { data: movimentos = [], isLoading, error } = useQuery({
    queryKey: ['almox-movimentos', lojaId, itemId],
    queryFn: async () => {
      if (!lojaId) return [];
      let q = supabase
        .from('almox_movimentos')
        .select('*, item:almox_catalogo_itens(sku, descricao)')
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false });
      if (itemId) q = q.eq('item_id', itemId);
      const { data, error } = await q;
      if (error) { console.error('Erro ao buscar movimentos:', error); throw error; }
      return (data ?? []) as unknown as MovimentoComItem[];
    },
    enabled: !!lojaId,
  });

  return { movimentos, isLoading, error };
}
