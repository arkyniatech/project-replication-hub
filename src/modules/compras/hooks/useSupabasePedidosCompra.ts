import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PedidoRow = Database['public']['Tables']['compras_pedidos']['Row'];
export type PedidoItemRow = Database['public']['Tables']['compras_pedido_itens']['Row'];
export type PedidoCompleto = PedidoRow & {
  itens: PedidoItemRow[];
  fornecedor: { nome: string; codigo: string } | null;
  cotacao: { numero: string; origem: string } | null;
};

/** Pedidos de compra (emitidos a partir de cotações aprovadas). */
export function useSupabasePedidosCompra(lojaId?: string) {
  const { data: pedidos = [], isLoading, error } = useQuery({
    queryKey: ['compras-pedidos', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];
      const { data, error } = await supabase
        .from('compras_pedidos')
        .select(`*,
          itens:compras_pedido_itens(*),
          fornecedor:fornecedores(nome, codigo),
          cotacao:compras_cotacoes(numero, origem)`)
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false });
      if (error) { console.error('Erro ao buscar pedidos:', error); throw error; }
      return (data ?? []) as unknown as PedidoCompleto[];
    },
    enabled: !!lojaId,
  });

  return { pedidos, isLoading, error };
}
