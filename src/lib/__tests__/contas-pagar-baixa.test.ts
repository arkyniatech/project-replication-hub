/**
 * Relay 64 — baixa de parcela e propagação para o título.
 *
 * O caso que originou tudo: 2 movimentos de R$800 gravados, parcelas ABERTA
 * com valor_pago 0, título com pago 0 e saldo 0 num título de R$2.400.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularAbatimento,
  calcularValorLiquido,
  calcularBaixaParcela,
  calcularBaixaTitulo,
  STATUS_QUITADO,
  STATUS_PARCIAL,
} from '../contas-pagar-baixa';

const semEncargos = { juros: 0, multa: 0, desconto: 0 };

describe('baixa da parcela', () => {
  it('pagamento total quita a parcela e grava valor_pago = valor', () => {
    const baixa = calcularBaixaParcela({
      valor: 800,
      valorPagoAtual: 0,
      lancamento: { valorBruto: 800, ...semEncargos },
      dataPagamento: '2026-08-21',
    });

    expect(baixa.status).toBe(STATUS_QUITADO);
    expect(baixa.valor_pago).toBe(800);
    expect(baixa.data_pagamento).toBe('2026-08-21');
  });

  it('pagamento parcial deixa PARCIAL com o valor efetivamente pago', () => {
    const baixa = calcularBaixaParcela({
      valor: 800,
      valorPagoAtual: 0,
      lancamento: { valorBruto: 300, ...semEncargos },
      dataPagamento: '2026-08-21',
    });

    expect(baixa.status).toBe(STATUS_PARCIAL);
    expect(baixa.valor_pago).toBe(300);
  });

  it('pagamentos parciais sucessivos acumulam e o segundo quita', () => {
    const primeira = calcularBaixaParcela({
      valor: 800,
      valorPagoAtual: 0,
      lancamento: { valorBruto: 300, ...semEncargos },
      dataPagamento: '2026-08-21',
    });
    const segunda = calcularBaixaParcela({
      valor: 800,
      valorPagoAtual: primeira.valor_pago,
      lancamento: { valorBruto: 500, ...semEncargos },
      dataPagamento: '2026-08-22',
    });

    expect(primeira.status).toBe(STATUS_PARCIAL);
    expect(segunda.valor_pago).toBe(800);
    expect(segunda.status).toBe(STATUS_QUITADO);
  });
});

describe('regra de abatimento do PR #34', () => {
  it('juros e multa entram no pago mas NAO abatem a divida', () => {
    const lancamento = { valorBruto: 700, juros: 50, multa: 50, desconto: 0 };

    // caixa: saiu 800
    expect(calcularValorLiquido(lancamento)).toBe(800);
    // dívida: abateu só 700
    expect(calcularAbatimento(lancamento)).toBe(700);

    const baixa = calcularBaixaParcela({
      valor: 800,
      valorPagoAtual: 0,
      lancamento,
      dataPagamento: '2026-08-21',
    });

    // pagou 800 de caixa, mas ainda deve 100 — nao pode quitar
    expect(baixa.status).toBe(STATUS_PARCIAL);
    expect(baixa.valor_pago).toBe(800);
  });

  it('desconto abate a divida: baixa total com desconto QUITA', () => {
    // O bug do #34: antes, uma baixa total com desconto ficava PARCIAL com
    // saldo residual igual ao desconto.
    const lancamento = { valorBruto: 750, juros: 0, multa: 0, desconto: 50 };

    expect(calcularAbatimento(lancamento)).toBe(800);
    expect(calcularValorLiquido(lancamento)).toBe(700);

    const baixa = calcularBaixaParcela({
      valor: 800,
      valorPagoAtual: 0,
      lancamento,
      dataPagamento: '2026-08-21',
    });

    expect(baixa.status).toBe(STATUS_QUITADO);
  });
});

describe('propagacao para o titulo', () => {
  it('ultima parcela quitada leva o titulo a QUITADO', () => {
    const titulo = calcularBaixaTitulo({
      valorTitulo: 2400,
      parcelas: [
        { valor: 800, valor_pago: 800 },
        { valor: 800, valor_pago: 800 },
        { valor: 800, valor_pago: 800 },
      ],
    });

    expect(titulo.status).toBe(STATUS_QUITADO);
    expect(titulo.pago).toBe(2400);
    expect(titulo.saldo).toBe(0);
  });

  it('parcela quitada com outras em aberto deixa o titulo PARCIAL', () => {
    // exatamente o estado medido no banco depois dos 2 movimentos de R$800
    const titulo = calcularBaixaTitulo({
      valorTitulo: 2400,
      parcelas: [
        { valor: 800, valor_pago: 800 },
        { valor: 800, valor_pago: 800 },
        { valor: 800, valor_pago: 0 },
      ],
    });

    expect(titulo.status).toBe(STATUS_PARCIAL);
    expect(titulo.pago).toBe(1600);
    expect(titulo.saldo).toBe(800);
  });

  it('titulo nao quita quando o caixa bate mas uma parcela ainda deve', () => {
    // juros numa parcela cobrem o que falta noutra: pago >= valor, mas a
    // divida da parcela 2 continua de pe.
    const titulo = calcularBaixaTitulo({
      valorTitulo: 1600,
      parcelas: [
        { valor: 800, valor_pago: 900 },
        { valor: 800, valor_pago: 700 },
      ],
    });

    expect(titulo.pago).toBe(1600);
    expect(titulo.status).toBe(STATUS_PARCIAL);
  });

  it('saldo nunca fica negativo quando se paga a maior', () => {
    const titulo = calcularBaixaTitulo({
      valorTitulo: 800,
      parcelas: [{ valor: 800, valor_pago: 900 }],
    });

    expect(titulo.saldo).toBe(0);
    expect(titulo.status).toBe(STATUS_QUITADO);
  });

  it('recalculo usa TODAS as parcelas: a lista filtrada da tela subestimaria', () => {
    // A tela filtra por loja/status/periodo. Se o recalculo somasse so o que
    // esta na tela (aqui, a parcela recem-paga), gravaria pago=800 num titulo
    // que ja tinha 1600 pagos — perdendo dinheiro ja baixado.
    const todasAsParcelas = [
      { valor: 800, valor_pago: 800 },
      { valor: 800, valor_pago: 800 },
      { valor: 800, valor_pago: 800 },
    ];
    const apenasAVisivelNaTela = [todasAsParcelas[2]];

    const correto = calcularBaixaTitulo({ valorTitulo: 2400, parcelas: todasAsParcelas });
    const errado = calcularBaixaTitulo({ valorTitulo: 2400, parcelas: apenasAVisivelNaTela });

    expect(correto.pago).toBe(2400);
    expect(correto.status).toBe(STATUS_QUITADO);

    expect(errado.pago).toBe(800);
    expect(errado.pago).not.toBe(correto.pago);
  });

  it('centavos nao deixam saldo residual por float', () => {
    const titulo = calcularBaixaTitulo({
      valorTitulo: 2400,
      parcelas: [
        { valor: 800.1, valor_pago: 800.1 },
        { valor: 799.95, valor_pago: 799.95 },
        { valor: 799.95, valor_pago: 799.95 },
      ],
    });

    expect(titulo.pago).toBe(2400);
    expect(titulo.saldo).toBe(0);
    expect(titulo.status).toBe(STATUS_QUITADO);
  });
});
