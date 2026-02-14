import { supabase } from "@/integrations/supabase/client";

interface ItemValidacao {
  equipamentoId: string;
  controle: 'SERIALIZADO' | 'GRUPO';
  quantidade: number;
}

interface Conflito {
  equipamentoId: string;
  nome: string;
  totalSolicitado: number;
  qtdDisponivel: number;
  qtdTotal: number;
}

interface ResultadoValidacao {
  valido: boolean;
  conflitos: Conflito[];
}

/**
 * Valida disponibilidade real consultando diretamente o Supabase
 * para garantir que os dados estão atualizados (após triggers)
 */
export async function validarDisponibilidadeReal(
  itens: ItemValidacao[],
  lojaId: string
): Promise<ResultadoValidacao> {
  // Filtrar apenas itens GRUPO
  const itensGrupo = itens.filter(item => item.controle === 'GRUPO');
  
  if (itensGrupo.length === 0) {
    return { valido: true, conflitos: [] };
  }

  // Agrupar por equipamentoId para somar quantidades totais
  const quantidadesPorEquipamento = itensGrupo.reduce((acc, item) => {
    acc[item.equipamentoId] = (acc[item.equipamentoId] || 0) + item.quantidade;
    return acc;
  }, {} as Record<string, number>);

  const equipamentoIds = Object.keys(quantidadesPorEquipamento);
  
  try {
    // Buscar dados frescos do banco - saldos_por_loja é atualizado pelos triggers
    const { data: equipamentos, error } = await supabase
      .from('equipamentos')
      .select('id, saldos_por_loja, tipo')
      .in('id', equipamentoIds);

    if (error) {
      console.error('Erro ao validar disponibilidade:', error);
      throw error;
    }

    const conflitos: Conflito[] = [];

    for (const equip of equipamentos || []) {
      const totalSolicitado = quantidadesPorEquipamento[equip.id];
      
      // Extrair saldo da loja específica
      const saldoLoja = equip.saldos_por_loja?.[lojaId];
      const qtdDisponivel = saldoLoja?.qtdDisponivel ?? 0;
      const qtdTotal = saldoLoja?.qtd ?? 0;

      console.log('🔍 Validação Real (Supabase):', {
        equipamentoId: equip.id,
        tipo: equip.tipo,
        totalSolicitado,
        qtdDisponivel,
        qtdTotal,
        saldoLoja
      });

      if (totalSolicitado > qtdDisponivel) {
        conflitos.push({
          equipamentoId: equip.id,
          nome: `Equipamento ${equip.tipo || 'SALDO'}`,
          totalSolicitado,
          qtdDisponivel,
          qtdTotal
        });
      }
    }

    return {
      valido: conflitos.length === 0,
      conflitos
    };
  } catch (error) {
    console.error('Erro ao validar disponibilidade:', error);
    // Em caso de erro, retornar como válido para não bloquear (fail-safe)
    // mas logar o erro para investigação
    return { valido: true, conflitos: [] };
  }
}
