import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LogisticaTarefa {
  id: string;
  loja_id: string;
  itinerario_id?: string;
  contrato_id?: string;
  cliente_id?: string;
  tipo: "ENTREGA" | "RETIRADA" | "SUPORTE";
  status: "AGENDAR" | "PROGRAMADO" | "EM_ROTA" | "CONCLUIDO" | "REAGENDADO" | "CANCELADO";
  prioridade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  previsto_iso: string;
  duracao_min: number;
  janela?: string;
  endereco: any;
  latitude?: number;
  longitude?: number;
  cliente_nome: string;
  cliente_telefone?: string;
  check_in_ts?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  concluido_ts?: string;
  motivo_falha?: string;
  motivo_falha_tipo?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

interface TarefasFilters {
  lojaId: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string[];
  tipo?: string[];
  motoristaId?: string;
}

export function useSupabaseLogisticaTarefas(filters: TarefasFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["logistica-tarefas", filters],
    queryFn: async () => {
      let query = supabase
        .from("logistica_tarefas")
        .select("*")
        .eq("loja_id", filters.lojaId);

      if (filters.dataInicio) {
        query = query.gte("previsto_iso", filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte("previsto_iso", filters.dataFim);
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status as any);
      }
      if (filters.tipo && filters.tipo.length > 0) {
        query = query.in("tipo", filters.tipo as any);
      }
      if (filters.motoristaId) {
        // Buscar itinerários do motorista
        const { data: itinerarios } = await supabase
          .from("logistica_itinerarios")
          .select("id")
          .eq("motorista_id", filters.motoristaId);
        
        if (itinerarios && itinerarios.length > 0) {
          query = query.in("itinerario_id", itinerarios.map(i => i.id));
        }
      }

      const { data, error } = await query.order("previsto_iso", { ascending: true });

      if (error) throw error;
      return data as LogisticaTarefa[];
    },
    enabled: !!filters.lojaId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LogisticaTarefa> }) => {
      const { data, error } = await supabase
        .from("logistica_tarefas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      // Trigger: Se ENTREGA foi CONCLUÍDA, ativar o contrato
      if (data && data.tipo === 'ENTREGA' && updates.status === 'CONCLUIDO' && data.contrato_id) {
        await ativarContratoPosEntrega(data.contrato_id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-tarefas"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper: Ativar contrato após entrega confirmada
  const ativarContratoPosEntrega = async (contratoId: string) => {
    try {
      const { data: contrato } = await supabase
        .from('contratos')
        .select('status, timeline')
        .eq('id', contratoId)
        .single();

      if (!contrato || contrato.status !== 'AGUARDANDO_ENTREGA') {
        return; // Apenas ativa se estiver aguardando entrega
      }

      const timeline = Array.isArray(contrato.timeline) ? contrato.timeline : [];
      const novoEvento = {
        id: `evt-${Date.now()}`,
        ts: new Date().toISOString(),
        tipo: 'ENTREGA_CONFIRMADA',
        usuarioNome: 'Sistema',
        resumo: 'Entrega confirmada pela logística. Contrato ativado automaticamente.',
      };

      await supabase
        .from('contratos')
        .update({
          status: 'ATIVO',
          timeline: [...timeline, novoEvento],
          updated_at: new Date().toISOString(),
        })
        .eq('id', contratoId);

      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato', contratoId] });
    } catch (error) {
      console.error('Erro ao ativar contrato pós-entrega:', error);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (tarefa: Partial<LogisticaTarefa>) => {
      const { data, error } = await supabase
        .from("logistica_tarefas")
        .insert([tarefa as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistica-tarefas"] });
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tarefas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    updateTarefa: updateMutation.mutate,
    createTarefa: createMutation.mutate,
    isUpdating: updateMutation.isPending,
    isCreating: createMutation.isPending,
  };
}
