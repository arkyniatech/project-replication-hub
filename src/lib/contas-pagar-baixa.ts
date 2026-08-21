/**
 * Relay 63/64 — baixa de parcela e propagação para o título (contas a pagar).
 *
 * Por que este módulo existe
 * --------------------------
 * A migration original criava um trigger `AFTER INSERT ON movimentos_pagar`
 * que baixava a parcela. A migration 20260407194359_ recriou a tabela
 * `movimentos_pagar` do zero e NÃO recriou o trigger — a função
 * `atualizar_status_parcela` também deixou de existir. Resultado medido no
 * banco: o movimento gravava, o dinheiro saía, e a parcela continuava aberta
 * com valor_pago 0. Na locadora isso faz o fornecedor ser pago duas vezes.
 *
 * A correção é código do cliente, espelhando Contas a Receber
 * (RegistrarRecebimentoModal.tsx:83-124), que é o módulo irmão que funciona e
 * já foi conferido em baixa total e parcial. Não se criou trigger novo: seria
 * um segundo padrão para o mesmo conceito no mesmo sistema, e o trigger
 * original ainda carregava o bug do PR #34 (somava valor_liquido, fazendo
 * juros e multa abaterem a dívida).
 *
 * RISCO CONHECIDO E ACEITO: não há transação. Um insert que passa seguido de
 * um update que falha deixa o mesmo estado inconsistente que originou este
 * relay. Contas a Receber convive com isso hoje; uniformizar o risco vale mais
 * que divergir o mecanismo. Quem chama deve reportar quantas parcelas baixaram
 * de fato quando o loop falha no meio.
 *
 * Vocabulário de status: 'QUITADO' / 'PARCIAL', o mesmo que titulos (receber)
 * já usa para este exato conceito. As colunas são TEXT livre nos dois lados —
 * sem enum e sem CHECK — então a escolha é nossa, e não se inventa um terceiro
 * dicionário. Os estados iniciais ('ABERTA' na parcela, 'EM_EDICAO' no título)
 * pertencem ao fluxo de aprovação e não são tocados aqui.
 */

export const STATUS_QUITADO = 'QUITADO';
export const STATUS_PARCIAL = 'PARCIAL';

/** Tolerância de centavo: numeric(12,2) e float do JS não fecham exato. */
const EPSILON = 0.005;

const numero = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/** Arredonda para centavo, evitando 799.9999999999999 virar saldo residual. */
export const centavos = (v: number): number => Math.round(v * 100) / 100;

export interface LancamentoPagamento {
  valorBruto: number;
  juros: number;
  multa: number;
  desconto: number;
}

/**
 * Quanto o lançamento abate da DÍVIDA.
 *
 * Regra do PR #34: juros e multa entram no caixa mas não reduzem o que se
 * devia; o desconto reduz. Antes dessa correção, uma baixa total com desconto
 * ficava PARCIAL com saldo residual igual ao desconto.
 *
 * ATENÇÃO à diferença de base entre os dois módulos. No Receber a fórmula é
 * `valorLiquido - jurosMulta + desconto` (RegistrarRecebimentoModal.tsx:88)
 * porque lá o valor de partida JÁ INCLUI os encargos, e por isso precisa
 * descontá-los. No Pagar, `valor_bruto` é o principal e os encargos são
 * somados por fora — PagarModal.tsx:92 monta o total como
 * `valorPago + juros + multa - desconto`. Subtrair juros e multa aqui os
 * removeria duas vezes: um pagamento de 700 + 50 juros + 50 multa numa parcela
 * de 800 abateria 600 e a parcela nunca fecharia.
 *
 * A regra é a mesma; muda só de onde se parte.
 */
export function calcularAbatimento(l: LancamentoPagamento): number {
  return centavos(numero(l.valorBruto) + numero(l.desconto));
}

/**
 * Quanto o lançamento acrescenta ao PAGO (base caixa).
 *
 * Assimetria deliberada em relação ao abatimento, replicada do Receber: `pago`
 * mede o que saiu do caixa (logo inclui juros e multa), enquanto o saldo mede
 * o que ainda se deve. As duas bases são diferentes de propósito.
 */
export function calcularValorLiquido(l: LancamentoPagamento): number {
  return centavos(numero(l.valorBruto) + numero(l.juros) + numero(l.multa) - numero(l.desconto));
}

export interface BaixaParcela {
  valor_pago: number;
  data_pagamento: string;
  status: string;
}

/**
 * Estado da parcela após o lançamento.
 *
 * `valorPagoAtual` é o acumulado que já estava gravado — pagamentos parciais
 * sucessivos somam. O status compara o pago acumulado contra o valor da
 * parcela, não contra o lançamento isolado.
 */
export function calcularBaixaParcela({
  valor,
  valorPagoAtual,
  lancamento,
  dataPagamento,
}: {
  valor: number;
  valorPagoAtual: number;
  lancamento: LancamentoPagamento;
  dataPagamento: string;
}): BaixaParcela {
  const novoPago = centavos(numero(valorPagoAtual) + calcularValorLiquido(lancamento));
  const abatido = centavos(numero(valorPagoAtual) + calcularAbatimento(lancamento));

  // Quitação se mede pelo ABATIMENTO, não pelo pago: uma parcela de 800 paga
  // com 50 de juros tem pago 850 mas abateu 800 — está quitada. E uma de 800
  // paga com 700 + 100 de multa tem pago 800 mas abateu 700 — NÃO está.
  return {
    valor_pago: novoPago,
    data_pagamento: dataPagamento,
    status: abatido + EPSILON >= numero(valor) ? STATUS_QUITADO : STATUS_PARCIAL,
  };
}

export interface ParcelaDoTitulo {
  valor: number;
  valor_pago: number;
}

export interface BaixaTitulo {
  pago: number;
  saldo: number;
  status: string;
}

/**
 * Estado do título recalculado a partir de TODAS as suas parcelas.
 *
 * As parcelas têm que vir de uma leitura do banco por titulo_id, nunca da
 * lista já carregada na tela: a tela é filtrada por loja, status e período, e
 * somar o que está filtrado grava um `pago` menor que o real.
 *
 * Nada disto tinha dono antes — o título ficava com pago 0 e saldo 0 num
 * título de 2400, o que é incoerente por si só. O trigger original também
 * nunca cobriu o título; esta parte não tem precedente e é nova.
 */
export function calcularBaixaTitulo({
  valorTitulo,
  parcelas,
}: {
  valorTitulo: number;
  parcelas: ParcelaDoTitulo[];
}): BaixaTitulo {
  const pago = centavos(parcelas.reduce((soma, p) => soma + numero(p.valor_pago), 0));
  const valor = numero(valorTitulo);

  // Nunca negativo: pagamento a maior (juros/multa) não vira saldo negativo,
  // mesma regra que normalizarParcelaPagar já aplica na leitura.
  const saldo = centavos(Math.max(0, valor - pago));

  // Um título só quita quando TODAS as parcelas quitaram. Comparar apenas
  // pago >= valor erraria no título cuja soma de juros de uma parcela cobre o
  // que falta noutra: caixa bate, dívida não.
  const todasQuitadas =
    parcelas.length > 0 &&
    parcelas.every((p) => numero(p.valor_pago) + EPSILON >= numero(p.valor));

  return {
    pago,
    saldo,
    status: todasQuitadas ? STATUS_QUITADO : STATUS_PARCIAL,
  };
}
