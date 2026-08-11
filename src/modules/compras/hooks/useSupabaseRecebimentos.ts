import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecebimentoItemInput {
  pedido_item_id: string;
  quantidade_recebida: number;
  series?: string[];
  observacao?: string | null;
}

export interface RegistrarRecebimentoInput {
  pedidoId: string;
  nf: { numero?: string; emissao?: string; chave?: string };
  itens: RecebimentoItemInput[];
}

/** Registra o recebimento de um pedido: grava NF, dá entrada no estoque e
 *  atualiza o status do pedido — tudo atômico via RPC registrar_recebimento. */
export function useSupabaseRecebimentos() {
  const qc = useQueryClient();

  const registrar = useMutation({
    mutationFn: async (input: RegistrarRecebimentoInput) => {
      const { data, error } = await supabase.rpc('registrar_recebimento', {
        p_pedido_id: input.pedidoId,
        p_nf: input.nf as never,
        p_itens: input.itens as never,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compras-pedidos'] });
      qc.invalidateQueries({ queryKey: ['almox-estoque'] });
      qc.invalidateQueries({ queryKey: ['almox-movimentos'] });
      toast.success('Recebimento registrado e estoque atualizado');
    },
    onError: (e: any) => { console.error(e); toast.error(e.message || 'Erro ao registrar recebimento'); },
  });

  return { registrar };
}
