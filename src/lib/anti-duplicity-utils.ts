/**
 * Configuração de anti-duplicidade de contas a pagar.
 *
 * RELAY 70 — O QUE SAIU DAQUI, E POR QUÊ
 * Este arquivo era o motor da proteção anti-duplicidade. Ele nunca funcionou:
 * `updateDupIndex` estava importado no NovoTituloDrawer e jamais era chamado,
 * e `localStorage['titulosPagar']` — a lista que o `dupSearch` percorria para
 * comparar — nunca era escrita por nenhum código do repositório. A busca rodava
 * sobre um índice vazio contra uma lista vazia e devolvia `[]` sempre.
 *
 * Removidos:
 *
 * - `dupSearch` -> virou consulta ao banco em `anti-duplicidade-consulta.ts`.
 * - `buildFingerprints` / `simpleHash` -> o hash era de 32 bits, com colisão
 *   trivial, e o próprio comentário o chamava de "simulação de SHA1". Com o
 *   índice no banco não há motivo para hash: indexa-se o valor normalizado,
 *   que ainda permite mostrar QUAL título colidiu.
 * - `getDupIndex` / `addToIndex` / `removeFromIndex` / `updateDupIndex` -> o
 *   índice manual em localStorage inteiro. O banco já sabe indexar; manter um
 *   índice paralelo é sustentar duas fontes de verdade que divergem no
 *   primeiro `Ctrl+Shift+Del`.
 * - `canForceDuplicity` -> a alçada por valor que autorizava o "Forçar Mesmo
 *   Assim". Devolvia `true` incondicional para admin e lia o perfil como
 *   string solta, fora do useRbac. Com UNIQUE duro no banco o escape deixou de
 *   existir de fato, e um botão que promete o que a constraint não permite é
 *   pior que botão nenhum.
 * - `calculateSimilarity` (Levenshtein) -> só servia ao `fuzzyMatching`, que
 *   já vinha desligado no default e continua fora de escopo.
 * - o flag `crossLoja` -> nunca foi lido em lugar nenhum, e a intenção original
 *   (`true` no default) já era checagem global. Removido em vez de
 *   implementado: opção que desliga a proteção mais valiosa do módulo é opção
 *   que alguém desliga por engano.
 *
 * O que sobrou aqui é configuração de mensagens e de quais regras exibir.
 * A normalização mudou de casa: vive em `anti-duplicidade.ts`, junto do teste
 * que a compara com a normalização do SQL.
 */
import { AntiDuplicityConfig } from '@/types';

// Re-exportadas do novo módulo para não quebrar quem já importava daqui. A
// implementação é uma só — divergir as duas seria reintroduzir exatamente o
// problema que o relay 70 fecha.
export { normalizeDocNumber, normalizeFiscalKey } from './anti-duplicidade';

/** Configuração padrão. */
export function getDefaultAntiDuplicityConfig(): AntiDuplicityConfig {
  return {
    habilitado: true,
    regras: {
      chaveFiscal: true,
      docNumeroValor: true,
      checagemForte: true,
      fuzzyMatching: false,
    },
    politica: {
      alertas: 'avisar',
    },
    limites: {
      financeiro: 5000,
      gestor: 20000,
      admin: Infinity,
    },
    mensagens: {
      bloqueante:
        'Esta nota já foi lançada. O sistema não permite gravar o mesmo documento duas vezes.',
      alerta: 'Encontrados títulos similares. Recomenda-se revisão para evitar duplicidade.',
      info: 'Títulos com características parecidas encontrados para referência.',
    },
  };
}

/** Configuração salva, ou o padrão. */
export function getAntiDuplicityConfig(): AntiDuplicityConfig {
  const config = JSON.parse(localStorage.getItem('config') || '{}');
  return config.financeiro?.antiDuplicidade || getDefaultAntiDuplicityConfig();
}
