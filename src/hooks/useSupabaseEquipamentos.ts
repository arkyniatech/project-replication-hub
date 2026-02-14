import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Equipamento = Database['public']['Tables']['equipamentos']['Row'];
type EquipamentoInsert = Database['public']['Tables']['equipamentos']['Insert'];
type EquipamentoUpdate = Database['public']['Tables']['equipamentos']['Update'];

export function useSupabaseEquipamentos(lojaId?: string, grupoId?: string, modeloId?: string) {
  const queryClient = useQueryClient();

  // Hook para gerar código automático
  const gerarCodigo = useMutation({
    mutationFn: async ({ lojaId, grupoId }: { lojaId: string; grupoId: string }) => {
      // MOCK: Generate code client-side because database function is missing
      // Format: LA + timestamp slice + random logic to ensure uniqueness
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const mockCode = `LA${timestamp}${random}`;
      return Promise.resolve(mockCode);
    },
    onError: (error: any) => {
      console.error('Erro ao gerar código:', error);
      toast.error(error.message || 'Erro ao gerar código');
    },
  });

  // Query para listar equipamentos
  const { data: equipamentos = [], isLoading, error } = useQuery({
    queryKey: ['equipamentos', lojaId, grupoId, modeloId],
    queryFn: async () => {
      let query = supabase
        .from('equipamentos')
        .select(`
          *,
          grupos_equipamentos(*),
          modelos_equipamentos(*)
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (grupoId) {
        query = query.eq('grupo_id', grupoId);
      }

      if (modeloId) {
        query = query.eq('modelo_id', modeloId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar equipamentos:', error);
        throw error;
      }

      // Filtrar por loja no frontend (para considerar saldos_por_loja)
      let filtered = data as (Equipamento & {
        grupos_equipamentos: any;
        modelos_equipamentos: any;
      })[];

      if (lojaId) {
        filtered = filtered.filter(eq => {
          // Para SERIALIZADO: filtro por loja_atual_id
          if (eq.tipo === 'SERIALIZADO') {
            return eq.loja_atual_id === lojaId;
          }

          // Para SALDO: verificar se tem estoque nesta loja
          if (eq.tipo === 'SALDO') {
            const saldos = eq.saldos_por_loja as Record<string, { qtd: number }> || {};
            return (saldos[lojaId]?.qtd || 0) > 0;
          }

          return false;
        });
      }

      return filtered;
    },
  });

  // Query para buscar um equipamento específico
  const useEquipamento = (equipamentoId: string) => {
    return useQuery({
      queryKey: ['equipamento', equipamentoId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('equipamentos')
          .select(`
            *,
            grupos_equipamentos(*),
            modelos_equipamentos(*)
          `)
          .eq('id', equipamentoId)
          .single();

        if (error) {
          console.error('Erro ao buscar equipamento:', error);
          throw error;
        }

        return data as Equipamento & {
          grupos_equipamentos: any;
          modelos_equipamentos: any;
        };
      },
      enabled: !!equipamentoId,
    });
  };

  // Mutation para criar equipamento
  const createEquipamento = useMutation({
    mutationFn: async (equipamento: EquipamentoInsert) => {
      const { data, error } = await supabase
        .from('equipamentos')
        .insert(equipamento)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar equipamento:', error);
        throw error;
      }

      return data as Equipamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar equipamento:', error);
      toast.error(error.message || 'Erro ao cadastrar equipamento');
    },
  });

  // Mutation para atualizar equipamento
  const updateEquipamento = useMutation({
    mutationFn: async ({ id, ...updates }: EquipamentoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('equipamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar equipamento:', error);
        throw error;
      }

      return data as Equipamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar equipamento:', error);
      toast.error(error.message || 'Erro ao atualizar equipamento');
    },
  });

  // Mutation para deletar (inativar) equipamento
  const deleteEquipamento = useMutation({
    mutationFn: async (equipamentoId: string) => {
      const { error } = await supabase
        .from('equipamentos')
        .update({ ativo: false })
        .eq('id', equipamentoId);

      if (error) {
        console.error('Erro ao inativar equipamento:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar equipamento:', error);
      toast.error(error.message || 'Erro ao inativar equipamento');
    },
  });

  // Mutation para adicionar evento ao histórico
  const addHistoricoEvent = useMutation({
    mutationFn: async ({
      equipamentoId,
      event
    }: {
      equipamentoId: string;
      event: any;
    }) => {
      // 1. Buscar equipamento atual
      const { data: equipamento, error: fetchError } = await supabase
        .from('equipamentos')
        .select('historico')
        .eq('id', equipamentoId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Criar novo evento
      const novoEvento = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      // 3. Atualizar histórico
      const historicoAtualizado = [
        ...(Array.isArray(equipamento.historico) ? equipamento.historico : []),
        novoEvento
      ];

      // 4. Salvar no banco
      const { data, error } = await supabase
        .from('equipamentos')
        .update({
          historico: historicoAtualizado,
          updated_at: new Date().toISOString()
        })
        .eq('id', equipamentoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar queries para forçar atualização
      queryClient.invalidateQueries({ queryKey: ['equipamento', data.id] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar evento ao histórico:', error);
    },
  });

  return {
    equipamentos,
    isLoading,
    error,
    useEquipamento,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    gerarCodigo,
    addHistoricoEvent,
  };
}
