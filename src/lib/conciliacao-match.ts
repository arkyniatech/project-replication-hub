/**
 * Regras de pareamento do auto-match da conciliacao (Relay 20).
 *
 * O bug que originou este modulo: o auto-match comparava so valor e data e
 * ignorava a direcao do dinheiro, entao parava uma SAIDA do extrato contra uma
 * ENTRADA do razao —
 *
 *   extrato:    2026-08-16 | D       | R$100 | "QA transferencia enviada"
 *   lancamento: 2026-08-16 | CREDITO | R$100 | "Transferencia recebida..."
 *
 * Num sistema de conciliacao isso e pior que nao parear: o operador da o
 * extrato por conferido e a divergencia real fica escondida atras de um par
 * falso. A informacao para evitar isso ja existia — `fin_extrato_linhas.tipo` e
 * coluna real, preenchida com 'C'/'D' — e estava sendo descartada.
 *
 * CONVENCAO DE SINAL (verificada no codigo, nao assumida)
 * Ambos os lados usam a perspectiva do correntista, nao a visao invertida do
 * razao do banco. C/CREDITO = dinheiro entra, D/DEBITO = dinheiro sai:
 *
 *   extrato   'C' -> '+' verde, soma em totalCreditos   (ConciliacaoTab.tsx)
 *   extrato   'D' -> '-' vermelho, soma em totalDebitos (ConciliacaoTab.tsx)
 *   lancamento 'CREDITO' -> '+' verde, `+valor` no saldo (AccountBalancesSelector.ts)
 *   lancamento 'DEBITO'  -> '-' vermelho, `-valor` no saldo
 *   RPC de transferencia: conta de origem recebe DEBITO, destino recebe CREDITO
 *
 * Nenhum ponto do codigo inverte esse mapeamento, entao D<->DEBITO e
 * C<->CREDITO. Errar essa direcao faria o auto-match parar de parear o que e
 * certo, que e o outro lado do mesmo mal.
 *
 * SOBRE `Math.abs(extrato.valor)`: `valor` guarda so a magnitude — o sinal vive
 * exclusivamente em `tipo`. E o que a renderizacao assume (`tipo === 'C' ? '+'
 * : '-'`, e nao o sinal de `valor`) e o que as somas de saldo assumem (somam
 * `valor` cru dentro de cada balde). O `Math.abs` fica como defesa contra uma
 * linha que por acaso chegue negativa; a direcao agora vem de `tipo`.
 */

import type { ExtratoLinha, Lancamento } from '@/types/financeiro';

/** Tolerancia de centavos na comparacao de valor. */
const TOLERANCIA_VALOR = 0.01;

/** Janela da Regra 2, em dias. */
const JANELA_DIAS = 3;

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * O tipo do lancamento equivalente a cada tipo de linha do extrato.
 * Fonte unica da convencao — se algum dia o banco mudar de perspectiva, muda
 * aqui e os testes pegam o resto.
 */
const EQUIVALENTE: Record<'C' | 'D', Lancamento['tipo']> = {
  C: 'CREDITO',
  D: 'DEBITO',
};

/**
 * Direcao do dinheiro bate entre a linha do extrato e o lancamento?
 *
 * Fail-closed de proposito: tipo ausente, vazio ou desconhecido no extrato
 * devolve `false`. Numa conciliacao, nao parear e um item que sobra visivel na
 * tela; parear errado e uma divergencia que some. Na duvida, nao pareia.
 */
export function tipoCompativel(
  tipoExtrato: ExtratoLinha['tipo'] | null | undefined,
  tipoLancamento: Lancamento['tipo'] | null | undefined,
): boolean {
  if (tipoExtrato !== 'C' && tipoExtrato !== 'D') return false;
  if (tipoLancamento !== 'CREDITO' && tipoLancamento !== 'DEBITO') return false;
  return EQUIVALENTE[tipoExtrato] === tipoLancamento;
}

/** Mesma magnitude, dentro da tolerancia de centavos. */
export function valorCompativel(extrato: ExtratoLinha, lancamento: Lancamento): boolean {
  return Math.abs(lancamento.valor - Math.abs(extrato.valor)) < TOLERANCIA_VALOR;
}

/**
 * Regra 1: mesma direcao, mesmo valor e o doc do extrato aparece no lancamento.
 * So se aplica a linhas que tem `doc`.
 */
export function regra1DocEValor(extrato: ExtratoLinha, lancamento: Lancamento): boolean {
  if (!tipoCompativel(extrato.tipo, lancamento.tipo)) return false;
  if (!valorCompativel(extrato, lancamento)) return false;
  if (!extrato.doc) return false;
  return Boolean(
    lancamento.refId?.includes(extrato.doc) || lancamento.descricao?.includes(extrato.doc),
  );
}

/** Regra 2: mesma direcao, mesmo valor, dentro de +-3 dias. */
export function regra2ValorEData(extrato: ExtratoLinha, lancamento: Lancamento): boolean {
  if (!tipoCompativel(extrato.tipo, lancamento.tipo)) return false;
  if (!valorCompativel(extrato, lancamento)) return false;

  const dataExtrato = new Date(extrato.data).getTime();
  const dataLanc = new Date(lancamento.data).getTime();
  if (Number.isNaN(dataExtrato) || Number.isNaN(dataLanc)) return false;

  return Math.abs(dataExtrato - dataLanc) / MS_POR_DIA <= JANELA_DIAS;
}
