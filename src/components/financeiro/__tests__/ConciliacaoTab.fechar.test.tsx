/**
 * O fechamento avisava "sucesso" mesmo quando o banco recusava (Relay 23).
 *
 * `fecharConciliacao` passou a devolver o erro do servidor e a reverter o
 * status local, mas a tela chamava a acao e disparava o toast de sucesso na
 * linha seguinte, sem olhar o resultado. Efeito: o banco recusa, a store
 * reverte para ABERTA, e o operador le "Conciliação fechada com sucesso!" —
 * exatamente a crenca falsa que a correcao da store existia para eliminar.
 * Pior: o toast de erro generico do finWrite aparece junto, e o operador ve
 * duas mensagens contraditorias.
 *
 * Vermelho antes (sucesso incondicional), verde depois (so avisa sucesso
 * quando o servidor aceitou).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Conciliacao, ExtratoLinha, Lancamento, Match } from '@/types/financeiro';

const fecharConciliacaoMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

const CONC_ID = 'conc-1';
const CONTA_ID = 'conta-1';

const conciliacao: Conciliacao = {
  id: CONC_ID,
  lojaId: 'loja-1',
  contaId: CONTA_ID,
  periodo: { ini: '2026-08-01', fim: '2026-08-31' },
  // Saldos batem com a unica linha (D 100): 0 + 0 - 100 = -100. Diferenca
  // zero e zero pendencias sao pre-condicoes do botao Fechar (fica disabled
  // com diferenca > 0.01), entao sem isto o teste nunca chega na acao.
  saldoInicialExtrato: 0,
  saldoFinalExtrato: -100,
  status: 'ABERTA',
  criadoPor: 'user-1',
  criadoEmISO: '2026-08-16T00:00:00.000Z',
};

/** Linha ja pareada: fechar exige zero pendencias e diferenca zero. */
const linhaPareada: ExtratoLinha = {
  id: 'linha-1',
  conciliacaoId: CONC_ID,
  data: '2026-08-16',
  historico: 'QA transferencia enviada',
  valor: 100,
  tipo: 'D',
  pareado: true,
};

const lancDebito: Lancamento = {
  id: 'lanc-1',
  contaId: CONTA_ID,
  lojaId: 'loja-1',
  data: '2026-08-16',
  valor: 100,
  tipo: 'DEBITO',
  origem: 'MANUAL',
  descricao: 'Transferencia enviada',
  createdAtISO: '2026-08-16T00:00:00.000Z',
} as Lancamento;

const matches: Match[] = [
  {
    id: 'match-1',
    conciliacaoId: CONC_ID,
    extratoId: linhaPareada.id,
    lancamentoId: lancDebito.id,
    modo: 'MANUAL',
    criadoEmISO: '2026-08-16T00:00:00.000Z',
  },
];

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
    getLancamentosByConta: () => [lancDebito],
    createConciliacao: () => CONC_ID,
    addExtratoLinhas: vi.fn(),
    createMatch: vi.fn(),
    removeMatch: vi.fn(),
    fecharConciliacao: (...a: any[]) => fecharConciliacaoMock(...a),
    getConciliacaoById: () => conciliacao,
    getExtratoByConc: () => [linhaPareada],
    getMatchesByConc: () => matches,
  }),
}));

import { ConciliacaoTab } from '../ConciliacaoTab';

/** Mesma entrada no workspace do ConciliacaoTab.parearManual.test.tsx. */
function abrirWorkspace() {
  const { container } = render(<ConciliacaoTab />);

  fireEvent.change(container.querySelector('#saldo-inicial')!, { target: { value: '0' } });
  fireEvent.change(container.querySelector('#saldo-final')!, { target: { value: '0' } });

  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: /conta qa/i }));

  fireEvent.click(screen.getByRole('button', { name: /iniciar concilia/i }));
}

function clicarFechar() {
  fireEvent.click(screen.getByRole('button', { name: /fechar concilia/i }));
}

beforeEach(() => {
  fecharConciliacaoMock.mockReset();
  toastErrorMock.mockReset();
  toastSuccessMock.mockReset();
});

describe('ConciliacaoTab — fechamento da conciliacao', () => {
  it('NAO avisa sucesso quando o servidor recusa o fechamento', async () => {
    fecharConciliacaoMock.mockResolvedValue({ message: 'null value in column "loja_id"' });

    abrirWorkspace();
    clicarFechar();

    await waitFor(() => expect(fecharConciliacaoMock).toHaveBeenCalledWith(CONC_ID));
    // Deixa a microtask do await resolver antes de afirmar a ausencia do toast.
    await Promise.resolve();

    await waitFor(() => {
      expect(toastSuccessMock).not.toHaveBeenCalledWith(
        expect.stringMatching(/sucesso/i)
      );
    });
  });

  it('avisa sucesso quando o servidor aceita', async () => {
    fecharConciliacaoMock.mockResolvedValue(null);

    abrirWorkspace();
    clicarFechar();

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith(
        expect.stringMatching(/sucesso/i)
      );
    });
  });
});
