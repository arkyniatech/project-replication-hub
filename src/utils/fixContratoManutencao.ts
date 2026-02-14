import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

/**
 * Correção automática para equipamentos em MANUTENCAO sem OS ativa.
 * Executa apenas uma vez (controlado por localStorage).
 */
export async function fixEquipamentosSemOS() {
  const FLAG_KEY = 'fix-contrato-manutencao-executed';
  
  // Verificar se já foi executado
  if (localStorage.getItem(FLAG_KEY)) {
    logger.info('[FixManutencao] Correção já executada anteriormente');
    return;
  }

  try {
    logger.info('[FixManutencao] Iniciando correção de equipamentos sem OS...');

    // 1. Buscar equipamentos com status MANUTENCAO
    const { data: equipamentos, error: equipError } = await supabase
      .from('equipamentos')
      .select('id, codigo_interno, loja_atual_id')
      .eq('status_global', 'MANUTENCAO')
      .eq('ativo', true);

    if (equipError) {
      logger.error('[FixManutencao] Erro ao buscar equipamentos:', equipError);
      return;
    }

    if (!equipamentos || equipamentos.length === 0) {
      logger.info('[FixManutencao] Nenhum equipamento em manutenção encontrado');
      localStorage.setItem(FLAG_KEY, 'true');
      return;
    }

    logger.info(`[FixManutencao] ${equipamentos.length} equipamento(s) em manutenção encontrado(s)`);

    let corrigidos = 0;

    for (const equip of equipamentos) {
      // 2. Verificar se já tem OS ativa
      const { data: osExistente } = await supabase
        .from('ordens_servico')
        .select('id')
        .eq('equipamento_id', equip.id)
        .in('status', ['EM_ANALISE', 'EM_REPARO', 'AGUARD_PECA', 'EM_TESTE'])
        .maybeSingle();

      if (osExistente) {
        logger.debug(`[FixManutencao] Equipamento ${equip.codigo_interno} já possui OS ativa`);
        continue;
      }

      // 3. Buscar último contrato_item para esse equipamento
      const { data: ultimoItem } = await supabase
        .from('contrato_itens')
        .select('id, contrato_id, status')
        .eq('equipamento_id', equip.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!ultimoItem) {
        logger.warn(`[FixManutencao] Equipamento ${equip.codigo_interno} sem histórico de contrato`);
        continue;
      }

      // 4. Gerar número da OS usando a RPC
      const { data: numeroOS, error: numeroError } = await supabase
        .rpc('gerar_numero_os', { p_loja_id: equip.loja_atual_id });

      if (numeroError) {
        logger.error(`[FixManutencao] Erro ao gerar número OS para ${equip.codigo_interno}:`, numeroError);
        continue;
      }

      // 5. Criar OS retroativa
      const { error: osError } = await supabase
        .from('ordens_servico')
        .insert({
          numero: numeroOS,
          equipamento_id: equip.id,
          loja_id: equip.loja_atual_id,
          tipo: 'PREVENTIVA',
          origem: 'POS_LOCACAO',
          prioridade: 'MEDIA',
          status: 'EM_ANALISE',
          area_atual: 'AMARELA',
          entrada_area_em: new Date().toISOString(),
          contrato_id: ultimoItem.contrato_id,
          timeline: [{
            ts: new Date().toISOString(),
            tipo: 'OS_CRIADA_RETROATIVA',
            descricao: 'OS criada automaticamente (correção de inconsistência)',
            usuario: 'Sistema',
            meta: { 
              motivo: 'Equipamento em manutenção sem OS ativa',
              contratoId: ultimoItem.contrato_id
            }
          }]
        });

      if (osError) {
        logger.error(`[FixManutencao] Erro ao criar OS para ${equip.codigo_interno}:`, osError);
        continue;
      }

      // 6. Atualizar status do contrato_item para DEVOLVIDO
      const { error: itemError } = await supabase
        .from('contrato_itens')
        .update({ 
          status: 'DEVOLVIDO',
          updated_at: new Date().toISOString()
        })
        .eq('id', ultimoItem.id);

      if (itemError) {
        logger.error(`[FixManutencao] Erro ao atualizar item ${ultimoItem.id}:`, itemError);
      }

      logger.info(`[FixManutencao] ✅ Equipamento ${equip.codigo_interno} corrigido (OS: ${numeroOS})`);
      corrigidos++;
    }

    // 7. Marcar como executado
    localStorage.setItem(FLAG_KEY, 'true');
    logger.info(`[FixManutencao] ✅ Correção concluída. ${corrigidos} equipamento(s) corrigido(s)`);

  } catch (error) {
    logger.error('[FixManutencao] Erro fatal durante correção:', error);
    // Não marcar como executado para tentar novamente
  }
}
