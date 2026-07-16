import { supabase } from '@/integrations/supabase/client';

/**
 * Abre uma Ordem de Serviço de manutenção na Área Amarela (triagem pós-locação)
 * para um equipamento, caso ainda não exista uma OS ativa (áreas AMARELA,
 * VERMELHA ou AZUL). Espelha o fluxo de createOS de useSupabaseOrdensServico.
 *
 * Sem esta OS, um equipamento com status_global = 'MANUTENCAO' fica invisível na
 * operação de manutenção (Painel/Áreas/Produtividade), que é orientada por
 * ordens_servico — origem do bug #48 (equipamento em manutenção não atualiza na
 * operação).
 *
 * Retorna o id da OS (nova ou existente) ou null se não foi possível criar.
 * Nunca lança — devolve null em caso de erro para não bloquear o fluxo chamador.
 */
export async function abrirOSManutencao(
  equipamentoId: string,
  lojaId: string | null | undefined,
  contratoId: string | null,
  motivo: string
): Promise<string | null> {
  if (!equipamentoId || !lojaId) return null;

  try {
    // Evita duplicar OS: se já há uma OS ativa (não liberada/baixada), reutiliza.
    const { data: osAbertas } = await supabase
      .from('ordens_servico')
      .select('id')
      .eq('equipamento_id', equipamentoId)
      .in('area_atual', ['AMARELA', 'VERMELHA', 'AZUL'] as any)
      .limit(1);

    if (osAbertas && osAbertas.length > 0) return (osAbertas[0] as any).id;

    // Gera número sequencial da OS (mesma RPC usada por createOS).
    // Cast no nome: a RPC ainda não está nos types gerados.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: numeroOS, error: numeroError } = await (supabase.rpc as any)(
      'gerar_numero_os', { p_loja_id: lojaId }
    );
    if (numeroError) throw numeroError;

    const { data: novaOS, error: insertError } = await supabase
      .from('ordens_servico')
      .insert({
        numero: numeroOS as string,
        equipamento_id: equipamentoId,
        loja_id: lojaId,
        tipo: 'PREVENTIVA',
        origem: 'POS_LOCACAO',
        prioridade: 'MEDIA',
        area_atual: 'AMARELA',
        contrato_id: contratoId,
        timeline: [
          {
            id: crypto.randomUUID(),
            ts: new Date().toISOString(),
            user: 'sistema',
            action: 'OS_CRIADA',
            payload: { origem: 'POS_LOCACAO', motivo },
          },
        ],
      } as any)
      .select('id')
      .single();

    if (insertError) throw insertError;
    return (novaOS as any)?.id ?? null;
  } catch (err) {
    console.error('[abrirOSManutencao] Falha ao abrir OS de manutenção:', err);
    return null;
  }
}
