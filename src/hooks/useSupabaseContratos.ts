import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Contrato = Database['public']['Tables']['contratos']['Row'];
type ContratoInsert = Database['public']['Tables']['contratos']['Insert'];
type ContratoUpdate = Database['public']['Tables']['contratos']['Update'];
type ContratoItem = Database['public']['Tables']['contrato_itens']['Row'];
type ContratoItemInsert = Database['public']['Tables']['contrato_itens']['Insert'];
type ContratoItemUpdate = Database['public']['Tables']['contrato_itens']['Update'];

export function useSupabaseContratos(lojaId?: string, clienteId?: string) {
  const queryClient = useQueryClient();

  // Query para listar contratos
  const { data: contratos = [], isLoading, error } = useQuery({
    queryKey: ['contratos', lojaId, clienteId],
    queryFn: async () => {
      let query = supabase
        .from('contratos')
        .select(`
          *,
          clientes(*),
          obras(*),
          contrato_itens(*)
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
      }

      return data as (Contrato & { clientes: any; obras: any; contrato_itens: any[] })[];
    },
  });

  // Query para buscar aditivos (renovações) - relação mãe/filho
  const { data: aditivos = [] } = useQuery({
    queryKey: ['aditivos_contratos', lojaId],
    queryFn: async () => {
      let query = supabase
        .from('aditivos_contratuais')
        .select('id, contrato_id, numero, tipo, status, criado_em, valor, descricao')
        .eq('tipo', 'RENOVACAO')
        .eq('status', 'ATIVO')
        .order('criado_em', { ascending: true });

      if (lojaId) {
        query = query.eq('loja_id', lojaId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar aditivos:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!lojaId,
  });

  // Query para buscar um contrato específico com itens
  const useContrato = (contratoId: string) => {
    return useQuery({
      queryKey: ['contrato', contratoId],
      queryFn: async () => {
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes(*),
          obras(*),
          contrato_itens(
            *,
            equipamentos(codigo_interno, numero_serie),
            modelos_equipamentos(nome_comercial),
            grupos_equipamentos(nome)
          )
        `)
        .eq('id', contratoId)
        .maybeSingle();

        if (contratoError) {
          console.error('Erro ao buscar contrato:', contratoError);
          throw contratoError;
        }

        if (!contrato) {
          throw new Error('Contrato não encontrado');
        }

        return {
          ...contrato,
          contrato_itens: contrato.contrato_itens || [],
        } as Contrato & { 
          clientes: any; 
          obras: any;
          contrato_itens: ContratoItem[];
        };
      },
      enabled: !!contratoId,
    });
  };

  // Mutation para criar contrato
  const createContrato = useMutation({
    mutationFn: async (contrato: ContratoInsert) => {
      const { data, error } = await supabase
        .from('contratos')
        .insert(contrato)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar contrato:', error);
        throw error;
      }

      return data as Contrato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato criado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar contrato:', error);
      toast.error(error.message || 'Erro ao criar contrato');
    },
  });

  // Mutation para atualizar contrato
  const updateContrato = useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      console.log('[useSupabaseContratos] Atualizando contrato:', id, updates);
      
      // Validar campos críticos antes de enviar
      if (updates.data_fim && typeof updates.data_fim !== 'string') {
        throw new Error('data_fim deve ser uma string no formato YYYY-MM-DD');
      }
      if (updates.valor_total !== undefined && isNaN(Number(updates.valor_total))) {
        throw new Error('valor_total deve ser um número válido');
      }
      
      const { data, error } = await supabase
        .from('contratos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseContratos] Erro ao atualizar contrato:', error);
        console.error('[useSupabaseContratos] Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Falha ao atualizar contrato: ${error.message}`);
      }

      if (!data) {
        throw new Error('Nenhum dado retornado após atualização do contrato');
      }

      console.log('[useSupabaseContratos] Contrato atualizado com sucesso:', data);
      return data as Contrato;
    },
    onSuccess: (data) => {
      console.log('[useSupabaseContratos] Invalidando queries após update');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato', data.id] });
      toast.success('Contrato atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('[useSupabaseContratos] Erro ao atualizar contrato:', error);
      toast.error(error.message || 'Erro ao atualizar contrato');
    },
  });

  // Mutation para deletar (inativar) contrato
  const deleteContrato = useMutation({
    mutationFn: async (contratoId: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ ativo: false })
        .eq('id', contratoId);

      if (error) {
        console.error('Erro ao inativar contrato:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato inativado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao inativar contrato:', error);
      toast.error(error.message || 'Erro ao inativar contrato');
    },
  });

  // Mutation para cancelar contrato (libera equipamentos)
  const cancelContrato = useMutation({
    mutationFn: async ({ contratoId, motivo }: { contratoId: string; motivo: string }) => {
      // 1. Buscar contrato completo com itens
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select(`
          *,
          contrato_itens(*)
        `)
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;
      if (!contrato) throw new Error('Contrato não encontrado');

      // 2. Verificar tarefas de logística
      const { data: tarefas } = await supabase
        .from('logistica_tarefas')
        .select('status, tipo')
        .eq('contrato_id', contratoId);

      // 3. Validar se pode ser cancelado
      const entregaConfirmada = tarefas?.some((t: any) => t.tipo === 'ENTREGA' && t.status === 'CONCLUIDO');
      
      if (contrato.status === 'FINALIZADO' || contrato.status === 'CANCELADO') {
        throw new Error('Este contrato não pode ser cancelado. Status atual: ' + contrato.status);
      }

      // Permitir cancelamento de ATIVO apenas se entrega NÃO foi confirmada
      if (contrato.status === 'ATIVO' && entregaConfirmada) {
        throw new Error('Não é possível cancelar: entrega já foi confirmada. Use "Devolução Total" para encerrar este contrato.');
      }

      // Bloquear se já está EM_ROTA
      if (tarefas?.some((t: any) => t.status === 'EM_ROTA')) {
        throw new Error('Não é possível cancelar: a entrega já está em rota.');
      }

      // 4. Atualizar status do contrato
      const timeline = Array.isArray(contrato.timeline) ? contrato.timeline : [];
      const novoEvento = {
        id: `evt-${Date.now()}`,
        ts: new Date().toISOString(),
        tipo: 'CONTRATO_CANCELADO',
        usuarioNome: 'Usuário', // TODO: pegar do auth
        resumo: `Contrato cancelado: ${motivo}`,
        meta: { motivo }
      };

      const { error: updateError } = await supabase
        .from('contratos')
        .update({
          status: 'CANCELADO',
          timeline: [...timeline, novoEvento],
          updated_at: new Date().toISOString()
        })
        .eq('id', contratoId);

      if (updateError) throw updateError;

      // 5. Liberar equipamentos (atualizar status dos itens)
      for (const item of contrato.contrato_itens || []) {
        if (item.equipamento_id) {
          // Equipamento SERIE - liberar
          await supabase
            .from('equipamentos')
            .update({ status_global: 'DISPONIVEL' })
            .eq('id', item.equipamento_id);
        }
      }

      // 6. Cancelar tarefas de logística pendentes
      if (tarefas && tarefas.length > 0) {
        await supabase
          .from('logistica_tarefas')
          .update({ status: 'CANCELADO' })
          .eq('contrato_id', contratoId)
          .in('status', ['AGENDAR', 'PROGRAMADO']);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Contrato cancelado com sucesso! Equipamentos liberados.');
    },
    onError: (error: any) => {
      console.error('Erro ao cancelar contrato:', error);
      toast.error(error.message || 'Erro ao cancelar contrato');
    },
  });

  // Mutation para confirmar retirada do cliente
  const confirmarRetirada = useMutation({
    mutationFn: async (contratoId: string) => {
      // 1. Buscar contrato com itens
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select(`
          *,
          contrato_itens(*)
        `)
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;
      if (!contrato) throw new Error('Contrato não encontrado');

      // 2. Validar status
      if (contrato.status !== 'AGUARDANDO_ENTREGA') {
        throw new Error('Este contrato não está aguardando retirada. Status atual: ' + contrato.status);
      }

      // 3. Atualizar status do contrato para ATIVO
      const timeline = Array.isArray(contrato.timeline) ? contrato.timeline : [];
      const novoEvento = {
        id: `evt-${Date.now()}`,
        ts: new Date().toISOString(),
        tipo: 'RETIRADA_CONFIRMADA',
        usuarioNome: 'Usuário', // TODO: pegar do auth
        resumo: 'Cliente retirou os equipamentos',
        meta: { dataRetirada: new Date().toISOString() }
      };

      const { error: updateContratoError } = await supabase
        .from('contratos')
        .update({
          status: 'ATIVO',
          timeline: [...timeline, novoEvento],
          updated_at: new Date().toISOString()
        })
        .eq('id', contratoId);

      if (updateContratoError) throw updateContratoError;

      // 4. Atualizar status dos itens para LOCADO
      const { error: updateItensError } = await supabase
        .from('contrato_itens')
        .update({ status: 'LOCADO' })
        .eq('contrato_id', contratoId);

      if (updateItensError) throw updateItensError;

      // 5. O trigger do banco vai debitar o estoque automaticamente

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Retirada confirmada com sucesso! Estoque atualizado.');
    },
    onError: (error: any) => {
      console.error('Erro ao confirmar retirada:', error);
      toast.error(error.message || 'Erro ao confirmar retirada');
    },
  });

  // Mutation para devolver equipamentos (parcial ou total)
  const devolverContrato = useMutation({
    mutationFn: async ({ 
      contratoId, 
      itensDevolucao, 
      observacoes, 
      dataDevolucao,
      horaDevolucao,
      tipo
    }: { 
      contratoId: string; 
      itensDevolucao: Array<{ itemId: string; equipamentoId?: string; quantidade: number }>;
      observacoes?: string;
      dataDevolucao: string;
      horaDevolucao: string;
      tipo: 'TOTAL' | 'PARCIAL';
    }) => {
      console.log('[devolverContrato] Iniciando devolução:', { contratoId, tipo, itensDevolucao });

      // 1. Buscar contrato com itens
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos')
        .select(`
          *,
          contrato_itens(*)
        `)
        .eq('id', contratoId)
        .single();

      if (contratoError) throw contratoError;
      if (!contrato) throw new Error('Contrato não encontrado');

      // 2. Validar status
      if (contrato.status !== 'ATIVO') {
        throw new Error('Apenas contratos ativos podem ter devoluções. Status atual: ' + contrato.status);
      }

      // 3. Processar cada item devolvido
      const equipamentosParaRevisao: string[] = [];
      const itemIdsParaAtualizar: string[] = [];
      
      for (const itemDev of itensDevolucao) {
        const item = contrato.contrato_itens.find((i: any) => i.id === itemDev.itemId);
        if (!item) continue;

        itemIdsParaAtualizar.push(itemDev.itemId);

        // Se equipamento SERIE, marcar para revisão
        if (item.equipamento_id) {
          equipamentosParaRevisao.push(item.equipamento_id);
          
          // Atualizar status do equipamento para MANUTENCAO (área amarela)
          const { error: equipError } = await supabase
            .from('equipamentos')
            .update({ status_global: 'MANUTENCAO' })
            .eq('id', item.equipamento_id);

          if (equipError) {
            console.error('[devolverContrato] Erro ao atualizar equipamento:', equipError);
            throw equipError;
          }

          // Adicionar evento na timeline do equipamento
          const { data: equipamento } = await supabase
            .from('equipamentos')
            .select('historico')
            .eq('id', item.equipamento_id)
            .single();

          const historicoAtual = Array.isArray(equipamento?.historico) ? equipamento.historico : [];
          const novoEventoEquip = {
            id: `evt-${Date.now()}-${item.equipamento_id}`,
            data: new Date().toISOString(),
            tipo: 'DEVOLUCAO',
            descricao: `Devolvido do contrato ${contrato.numero}`,
            usuario: 'Usuário', // TODO: pegar do auth
            detalhes: { contratoId, observacoes, dataDevolucao, horaDevolucao }
          };

          await supabase
            .from('equipamentos')
            .update({ historico: [...historicoAtual, novoEventoEquip] })
            .eq('id', item.equipamento_id);
        }
      }

      // Atualizar todos os itens devolvidos para status DEVOLVIDO (batch update)
      if (itemIdsParaAtualizar.length > 0) {
        const { error: itemsError } = await supabase
          .from('contrato_itens')
          .update({ 
            status: 'DEVOLVIDO',
            updated_at: new Date().toISOString()
          })
          .in('id', itemIdsParaAtualizar);

        if (itemsError) {
          console.error('[devolverContrato] Erro ao atualizar itens:', itemsError);
          throw itemsError;
        }
      }

      // 4. Verificar se todos os itens foram devolvidos (devolução total)
      const { data: itensRestantes, error: itensError } = await supabase
        .from('contrato_itens')
        .select('id, status')
        .eq('contrato_id', contratoId)
        .not('status', 'in', '(EM_REVISAO,DEVOLVIDO)');

      if (itensError) throw itensError;

      const todosItensDevolvidos = !itensRestantes || itensRestantes.length === 0;
      const novoStatus = todosItensDevolvidos ? 'ENCERRADO' : 'ATIVO';

      console.log('[devolverContrato] Verificação de devolução total:', { 
        todosItensDevolvidos, 
        novoStatus,
        itensRestantes: itensRestantes?.length || 0 
      });

      // 5. Atualizar timeline do contrato
      const timeline = Array.isArray(contrato.timeline) ? contrato.timeline : [];
      const novoEvento = {
        id: `evt-${Date.now()}`,
        ts: new Date().toISOString(),
        tipo: todosItensDevolvidos ? 'DEVOLUCAO_TOTAL_CONFIRMADA' : 'DEVOLUCAO_PARCIAL',
        usuarioNome: 'Usuário', // TODO: pegar do auth
        resumo: todosItensDevolvidos 
          ? `Devolução total confirmada → STATUS: Encerrado` 
          : `Devolução parcial: ${itensDevolucao.length} itens`,
        meta: { 
          itensDevolucao: itensDevolucao.map(i => i.itemId),
          dataDevolucao, 
          horaDevolucao,
          observacoes,
          equipamentosRevisao: equipamentosParaRevisao
        }
      };

      // 6. Atualizar contrato
      const { error: updateContratoError } = await supabase
        .from('contratos')
        .update({
          status: novoStatus,
          timeline: [...timeline, novoEvento],
          updated_at: new Date().toISOString()
        })
        .eq('id', contratoId);

      if (updateContratoError) {
        console.error('[devolverContrato] Erro ao atualizar contrato:', updateContratoError);
        throw updateContratoError;
      }

      console.log('[devolverContrato] Devolução concluída com sucesso:', { 
        contratoId, 
        novoStatus,
        equipamentosParaRevisao: equipamentosParaRevisao.length
      });

      return { 
        success: true, 
        novoStatus,
        equipamentosLiberados: equipamentosParaRevisao.length
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      
      const msg = data.novoStatus === 'ENCERRADO' 
        ? `Contrato encerrado! ${data.equipamentosLiberados} equipamento(s) em revisão (área amarela).`
        : `Devolução parcial confirmada! ${data.equipamentosLiberados} equipamento(s) em revisão.`;
      
      toast.success(msg);
    },
    onError: (error: any) => {
      console.error('[devolverContrato] Erro:', error);
      toast.error(error.message || 'Erro ao processar devolução');
    },
  });

  // Mutation para adicionar item ao contrato
  const addContratoItem = useMutation({
    mutationFn: async (item: ContratoItemInsert) => {
      const { data, error } = await supabase
        .from('contrato_itens')
        .insert(item)
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar item:', error);
        throw error;
      }

      return data as ContratoItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar item:', error);
      toast.error(error.message || 'Erro ao adicionar item');
    },
  });

  // Mutation para atualizar item do contrato
  const updateContratoItem = useMutation({
    mutationFn: async ({ id, ...updates }: ContratoItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contrato_itens')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar item:', error);
        throw error;
      }

      return data as ContratoItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar item:', error);
      toast.error(error.message || 'Erro ao atualizar item');
    },
  });

  // Mutation para deletar item do contrato
  const deleteContratoItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('contrato_itens')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Erro ao deletar item:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contrato'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (error: any) => {
      console.error('Erro ao deletar item:', error);
      toast.error(error.message || 'Erro ao deletar item');
    },
  });

  return {
    contratos,
    aditivos,
    isLoading,
    error,
    useContrato,
    createContrato,
    updateContrato,
    deleteContrato,
    cancelContrato,
    confirmarRetirada,
    devolverContrato,
    addContratoItem,
    updateContratoItem,
    deleteContratoItem,
  };
}
