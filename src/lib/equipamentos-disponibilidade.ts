/**
 * Pure helpers for equipment availability that cross-reference active contracts.
 *
 * Source of truth: an equipment is "ocupado" (unavailable) when either:
 *   1. Its `status_global` is set to a non-DISPONIVEL state (LOCADO, MANUTENCAO,
 *      EM_REVISAO, EM_TRANSPORTE, RESERVADO, INATIVO), OR
 *   2. Its id appears in `contrato_itens` of a contract whose `status` is one
 *      of the "active" states (AGUARDANDO_ENTREGA, ATIVO).
 *
 * The cross-reference exists as a safety net because historically the
 * `equipamentos.status_global` column has been left out of sync (no DB
 * trigger debits it on contract creation/retirada). See tickets #13 / #26.
 */

export type ContratoStatusAtivo = 'AGUARDANDO_ENTREGA' | 'ATIVO';

export const STATUS_CONTRATO_OCUPA_EQUIPAMENTO: ContratoStatusAtivo[] = [
  'AGUARDANDO_ENTREGA',
  'ATIVO',
];

export interface ContratoItemLike {
  equipamento_id: string | null | undefined;
  quantidade?: number | null;
}

export interface ContratoLike {
  status: string;
  ativo?: boolean | null;
  contrato_itens?: ContratoItemLike[] | null;
}

export interface EquipamentoLike {
  id: string;
  tipo?: string | null;
  status_global?: string | null;
}

/**
 * Build a set of SERIALIZADO equipment ids that are tied to any active
 * (AGUARDANDO_ENTREGA / ATIVO) contract. The caller is expected to pre-filter
 * by `ativo === true` if soft-deleted contracts should be ignored.
 */
export function getEquipamentosOcupadosIds(
  contratos: ContratoLike[]
): Set<string> {
  const ocupados = new Set<string>();
  for (const c of contratos) {
    if (c.ativo === false) continue;
    if (!STATUS_CONTRATO_OCUPA_EQUIPAMENTO.includes(c.status as ContratoStatusAtivo)) {
      continue;
    }
    for (const item of c.contrato_itens || []) {
      if (item.equipamento_id) ocupados.add(item.equipamento_id);
    }
  }
  return ocupados;
}

/**
 * Return how many units of a GRUPO equipment are reserved by active contracts.
 */
export function getQuantidadeGrupoOcupada(
  equipamentoId: string,
  contratos: ContratoLike[]
): number {
  let total = 0;
  for (const c of contratos) {
    if (c.ativo === false) continue;
    if (!STATUS_CONTRATO_OCUPA_EQUIPAMENTO.includes(c.status as ContratoStatusAtivo)) continue;
    for (const item of c.contrato_itens || []) {
      if (item.equipamento_id === equipamentoId) {
        total += Number(item.quantidade) || 0;
      }
    }
  }
  return total;
}

/**
 * True when an equipment is effectively available for a NEW contract.
 * Combines the local `status_global` with the active-contracts cross-reference.
 */
export function isEquipamentoDisponivel(
  equipamento: EquipamentoLike,
  ocupados: Set<string>
): boolean {
  if (ocupados.has(equipamento.id)) return false;
  return (equipamento.status_global || '').toUpperCase() === 'DISPONIVEL';
}
