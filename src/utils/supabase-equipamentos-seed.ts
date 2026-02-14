import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Popula o Supabase com equipamentos de exemplo
 * Para ser executado manualmente quando necessário
 */
export async function seedSupabaseEquipamentos() {
  try {
    console.log('🌱 Iniciando seed de equipamentos no Supabase...');

    // 1. Buscar lojas existentes
    const { data: lojas, error: lojasError } = await supabase
      .from('lojas')
      .select('id, nome')
      .eq('ativo', true)
      .limit(2);

    if (lojasError) throw lojasError;
    if (!lojas || lojas.length === 0) {
      toast.error('Nenhuma loja encontrada. Crie ao menos uma loja primeiro.');
      return;
    }

    const loja1 = lojas[0];
    const loja2 = lojas[1] || loja1; // Se só tiver 1 loja, usar a mesma

    console.log('🏢 Lojas encontradas:', lojas.map(l => l.nome));

    // 2. Buscar grupos existentes
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_equipamentos')
      .select('id, nome')
      .eq('ativo', true);

    if (gruposError) throw gruposError;
    if (!grupos || grupos.length === 0) {
      toast.error('Nenhum grupo encontrado. Crie grupos primeiro.');
      return;
    }

    console.log('📦 Grupos encontrados:', grupos.map(g => g.nome));

    // 3. Buscar modelos existentes
    const { data: modelos, error: modelosError } = await supabase
      .from('modelos_equipamentos')
      .select('id, nome_comercial, grupo_id')
      .eq('ativo', true);

    if (modelosError) throw modelosError;
    if (!modelos || modelos.length === 0) {
      toast.error('Nenhum modelo encontrado. Crie modelos primeiro.');
      return;
    }

    console.log('🔧 Modelos encontrados:', modelos.length);

    // 4. Preparar equipamentos de exemplo
    const equipamentosParaCriar = [];

    // Para cada modelo, criar 2-3 equipamentos
    for (const modelo of modelos.slice(0, 5)) { // Limitar a 5 modelos
      // Equipamento 1 - SERIALIZADO - Disponível
      equipamentosParaCriar.push({
        tipo: 'SERIALIZADO',
        grupo_id: modelo.grupo_id,
        modelo_id: modelo.id,
        loja_atual_id: loja1.id,
        status_global: 'DISPONIVEL',
        numero_serie: `SN${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        valor_indenizacao: Math.floor(Math.random() * 50000) + 5000,
        observacoes: `Equipamento em excelente estado - ${modelo.nome_comercial}`,
        ativo: true,
        historico: [{
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          tipo: 'CRIACAO',
          descricao: 'Equipamento cadastrado via seed',
          usuario: 'Sistema',
        }],
      });

      // Equipamento 2 - SERIALIZADO - Locado
      equipamentosParaCriar.push({
        tipo: 'SERIALIZADO',
        grupo_id: modelo.grupo_id,
        modelo_id: modelo.id,
        loja_atual_id: loja2.id,
        status_global: 'LOCADO',
        numero_serie: `SN${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        valor_indenizacao: Math.floor(Math.random() * 50000) + 5000,
        observacoes: 'Equipamento em locação',
        ativo: true,
        historico: [{
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          tipo: 'CRIACAO',
          descricao: 'Equipamento cadastrado via seed',
          usuario: 'Sistema',
        }],
      });

      // Equipamento 3 - SALDO (para alguns modelos)
      if (Math.random() > 0.5) {
        equipamentosParaCriar.push({
          tipo: 'SALDO',
          grupo_id: modelo.grupo_id,
          modelo_id: modelo.id,
          loja_atual_id: loja1.id,
          status_global: 'DISPONIVEL',
          numero_serie: null,
          valor_indenizacao: Math.floor(Math.random() * 10000) + 500,
          saldos_por_loja: {
            [loja1.id]: { qtd: Math.floor(Math.random() * 50) + 10 },
            [loja2.id]: { qtd: Math.floor(Math.random() * 30) + 5 },
          },
          observacoes: `Estoque controlado por quantidade - ${modelo.nome_comercial}`,
          ativo: true,
          historico: [{
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            tipo: 'CRIACAO',
            descricao: 'Equipamento cadastrado via seed',
            usuario: 'Sistema',
          }],
        });
      }
    }

    console.log(`📋 Preparando ${equipamentosParaCriar.length} equipamentos...`);

    // 5. Gerar códigos para cada equipamento
    const equipamentosComCodigo = [];
    for (const eq of equipamentosParaCriar) {
      const { data: codigo, error: codigoError } = await supabase
        .rpc('gerar_codigo_equipamento', {
          p_loja_id: eq.loja_atual_id,
          p_grupo_id: eq.grupo_id,
        });

      if (codigoError) {
        console.error('Erro ao gerar código:', codigoError);
        continue;
      }

      equipamentosComCodigo.push({
        ...eq,
        codigo_interno: codigo,
      });
    }

    // 6. Inserir equipamentos no Supabase
    const { data: equipamentosInseridos, error: insertError } = await supabase
      .from('equipamentos')
      .insert(equipamentosComCodigo)
      .select();

    if (insertError) throw insertError;

    console.log('✅ Seed concluído!', {
      equipamentosCriados: equipamentosInseridos?.length || 0,
    });

    toast.success(`${equipamentosInseridos?.length || 0} equipamentos criados com sucesso!`);
    
    return equipamentosInseridos;
  } catch (error: any) {
    console.error('❌ Erro no seed:', error);
    toast.error(`Erro ao popular equipamentos: ${error.message}`);
    throw error;
  }
}

/**
 * Limpa todos os equipamentos do Supabase
 * CUIDADO: Esta ação é irreversível!
 */
export async function limparEquipamentosSupabase() {
  if (!confirm('⚠️ ATENÇÃO: Isso vai deletar TODOS os equipamentos do banco. Confirma?')) {
    return;
  }

  try {
    console.log('🗑️ Limpando equipamentos...');

    const { error } = await supabase
      .from('equipamentos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (error) throw error;

    console.log('✅ Equipamentos limpos!');
    toast.success('Todos os equipamentos foram removidos');
  } catch (error: any) {
    console.error('❌ Erro ao limpar:', error);
    toast.error(`Erro ao limpar equipamentos: ${error.message}`);
  }
}
