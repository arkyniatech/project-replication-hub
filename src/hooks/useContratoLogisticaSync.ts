import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para sincronização automática entre Contratos e Tarefas de Logística
 * 
 * Escuta mudanças na tabela de contratos e cria automaticamente tarefas de logística
 * quando um contrato é criado com status ATIVO
 */
export function useContratoLogisticaSync() {
  const { toast } = useToast();
  const processedContractsRef = useRef(new Set<string>());

  useEffect(() => {
    console.log('[ContratoLogisticaSync] Inicializando sincronização automática...');

    // Processar contratos existentes que ainda não têm tarefa
    const processExistingContratos = async () => {
      try {
        // Buscar contratos ativos sem tarefa de logística associada
        const { data: contratos, error: contratosError } = await supabase
          .from('contratos')
          .select(`
            id,
            numero,
            loja_id,
            cliente_id,
            status,
            data_inicio,
            logistica,
            clientes(nome, razao_social, cpf, cnpj),
            obras(nome, endereco)
          `)
          .eq('status', 'ATIVO')
          .eq('ativo', true);

        if (contratosError) {
          console.error('[ContratoLogisticaSync] Erro ao buscar contratos:', contratosError);
          return;
        }

        if (!contratos || contratos.length === 0) {
          console.log('[ContratoLogisticaSync] Nenhum contrato ativo encontrado');
          return;
        }

        console.log(`[ContratoLogisticaSync] ${contratos.length} contratos ativos encontrados`);

        // Para cada contrato, verificar se já existe tarefa
        for (const contrato of contratos) {
          // Verificar se já existe tarefa para este contrato
          const { data: tarefaExistente } = await supabase
            .from('logistica_tarefas')
            .select('id')
            .eq('contrato_id', contrato.id)
            .maybeSingle();

          if (tarefaExistente) {
            console.log(`[ContratoLogisticaSync] Contrato ${contrato.numero} já possui tarefa`);
            processedContractsRef.current.add(contrato.id);
            continue;
          }

          // Criar tarefa de entrega
          await criarTarefaLogistica(contrato);
          processedContractsRef.current.add(contrato.id);
        }
      } catch (error) {
        console.error('[ContratoLogisticaSync] Erro ao processar contratos existentes:', error);
      }
    };

    // Executar processamento inicial
    processExistingContratos();

    // Configurar listener para novos contratos
    const channel = supabase
      .channel('contratos-logistica-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contratos',
          filter: 'status=eq.ATIVO'
        },
        async (payload) => {
          console.log('[ContratoLogisticaSync] Novo contrato detectado:', payload.new);
          
          const contrato = payload.new as any;
          
          // Evitar processar o mesmo contrato múltiplas vezes
          if (processedContractsRef.current.has(contrato.id)) {
            console.log(`[ContratoLogisticaSync] Contrato ${contrato.numero} já processado`);
            return;
          }

          // Buscar dados completos do contrato com relacionamentos
          const { data: contratoCompleto, error } = await supabase
            .from('contratos')
            .select(`
              id,
              numero,
              loja_id,
              cliente_id,
              status,
              data_inicio,
              logistica,
              clientes(nome, razao_social, cpf, cnpj),
              obras(nome, endereco)
            `)
            .eq('id', contrato.id)
            .single();

          if (error || !contratoCompleto) {
            console.error('[ContratoLogisticaSync] Erro ao buscar contrato completo:', error);
            return;
          }

          // Criar tarefa de logística
          await criarTarefaLogistica(contratoCompleto);
          processedContractsRef.current.add(contrato.id);
        }
      )
      .subscribe();

    console.log('[ContratoLogisticaSync] Listener configurado para novos contratos');

    // Cleanup
    return () => {
      console.log('[ContratoLogisticaSync] Desativando sincronização');
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Cria uma tarefa de logística para um contrato
   */
  const criarTarefaLogistica = async (contrato: any) => {
    try {
      console.log(`[ContratoLogisticaSync] Criando tarefa para contrato ${contrato.numero}`);

      // Extrair dados de logística do contrato
      const logistica = contrato.logistica || {};
      const dataEntrega = logistica.data || contrato.data_inicio;
      const janela = logistica.janela || 'MANHA';
      const horaSugestao = logistica.horaSugestao || (janela === 'MANHA' ? '09:00' : '14:00');

      // Montar timestamp previsto (data + hora)
      const [ano, mes, dia] = dataEntrega.split('-');
      const [hora, minuto] = horaSugestao.split(':');
      const previstoISO = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(hora),
        parseInt(minuto)
      ).toISOString();

      // Determinar nome do cliente
      const cliente = contrato.clientes;
      const clienteNome = cliente?.nome || cliente?.razao_social || 'Cliente';

      // Determinar endereço (usar obra se disponível, senão usar endereço do cliente via logística)
      let endereco = logistica.endereco || {};
      
      // Se houver obra, usar endereço da obra
      if (contrato.obras && contrato.obras.endereco) {
        endereco = contrato.obras.endereco;
      }

      // Preparar dados da tarefa
      const tarefaData = {
        loja_id: contrato.loja_id,
        contrato_id: contrato.id,
        cliente_id: contrato.cliente_id,
        tipo: 'ENTREGA' as const,
        status: 'PROGRAMADO' as const,
        prioridade: 'MEDIA' as const,
        previsto_iso: previstoISO,
        duracao_min: 60, // Duração padrão
        janela: janela,
        endereco: endereco,
        latitude: null,
        longitude: null,
        cliente_nome: clienteNome,
        cliente_telefone: logistica.telefone || null,
        observacoes: logistica.observacoes || null,
      };

      console.log('[ContratoLogisticaSync] Dados da tarefa:', tarefaData);

      // Inserir tarefa
      const { data: tarefa, error } = await supabase
        .from('logistica_tarefas')
        .insert(tarefaData)
        .select()
        .single();

      if (error) {
        console.error('[ContratoLogisticaSync] Erro ao criar tarefa:', error);
        toast({
          title: 'Erro ao criar tarefa de logística',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      console.log(`[ContratoLogisticaSync] Tarefa criada com sucesso:`, tarefa.id);
      
      toast({
        title: 'Tarefa de entrega criada',
        description: `Tarefa de entrega criada para o contrato ${contrato.numero}`,
        duration: 3000,
      });

    } catch (error) {
      console.error('[ContratoLogisticaSync] Erro ao criar tarefa:', error);
      toast({
        title: 'Erro ao criar tarefa de logística',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };
}
