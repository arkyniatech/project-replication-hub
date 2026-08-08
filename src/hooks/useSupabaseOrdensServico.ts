import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMultiunidade } from './useMultiunidade';

export interface OrdemServico {
  id: string;
  numero: string;
  equipamento_id: string;
  loja_id: string;
  tipo: 'PREVENTIVA' | 'CORRETIVA';
  origem: 'POS_LOCACAO' | 'AUDITORIA' | 'SUPORTE';
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  sla_horas: number;
  status: 'EM_ANALISE' | 'AGUARD_PECA' | 'EM_REPARO' | 'EM_TESTE' | 'CONCLUIDA';
  area_atual: 'AMARELA' | 'VERMELHA' | 'AZUL' | 'VERDE' | 'CINZA';
  laudo_html?: string;
  fotos?: any[];
  videos?: any[];
  classificacao_defeito?: 'DESGASTE' | 'MAU_USO' | 'NA';
  contrato_id?: string;
  usuario_resp_id?: string;
  checklist?: any;
  pedido_pecas?: any;
  timeline: any[];
  entrada_area_em: string;
  created_at: string;
  updated_at: string;
  equipamento?: any;
}

export function useSupabaseOrdensServico(area?: string) {
  const queryClient = useQueryClient();
  const { lojaAtual } = useMultiunidade();
  const lojaId = lojaAtual?.id;

  // Query para listar OS
  const { data: ordens = [], isLoading, error } = useQuery({
    queryKey: ['ordens-servico', lojaId, area],
    queryFn: async () => {
      let query = supabase
        .from('ordens_servico')
        .select(`
          *,
          equipamento:equipamentos(id, codigo_interno, modelo_id, tipo, numero_serie)
        `)
        .eq('loja_id', lojaId!)
        .order('created_at', { ascending: false });

      if (area) {
        query = query.eq('area_atual', area as any);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar OS:', error);
        throw error;
      }

      return data as OrdemServico[];
    },
    enabled: !!lojaId,
  });

  // Query para buscar uma OS específica
  const useOS = (osId: string) => {
    return useQuery({
      queryKey: ['ordem-servico', osId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('ordens_servico')
          .select(`
            *,
            equipamento:equipamentos(*)
          `)
          .eq('id', osId)
          .single();

        if (error) {
          console.error('Erro ao buscar OS:', error);
          throw error;
        }

        return data as OrdemServico;
      },
      enabled: !!osId,
    });
  };

  // Mutation para criar OS
  const createOS = useMutation({
    mutationFn: async (dados: {
      equipamento_id: string;
      tipo?: 'PREVENTIVA' | 'CORRETIVA';
      origem?: 'POS_LOCACAO' | 'AUDITORIA' | 'SUPORTE';
      prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
      contrato_id?: string;
    }) => {
      if (!lojaId) throw new Error('Loja não selecionada');
      
      // Gera número da OS
      const { data: numero, error: numeroError } = await supabase
        .rpc('gerar_numero_os', { p_loja_id: lojaId });

      if (numeroError) throw numeroError;

      // Cria a OS
      const { data, error } = await supabase
        .from('ordens_servico')
        .insert({
          numero: numero as string,
          equipamento_id: dados.equipamento_id,
          loja_id: lojaId,
          tipo: dados.tipo || 'PREVENTIVA',
          origem: dados.origem || 'POS_LOCACAO',
          prioridade: dados.prioridade || 'MEDIA',
          contrato_id: dados.contrato_id,
          timeline: [
            {
              id: crypto.randomUUID(),
              ts: new Date().toISOString(),
              user: 'current_user',
              action: 'OS_CRIADA',
              payload: { tipo: dados.tipo || 'PREVENTIVA', origem: dados.origem || 'POS_LOCACAO' }
            }
          ] as any
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar OS:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      toast.success('Ordem de Serviço criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar OS:', error);
      toast.error(error.message || 'Erro ao criar OS');
    },
  });

  // Mutation para atualizar OS
  const updateOS = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrdemServico> & { id: string }) => {
      // Adiciona evento na timeline
      const { data: osAtual } = await supabase
        .from('ordens_servico')
        .select('timeline')
        .eq('id', id)
        .single();

      const timelineArray = Array.isArray(osAtual?.timeline) ? osAtual.timeline : [];
      const novaTimeline = [
        ...timelineArray,
        {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          user: 'current_user',
          action: 'OS_ATUALIZADA',
          payload: updates
        }
      ];

      const updateData: any = {
        timeline: novaTimeline
      };
      
      // Adiciona outros campos do update
      Object.keys(updates).forEach(key => {
        if (key !== 'id') {
          updateData[key] = (updates as any)[key];
        }
      });

      const { data, error } = await supabase
        .from('ordens_servico')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar OS:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordem-servico'] });
      toast.success('OS atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar OS:', error);
      toast.error(error.message || 'Erro ao atualizar OS');
    },
  });

  // Mutation para mover área
  const moverArea = useMutation({
    mutationFn: async ({ osId, novaArea }: { osId: string; novaArea: string }) => {
      const { data: osAtual } = await supabase
        .from('ordens_servico')
        .select('timeline, area_atual')
        .eq('id', osId)
        .single();

      const timelineArray = Array.isArray(osAtual?.timeline) ? osAtual.timeline : [];
      const novaTimeline = [
        ...timelineArray,
        {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          user: 'current_user',
          action: 'AREA_MOVIDA',
          payload: { de: osAtual?.area_atual, para: novaArea }
        }
      ];

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          area_atual: novaArea as any,
          entrada_area_em: new Date().toISOString(),
          timeline: novaTimeline as any
        })
        .eq('id', osId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordem-servico'] });
      toast.success('Área atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao mover área:', error);
      toast.error(error.message || 'Erro ao mover área');
    },
  });

  // Mutation para registrar checklist
  const registrarChecklist = useMutation({
    mutationFn: async ({ osId, checklist }: { osId: string; checklist: any }) => {
      const { data: osAtual } = await supabase
        .from('ordens_servico')
        .select('timeline')
        .eq('id', osId)
        .single();

      const timelineArray = Array.isArray(osAtual?.timeline) ? osAtual.timeline : [];
      const novaTimeline = [
        ...timelineArray,
        {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          user: 'current_user',
          action: 'CHECKLIST_REGISTRADO',
          payload: { resultado: checklist.resultado, tipo: checklist.tipo }
        }
      ];

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          checklist: checklist as any,
          timeline: novaTimeline as any
        })
        .eq('id', osId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordem-servico'] });
      toast.success('Checklist registrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao registrar checklist:', error);
      toast.error(error.message || 'Erro ao registrar checklist');
    },
  });

  // Mutation para liberar para verde
  const liberarParaVerde = useMutation({
    mutationFn: async (osId: string) => {
      // Busca a OS para validar
      const { data: os } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('id', osId)
        .single();

      if (!os?.checklist) {
        throw new Error('Checklist não encontrado');
      }

      const checklistData = os.checklist as any;

      // Validações
      const itensCriticosOk = checklistData.itens
        .filter((item: any) => item.critico)
        .every((item: any) => item.ok === true);

      const testeOk = checklistData.testeMinOk;
      const resultado = checklistData.resultado === 'APTO';

      if (!itensCriticosOk || !testeOk || !resultado) {
        throw new Error('Checklist não está completo ou equipamento não está apto');
      }

      // Move para VERDE
      const timelineArray = Array.isArray(os.timeline) ? os.timeline : [];
      const novaTimeline = [
        ...timelineArray,
        {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          user: 'current_user',
          action: 'LIBERADO_PARA_VERDE',
          payload: {}
        }
      ];

      const { data, error } = await supabase
        .from('ordens_servico')
        .update({
          area_atual: 'VERDE' as any,
          status: 'CONCLUIDA' as any,
          timeline: novaTimeline as any
        })
        .eq('id', osId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordem-servico'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento liberado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao liberar:', error);
      toast.error(error.message || 'Erro ao liberar equipamento');
    },
  });

  // Mutation para deletar OS
  const deleteOS = useMutation({
    mutationFn: async (osId: string) => {
      const { error } = await supabase
        .from('ordens_servico')
        .delete()
        .eq('id', osId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      toast.success('OS deletada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar OS:', error);
      toast.error(error.message || 'Erro ao deletar OS');
    },
  });

  return {
    ordens,
    isLoading,
    error,
    useOS,
    createOS,
    updateOS,
    moverArea,
    registrarChecklist,
    liberarParaVerde,
    deleteOS,
  };
}
