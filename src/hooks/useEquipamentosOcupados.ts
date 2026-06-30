import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getEquipamentosOcupadosIds,
  STATUS_CONTRATO_OCUPA_EQUIPAMENTO,
  type ContratoLike,
} from '@/lib/equipamentos-disponibilidade';

/**
 * Returns a `Set` of equipment ids that are currently tied to a contract in
 * AGUARDANDO_ENTREGA or ATIVO status. Used as a safety net so that an
 * equipment whose `status_global` was not properly debited is still hidden
 * from new contract selection / counted as LOCADO in the inventory KPIs.
 *
 * Tickets: #13 (item alugado seguia disponível), #26a (KPI contagem errada).
 */
export function useEquipamentosOcupados(lojaId?: string) {
  return useQuery({
    queryKey: ['equipamentos-ocupados', lojaId],
    queryFn: async (): Promise<Set<string>> => {
      let query = supabase
        .from('contratos')
        .select('id, status, ativo, contrato_itens(equipamento_id, quantidade)')
        .eq('ativo', true)
        .in('status', STATUS_CONTRATO_OCUPA_EQUIPAMENTO);

      if (lojaId) query = query.eq('loja_id', lojaId);

      const { data, error } = await query;
      if (error) {
        console.error('[useEquipamentosOcupados] erro:', error);
        return new Set<string>();
      }
      return getEquipamentosOcupadosIds((data || []) as ContratoLike[]);
    },
  });
}
