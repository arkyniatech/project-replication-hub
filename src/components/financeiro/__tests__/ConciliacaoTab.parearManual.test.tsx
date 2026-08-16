/**
 * Pareamento manual nao validava a direcao do dinheiro (Relay 22).
 *
 * O Relay 20 fechou o auto-match com `tipoCompativel`, mas `parearManual`
 * chamava `createMatch` direto. Na tela dava para selecionar uma linha D (saida)
 * e clicar num lancamento CREDITO (entrada) — o par falso que o Relay 20 existiu
 * para impedir, pela porta ao lado.
 *
 * DECISAO: bloquear, nao avisar. Conciliacao errada feita a mao da o mesmo
 * prejuizo que feita automaticamente, e nao ha caso legitimo de conciliar saida
 * contra entrada (verificado: nenhum fluxo de estorno pareia tipos opostos).
 *
 * Este teste exercita a regra na fronteira que o operador toca — o clique no
 * card do lancamento — e nao so a funcao pura, que ja tem cobertura em
 * lib/__tests__/conciliacao-match.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Conciliacao, ExtratoLinha, Lancamento, Match } from '@/types/financeiro';

const createMatchMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

const CONC_ID = 'conc-1';
const CONTA_ID = 'conta-1';

const conciliacao: Conciliacao = {
  id: CONC_ID,
  lojaId: 'loja-1',
  contaId: CONTA_ID,
  periodo: { ini: '2026-08-01', fim: '2026-08-31' },
  saldoInicialExtrato: 0,
  saldoFinalExtrato: 0,
  status: 'ABERTA',
  criadoPor: 'user-1',
  criadoEmISO: '2026-08-16T00:00:00.000Z',
};

/** Uma saida (D) e uma entrada (C), mesmo valor e data. */
const linhaDebito: ExtratoLinha = {
  id: 'linha-D',
  conciliacaoId: CONC_ID,
  data: '2026-08-16',
  historico: 'QA transferencia enviada',
  valor: 100,
  tipo: 'D',
  pareado: false,
};

const linhaCredito: ExtratoLinha = {
  ...linhaDebito,
  id: 'linha-C',
  historico: 'QA transferencia recebida',
  tipo: 'C',
};

const lancCredito: Lancamento = {
  id: 'lanc-CREDITO',
  contaId: CONTA_ID,
  lojaId: 'loja-1',
  data: '2026-08-16',
  valor: 100,
  tipo: 'CREDITO',
  origem: 'MANUAL',
  descricao: 'Transferencia recebida',
  createdAtISO: '2026-08-16T00:00:00.000Z',
} as Lancamento;

const lancDebito: Lancamento = {
  ...lancCredito,
  id: 'lanc-DEBITO',
  tipo: 'DEBITO',
  descricao: 'Transferencia enviada',
};

let extratoLinhas: ExtratoLinha[] = [];
let lancamentos: Lancamento[] = [];
const matches: Match[] = [];

vi.mock('sonner', () => ({
  toast: {
    error: (...a: any[]) => toastErrorMock(...a),
    success: (...a: any[]) => toastSuccessMock(...a),
  },
}));

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-1', nome: 'Loja QA' } }),
}));

vi.mock('@/stores/financeiroStore', () => ({
  useFinanceiroStore: () => ({
    getContasByLoja: () => [{ id: CONTA_ID, lojaId: 'loja-1', nome: 'Conta QA' }],
    getLancamentosByConta: () => lancamentos,
    createConciliacao: () => CONC_ID,
    addExtratoLinhas: vi.fn(),
    createMatch: (...a: any[]) => createMatchMock(...a),
    removeMatch: vi.fn(),
    fecharConciliacao: vi.fn(),
    getConciliacaoById: () => conciliacao,
    getExtratoByConc: () => extratoLinhas,
    getMatchesByConc: () => matches,
  }),
}));

import { ConciliacaoTab } from '../ConciliacaoTab';

/**
 * A tela so entra no workspace apos iniciar a conciliacao, e iniciar exige
 * conta + os dois saldos preenchidos (ConciliacaoTab.tsx:96). Preenche o
 * formulario como o operador faria e entra nas duas colunas de pareamento.
 */
function abrirWorkspace() {
  const { container } = render(<ConciliacaoTab />);

  fireEvent.change(container.querySelector('#saldo-inicial')!, { target: { value: '0' } });
  fireEvent.change(container.querySelector('#saldo-final')!, { target: { value: '0' } });

  // O Select do Radix nao abre em jsdom; a conta e escolhida direto no estado
  // do formulario pelo primeiro (e unico) item disponivel.
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: /conta qa/i }));

  fireEvent.click(screen.getByRole('button', { name: /iniciar concilia/i }));
}

function selecionarLinha(historico: string) {
  fireEvent.click(screen.getByText(historico).closest('[role="button"]')!);
}

function clicarLancamento(descricao: string) {
  fireEvent.click(screen.getByText(descricao).closest('[role="button"]')!);
}

beforeEach(() => {
  createMatchMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
  extratoLinhas = [linhaDebito];
  lancamentos = [lancCredito];
});

describe('parearManual — validacao de tipo', () => {
  it('BLOQUEIA parear linha D (saida) com lancamento CREDITO (entrada)', () => {
    abrirWorkspace();
    selecionarLinha(linhaDebito.historico);
    clicarLancamento(lancCredito.descricao!);

    expect(createMatchMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/pareamento manual criado/i)
    );
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it('BLOQUEIA parear linha C (entrada) com lancamento DEBITO (saida)', () => {
    extratoLinhas = [linhaCredito];
    lancamentos = [lancDebito];

    abrirWorkspace();
    selecionarLinha(linhaCredito.historico);
    clicarLancamento(lancDebito.descricao!);

    expect(createMatchMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it('PERMITE parear linha D (saida) com lancamento DEBITO (saida)', () => {
    lancamentos = [lancDebito];

    abrirWorkspace();
    selecionarLinha(linhaDebito.historico);
    clicarLancamento(lancDebito.descricao!);

    expect(createMatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conciliacaoId: CONC_ID,
        extratoId: linhaDebito.id,
        lancamentoId: lancDebito.id,
        modo: 'MANUAL',
      })
    );
  });

  it('PERMITE parear linha C (entrada) com lancamento CREDITO (entrada)', () => {
    extratoLinhas = [linhaCredito];

    abrirWorkspace();
    selecionarLinha(linhaCredito.historico);
    clicarLancamento(lancCredito.descricao!);

    expect(createMatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extratoId: linhaCredito.id,
        lancamentoId: lancCredito.id,
        modo: 'MANUAL',
      })
    );
  });
});
