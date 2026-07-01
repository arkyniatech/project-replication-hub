/**
 * Utilitários puros de mapeamento de status_global de equipamento
 * entre o valor exibido na UI (form) e o ENUM aceito pelo banco
 * (equipamentos_status_global_check).
 *
 * ENUM válido no DB: DISPONIVEL | RESERVADO | LOCADO | EM_REVISAO
 *                    | MANUTENCAO | EM_TRANSPORTE | INATIVO
 *
 * A UI historicamente usava "BAIXADO" para representar equipamento inativo.
 * Sem esse mapeamento, o UPDATE falha com violação da constraint (Ticket #27).
 */

export type StatusFormUI =
  | 'DISPONIVEL'
  | 'MANUTENCAO'
  | 'RESERVADO'
  | 'BAIXADO'
  | 'LOCADO'
  | 'EM_REVISAO'
  | 'EM_TRANSPORTE'
  | 'INATIVO';

export type StatusDb =
  | 'DISPONIVEL'
  | 'RESERVADO'
  | 'LOCADO'
  | 'EM_REVISAO'
  | 'MANUTENCAO'
  | 'EM_TRANSPORTE'
  | 'INATIVO';

const UI_TO_DB: Partial<Record<StatusFormUI, StatusDb>> = {
  BAIXADO: 'INATIVO',
};

const DB_TO_UI: Partial<Record<StatusDb, StatusFormUI>> = {
  INATIVO: 'BAIXADO',
};

export function statusEquipamentoUiToDb(ui: StatusFormUI): StatusDb {
  return (UI_TO_DB[ui] as StatusDb) || (ui as StatusDb);
}

export function statusEquipamentoDbToUi(db: StatusDb | string): StatusFormUI {
  return (DB_TO_UI[db as StatusDb] as StatusFormUI) || (db as StatusFormUI);
}

/** Ordena uma lista de itens pelo código canônico do equipamento (numérico-aware). */
export function ordenarItensPorCodigo<T extends { equipamento?: { codigo?: string | null } | null }>(
  itens: readonly T[]
): T[] {
  return [...itens].sort((a, b) => {
    const ca = String(a?.equipamento?.codigo ?? '');
    const cb = String(b?.equipamento?.codigo ?? '');
    return ca.localeCompare(cb, 'pt-BR', { numeric: true });
  });
}
