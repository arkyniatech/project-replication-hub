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
          destino:lojas!transferencias_destino_loja_id_fkey(id, nome, codigo)
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
          .order('em', { ascending: false });

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

  // Mutation para criar transferência
  const criarTransferencia = useMutation({
    mutationFn: async ({ 
      transferencia, 
      itens 
    }: { 
      transferencia: TransferenciaInsert; 
      itens: TransferenciaItemInsert[] 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar transferência
      const { data: novaTransf, error: errorTransf } = await supabase
        .from('transferencias')
        .insert({ ...transferencia, created_by: user.id })
        .select()
        .single();

      if (errorTransf) throw errorTransf;

      // Criar itens
      const itensComTransfId = itens.map(item => ({
        ...item,
        transferencia_id: novaTransf.id,
      }));

      const { error: errorItens } = await supabase
        .from('transferencia_itens')
        .insert(itensComTransfId);

      if (errorItens) throw errorItens;

      // Atualizar saldos_por_loja para itens SALDO
      for (const item of itens) {
        if (item.tipo === 'SALDO' && item.modelo_id) {
          // Buscar equipamento SALDO deste modelo (sem filtro de loja - é único por modelo)
          const { data: equipSaldo, error: errorEquip } = await supabase
            .from('equipamentos')
            .select('id, saldos_por_loja')
            .eq('modelo_id', item.modelo_id)
            .eq('tipo', 'SALDO')
            .maybeSingle();

          if (errorEquip || !equipSaldo) {
            console.warn('Equipamento SALDO não encontrado para modelo:', item.modelo_id);
            continue;
          }

          const saldosAtuais = (equipSaldo.saldos_por_loja as Record<string, any>) || {};
          const saldoOrigem = saldosAtuais[transferencia.origem_loja_id!] || { qtd: 0 };
          
          // Decrementar origem
          const novoSaldoOrigem = Math.max(0, (saldoOrigem.qtd || 0) - item.quantidade);
          
          const novosSaldos = {
            ...saldosAtuais,
            [transferencia.origem_loja_id!]: { qtd: novoSaldoOrigem }
          };

          const { error: errorUpdate } = await supabase
            .from('equipamentos')
            .update({ saldos_por_loja: novosSaldos as any })
            .eq('id', equipSaldo.id);

          if (errorUpdate) {
            console.error('Erro ao atualizar saldos_por_loja:', errorUpdate);
          }
        }
      }

      // Criar log inicial
      const { error: errorLog } = await supabase
        .from('transferencia_logs')
        .insert({
          transferencia_id: novaTransf.id,
          por_usuario_id: user.id,
          por_usuario_nome: user.email || 'Usuário',
          acao: 'CRIADA',
          detalhe: `Transferência criada com ${itens.length} item(ns)`,
        });

      if (errorLog) throw errorLog;

      // Atualizar histórico dos equipamentos
      for (const item of itens) {
        if (item.tipo === 'SALDO' && item.modelo_id) {
          const { data: equipSaldo } = await supabase
            .from('equipamentos')
            .select('id, historico')
            .eq('modelo_id', item.modelo_id)
            .eq('tipo', 'SALDO')
            .maybeSingle();

          if (equipSaldo) {
            // Buscar nomes das lojas
            const { data: origemLoja } = await supabase
              .from('lojas')
              .select('nome')
              .eq('id', transferencia.origem_loja_id!)
              .single();

            const { data: destinoLoja } = await supabase
              .from('lojas')
              .select('nome')
              .eq('id', transferencia.destino_loja_id!)
              .single();

            const historico = Array.isArray(equipSaldo.historico) ? equipSaldo.historico : [];
            const novoEvento = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              tipo: 'TRANSFERENCIA_ENVIADA',
              descricao: `Transferência de ${item.quantidade} unidade(s) enviada para ${destinoLoja?.nome || 'destino'}`,
              usuario: user.email || 'Usuário',
              meta: {
                quantidade: item.quantidade,
                origemLojaId: transferencia.origem_loja_id,
                origemLojaNome: origemLoja?.nome,
                destinoLojaId: transferencia.destino_loja_id,
                destinoLojaNome: destinoLoja?.nome,
                transferenciaId: novaTransf.id,
                transferenciaNumero: novaTransf.numero,
              },
            };

            await supabase
              .from('equipamentos')
              .update({ 
                historico: [...historico, novoEvento] as any,
                updated_at: new Date().toISOString()
              })
              .eq('id', equipSaldo.id);
          }
        }
      }

      return novaTransf;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      toast.success('Transferência criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar transferência:', error);
      toast.error(error.message || 'Erro ao criar transferência');
    },
  });

  // Mutation para atualizar status da transferência
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar transferência e itens
      const { data: transferencia, error: errorTransf } = await supabase
        .from('transferencias')
        .select('*, origem_loja_id, destino_loja_id')
        .eq('id', id)
        .single();

      if (errorTransf || !transferencia) throw errorTransf || new Error('Transferência não encontrada');

      const { data: itens, error: errorItens } = await supabase
        .from('transferencia_itens')
        .select('*')
        .eq('transferencia_id', id);

      if (errorItens) throw errorItens;

      // Atualizar saldos conforme o status
      const transferenciaInicio = new Date(transferencia.created_at);
      const agora = new Date();
      const tempoTransito = Math.floor((agora.getTime() - transferenciaInicio.getTime()) / 60000); // minutos

      if (status === 'RECEBIDA' && itens) {
        // Incrementar saldo no destino
        for (const item of itens) {
          if (item.tipo === 'SALDO' && item.modelo_id) {
            // Buscar equipamento SALDO (sem filtro de loja - é único por modelo)
            const { data: equipSaldo, error: errorEquip } = await supabase
              .from('equipamentos')
              .select('id, saldos_por_loja, historico')
              .eq('modelo_id', item.modelo_id)
              .eq('tipo', 'SALDO')
              .maybeSingle();

            if (errorEquip || !equipSaldo) {
              console.warn('Equipamento SALDO não encontrado no destino:', item.modelo_id);
              continue;
            }

            const saldosAtuais = (equipSaldo.saldos_por_loja as Record<string, any>) || {};
            const saldoDestino = saldosAtuais[transferencia.destino_loja_id] || { qtd: 0 };
            
            const novoSaldoDestino = (saldoDestino.qtd || 0) + item.quantidade;
            
            const novosSaldos = {
              ...saldosAtuais,
              [transferencia.destino_loja_id]: { qtd: novoSaldoDestino }
            };

            // Buscar nomes das lojas
            const { data: origemLoja } = await supabase
              .from('lojas')
              .select('nome')
              .eq('id', transferencia.origem_loja_id)
              .single();

            const { data: destinoLoja } = await supabase
              .from('lojas')
              .select('nome')
              .eq('id', transferencia.destino_loja_id)
              .single();

            const historico = Array.isArray(equipSaldo.historico) ? equipSaldo.historico : [];
            const novoEvento = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              tipo: 'TRANSFERENCIA_RECEBIDA',
              descricao: `Transferência de ${item.quantidade} unidade(s) recebida em ${destinoLoja?.nome || 'destino'}`,
              usuario: user.email || 'Usuário',
              meta: {
                quantidade: item.quantidade,
                origemLojaId: transferencia.origem_loja_id,
                origemLojaNome: origemLoja?.nome,
                destinoLojaId: transferencia.destino_loja_id,
                destinoLojaNome: destinoLoja?.nome,
                transferenciaId: id,
                transferenciaNumero: transferencia.numero,
                tempoTransito,
              },
            };

            await supabase
              .from('equipamentos')
              .update({ 
                saldos_por_loja: novosSaldos as any,
                historico: [...historico, novoEvento] as any,
                updated_at: new Date().toISOString()
              })
              .eq('id', equipSaldo.id);
          }
        }
      } else if (status === 'RECUSADA' && itens) {
        // Reverter saldo na origem
        for (const item of itens) {
          if (item.tipo === 'SALDO' && item.modelo_id) {
            // Buscar equipamento SALDO (sem filtro de loja - é único por modelo)
            const { data: equipSaldo, error: errorEquip } = await supabase
              .from('equipamentos')
              .select('id, saldos_por_loja, historico')
              .eq('modelo_id', item.modelo_id)
              .eq('tipo', 'SALDO')
              .maybeSingle();

            if (errorEquip || !equipSaldo) {
              console.warn('Equipamento SALDO não encontrado na origem:', item.modelo_id);
              continue;
            }

            const saldosAtuais = (equipSaldo.saldos_por_loja as Record<string, any>) || {};
            const saldoOrigem = saldosAtuais[transferencia.origem_loja_id] || { qtd: 0 };
            
            const novoSaldoOrigem = (saldoOrigem.qtd || 0) + item.quantidade;
            
            const novosSaldos = {
              ...saldosAtuais,
              [transferencia.origem_loja_id]: { qtd: novoSaldoOrigem }
            };

            // Buscar nomes das lojas
            const { data: origemLoja } = await supabase
              .from('lojas')
              .select('nome')
              .eq('id', transferencia.origem_loja_id)
              .single();

            const { data: destinoLoja } = await supabase
              .from('lojas')
              .select('nome')
              .eq('id', transferencia.destino_loja_id)
              .single();

            const historico = Array.isArray(equipSaldo.historico) ? equipSaldo.historico : [];
            const novoEvento = {
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              tipo: 'TRANSFERENCIA_RECUSADA',
              descricao: `Transferência de ${item.quantidade} unidade(s) para ${destinoLoja?.nome || 'destino'} foi recusada`,
              usuario: user.email || 'Usuário',
              meta: {
                quantidade: item.quantidade,
                origemLojaId: transferencia.origem_loja_id,
                origemLojaNome: origemLoja?.nome,
                destinoLojaId: transferencia.destino_loja_id,
                destinoLojaNome: destinoLoja?.nome,
                transferenciaId: id,
                transferenciaNumero: transferencia.numero,
                motivoRecusa: recusa,
              },
            };

            await supabase
              .from('equipamentos')
              .update({ 
                saldos_por_loja: novosSaldos as any,
                historico: [...historico, novoEvento] as any,
                updated_at: new Date().toISOString()
              })
              .eq('id', equipSaldo.id);
          }
        }
      }

      const updates: TransferenciaUpdate = { status: status as any };
      if (recusa) {
        updates.recusa = recusa;
      }

      const { data, error } = await supabase
        .from('transferencias')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Registrar log
      const { error: errorLog } = await supabase
        .from('transferencia_logs')
        .insert({
          transferencia_id: id,
          por_usuario_id: user.id,
          por_usuario_nome: user.email || 'Usuário',
          acao: status,
          detalhe: recusa ? `Motivo: ${recusa.motivo}` : undefined,
        });

      if (errorLog) console.error('Erro ao registrar log:', errorLog);

      return data;
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

  // Mutation para deletar transferência
  const deleteTransferencia = useMutation({
    mutationFn: async (transferenciaId: string) => {
      const { error } = await supabase
        .from('transferencias')
        .delete()
        .eq('id', transferenciaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transferencias'] });
      toast.success('Transferência excluída!');
    },
    onError: (error: any) => {
      console.error('Erro ao excluir transferência:', error);
      toast.error(error.message || 'Erro ao excluir transferência');
    },
  });

  return {
    transferencias,
    isLoading,
    useTransferencia,
    criarTransferencia,
    atualizarStatus,
    deleteTransferencia,
  };
}
