import { supabase } from '@/integrations/supabase/client';

export async function migrateContractEvents() {
  console.log('[Migration] Iniciando migração de eventos de contratos...');
  
  // 1. Buscar todos contratos ativos
  const { data: contratos } = await supabase
    .from('contratos')
    .select(`
      id,
      numero,
      data_inicio,
      data_fim,
      created_at,
      contrato_itens(equipamento_id)
    `)
    .eq('ativo', true);

  if (!contratos) {
    console.log('[Migration] Nenhum contrato encontrado');
    return { processados: 0, erros: 0 };
  }

  let processados = 0;
  let erros = 0;

  // 2. Para cada contrato, adicionar evento no equipamento
  for (const contrato of contratos) {
    if (!contrato.contrato_itens || contrato.contrato_itens.length === 0) continue;

    for (const item of contrato.contrato_itens) {
      if (!item.equipamento_id) continue;

      try {
        // Buscar histórico atual
        const { data: equip } = await supabase
          .from('equipamentos')
          .select('historico')
          .eq('id', item.equipamento_id)
          .single();

        if (!equip) continue;

        // Criar evento
        const novoEvento = {
          id: crypto.randomUUID(),
          timestamp: contrato.created_at,
          tipo: 'CONTRATO_CRIADO',
          descricao: `Incluído no contrato ${contrato.numero}`,
          usuario: 'Sistema (Migração)',
          meta: {
            contratoId: contrato.id,
            contratoNumero: contrato.numero,
            dataInicio: contrato.data_inicio,
            dataFim: contrato.data_fim,
          }
        };

        // Verificar se já existe
        const historicoAtual = Array.isArray(equip.historico) ? equip.historico : [];
        const jaExiste = historicoAtual.some((e: any) => 
          e.meta?.contratoId === contrato.id && e.tipo === 'CONTRATO_CRIADO'
        );

        if (jaExiste) {
          console.log(`[Migration] Evento já existe para equipamento ${item.equipamento_id}`);
          continue;
        }

        // Adicionar ao histórico
        const historicoAtualizado = [...historicoAtual, novoEvento];

        // Atualizar no banco
        await supabase
          .from('equipamentos')
          .update({ historico: historicoAtualizado })
          .eq('id', item.equipamento_id);

        processados++;
      } catch (error) {
        console.error('[Migration] Erro ao processar equipamento:', error);
        erros++;
      }
    }
  }

  console.log(`[Migration] Concluída: ${processados} eventos criados, ${erros} erros`);
  return { processados, erros };
}
