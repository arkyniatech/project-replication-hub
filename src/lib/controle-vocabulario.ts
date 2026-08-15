/**
 * Tradução entre os dois vocabulários de "controle" que convivem no sistema.
 *
 * Existem DOIS vocabulários, e a convivência é deliberada:
 *
 *   - TELA  (view models / componentes): 'SERIALIZADO' | 'SALDO'
 *   - BANCO (contrato_itens.controle):   'SERIE'       | 'GRUPO'
 *
 * O banco impõe o próprio vocabulário via CHECK constraint:
 *   contrato_itens.controle TEXT NOT NULL CHECK (controle IN ('SERIE','GRUPO'))
 *   (supabase/migrations/20260101043343_create_contratos.sql)
 *
 * Este arquivo é o ponto único de tradução na LEITURA. Quem lê uma linha crua
 * de `contrato_itens` deve comparar usando `isControleSerieDB` (vocabulário do
 * banco) ou converter com `controleDBParaTela` antes de alimentar um view
 * model. Comparar um valor vindo do banco contra 'SERIALIZADO' nunca casa.
 *
 * PENDÊNCIA CONHECIDA: a ESCRITA ainda traduz inline em
 * `src/pages/NovoContratoV2.tsx` (~:860). Aquele bloco deveria chamar
 * `controleTelaParaDB`, que é total e nunca devolve valor fora do CHECK —
 * hoje o `else` repassa o valor cru e só falha no INSERT. Migrar em seguida.
 */

/** Vocabulário do banco — valores realmente gravados em contrato_itens.controle. */
export type ControleDB = 'SERIE' | 'GRUPO';

/** Vocabulário de tela — valores usados nos view models e componentes. */
export type ControleTela = 'SERIALIZADO' | 'SALDO';

/**
 * True quando o item é controlado por número de série (item físico e único),
 * aceitando tanto o valor do banco ('SERIE') quanto o de tela ('SERIALIZADO').
 *
 * A tolerância ao valor de tela é intencional: parte do código legado ainda
 * grava/propaga 'SERIALIZADO', e tratá-lo como GRUPO silenciosamente perderia
 * o vínculo com o equipamento físico.
 */
export function isControleSerieDB(controle: string | null | undefined): boolean {
  const v = (controle || '').toUpperCase();
  return v === 'SERIE' || v === 'SERIALIZADO';
}

/** Converte o valor do banco para o vocabulário de tela. */
export function controleDBParaTela(controle: string | null | undefined): ControleTela {
  return isControleSerieDB(controle) ? 'SERIALIZADO' : 'SALDO';
}

/** Converte o valor de tela para o vocabulário do banco. */
export function controleTelaParaDB(controle: string | null | undefined): ControleDB {
  return isControleSerieDB(controle) ? 'SERIE' : 'GRUPO';
}
