import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Transferencia = Database['public']['Tables']['transferencias']['Row'];
type TransferenciaInsert = Database['public']['Tables']['transferencias']['Insert'];
type TransferenciaUpdate = Database['public']['Tables']['transferencias']['Update'];
type TransferenciaItem = Database['public']['Tables']['transferencia_itens']['Row'];
type TransferenciaItemInsert = Database['public']['Tables']['transferencia_itens']['Insert'];
type TransferenciaLog = Database['public']['Tables']['transferencia_logs']['Row'];
type TransferenciaLogInsert = Database['public']['Tables']['transferencia_logs']['Insert'];

export function useSupabaseTransferencias(lojaId?: string) {
  const queryClient = useQueryClient();

  // Query para listar transferências
  const { data: transferencias = [], isLoading } = useQuery({
    queryKey: ['transferencias', lojaId],
    queryFn: async () => {
      if (!lojaId) return [];

      const { data, error } = await supabase
        .from('transferencias')
        .select(`
          *,
          origem:lojas!transferencias_origem_loja_id_fkey(id, nome, codigo),
          destino:lojas!transferencias_destino_loja_id_fkey(id, nome, codigo),
          itens:transferencia_itens(*)
        `)
        .or(`origem_loja_id.eq.${lojaId},destino_loja_id.eq.${lojaId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar transferências:', error);
        throw error;
      }

      return data;
    },
    enabled: !!lojaId,
  });

  // Query para buscar uma transferência específica com itens e logs
  const useTransferencia = (transferenciaId?: string) => {
    return useQuery({
      queryKey: ['transferencia', transferenciaId],
      queryFn: async () => {
        if (!transferenciaId) return null;

        // Buscar transferência
        const { data: transferencia, error: errorTransf } = await supabase
          .from('transferencias')
          .select(`
            *,
            origem:lojas!transferencias_origem_loja_id_fkey(id, nome, codigo),
            destino:lojas!transferencias_destino_loja_id_fkey(id, nome, codigo)
          `)
          .eq('id', transferenciaId)
          .single();

        if (errorTransf) throw errorTransf;

        // Buscar itens
        const { data: itens, error: errorItens } = await supabase
          .from('transferencia_itens')
          .select(`
            *,
            modelo:modelos_equipamentos(id, nome_comercial),
            grupo:grupos_equipamentos(id, nome)
          `)
          .eq('transferencia_id', transferenciaId);

        if (errorItens) throw errorItens;

        // Buscar logs
        const { data: logs, error: errorLogs } = await supabase
          .from('transferencia_logs')
          .select('*')
          .eq('transferencia_id', transferenciaId)
          .order('created_at', { ascending: false });

        if (errorLogs) throw errorLogs;

        return {
          ...transferencia,
          itens: itens || [],
          logs: logs || [],
        };
      },
      enabled: !!transferenciaId,
    });
  };

  // Mutation para criar transferência — TRANSACIONAL via RPC.
  // Antes eram 5+ passos client-side: falha no meio deixava transferência
  // órfã e erro de saldo era engolido. A RPC também gera o `numero` por
  // sequence (o client mandava Date.now()%100000) e trava o saldo com
  // FOR UPDATE contra transferências concorrentes do mesmo modelo.
  const criarTransferencia = useMutation({
    mutationFn: async ({
      transferencia,
      itens
    }: {
      transferencia: TransferenciaInsert;
      itens: TransferenciaItemInsert[]
    }) => {
      const { data, error } = await (supabase as any).rpc('criar_transferencia', {
        p_origem_loja_id: transferencia.origem_loja_id,
        p_destino_loja_id: transferencia.destino_loja_id,
        p_itens: itens.map((i) => ({
          tipo: i.tipo,
          // RELAY 39: sem isto a RPC não consegue endereçar a linha de
          // equipamentos e o serializado nunca sai da loja de origem.
          equipamento_id: i.equipamento_id ?? null,
          modelo_id: i.modelo_id ?? null,
          grupo_id: i.grupo_id ?? null,
          codigo_interno: i.codigo_interno ?? null,
          serie: i.serie ?? null,
          descricao: i.descricao ?? null,
          quantidade: i.quantidade ?? 1,
        })),
        p_motorista: transferencia.motorista ?? null,
        p_veiculo: transferencia.veiculo ?? null,
        p_observacoes: transferencia.observacoes ?? null,
      });
      if (error) throw error;
      return data as { id: string; numero: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Transferência criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar transferência:', error);
      toast.error(error.message || 'Erro ao criar transferência');
    },
  });


  // Mutation para atualizar status — TRANSACIONAL via RPC, com máquina de
  // estados no banco (terminal não transita; receber 2x não credita 2x).
  // RECUSADA e CANCELADA devolvem o saldo à origem (CANCELADA antes vazava).
  const atualizarStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      recusa
    }: {
      id: string;
      status: string;
      recusa?: any
    }) => {
      const { error } = await (supabase as any).rpc('atualizar_status_transferencia', {
        p_transferencia_id: id,
        p_status: status,
        p_recusa: recusa ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      queryClient.invalidateQueries({ queryKey: ['transferencia'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status:', error);
      toast.error(error.message || 'Erro ao atualizar status');
    },
  });

  return {
    transferencias,
    isLoading,
    useTransferencia,
    criarTransferencia,
    atualizarStatus,
  };
}
