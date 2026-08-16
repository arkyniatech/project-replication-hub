/**
 * Upserts parciais restantes em financeiroStore (Relay 23).
 *
 * Mesmo padrao ja corrigido em cancelarTransfer (Relay 19) e no flag `pareado`
 * (Relay 22): `.upsert({ id, ...alguns_campos })` num registro que JA EXISTE.
 * O upsert do PostgREST e `INSERT ... ON CONFLICT DO UPDATE`, entao o Postgres
 * monta primeiro a linha candidata do INSERT. Se a tabela tem colunas NOT NULL
 * sem default fora do payload, o INSERT e recusado pela constraint ANTES de a
 * clausula de conflito rodar — a linha existe, o UPDATE nunca acontece, e o
 * cliente ja pintou o estado local como se tivesse salvo.
 *
 * Dois sitios sobraram:
 *
 *   fecharConciliacao -> fin_conciliacoes {id, status}
 *       Faltam loja_id, conta_id, periodo_ini, periodo_fim — todos NOT NULL.
 *       E o mais grave: o operador ve o periodo FECHADO na tela e o banco
 *       recusou. Ele acredita ter fechado a conciliacao do mes.
 *
 *   updateConta -> contas_financeiras {id, ...alterados}
 *       Editar so o nome manda {id, nome}; loja_id/codigo/nome sao NOT NULL.
 *
 * Vermelho antes da correcao (upsert com payload parcial, promise descartada),
 * verde depois (.update() com o id, promise aguardada, rollback no erro).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateMock = vi.fn();
const upsertMock = vi.fn();
const deleteMock = vi.fn();
const eqMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useFinanceiroStore } from '../financeiroStore';

const CONC_ID = 'conc-1';
const CONTA_ID = 'conta-1';
const LOJA_ID = 'loja-1';

function mockSupabase() {
  eqMock.mockResolvedValue({ error: null });
  updateMock.mockReturnValue({ eq: eqMock });
  upsertMock.mockResolvedValue({ error: null });
  deleteMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  fromMock.mockReturnValue({
    update: updateMock,
    upsert: upsertMock,
    delete: deleteMock,
  });
}

function seedConciliacao(status: 'ABERTA' | 'FECHADA' = 'ABERTA') {
  useFinanceiroStore.setState({
    conciliacoes: [
      {
        id: CONC_ID,
        lojaId: LOJA_ID,
        contaId: CONTA_ID,
        periodo: { ini: '2026-08-01', fim: '2026-08-31' },
        saldoInicialExtrato: 1000,
        saldoFinalExtrato: 900,
        status,
        criadoPor: 'qa',
        criadoEmISO: '2026-08-16T00:00:00.000Z',
      },
    ],
  } as any);
}

function seedConta(nome = 'Conta Corrente') {
  useFinanceiroStore.setState({
    contas: [
      {
        id: CONTA_ID,
        lojaId: LOJA_ID,
        codigo: 'CC-01',
        nome,
        banco: 'Banco QA',
        agencia: '0001',
        numero: '12345-6',
        moeda: 'BRL',
        saldoAtual: 1000,
        bloqueios: 0,
        ativo: true,
        createdAt: '2026-08-16T00:00:00.000Z',
      },
    ],
  } as any);
}

beforeEach(() => {
  fromMock.mockReset();
  updateMock.mockReset();
  upsertMock.mockReset();
  deleteMock.mockReset();
  eqMock.mockReset();
  // A store zustand e global ao modulo e vaza entre testes.
  useFinanceiroStore.setState({ contas: [], conciliacoes: [] } as any);
  mockSupabase();
});

describe('fecharConciliacao — fechamento de periodo', () => {
  beforeEach(() => seedConciliacao('ABERTA'));

  it('fecha via .update() com o id, nunca via upsert parcial', async () => {
    useFinanceiroStore.getState().fecharConciliacao(CONC_ID);

    await vi.waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: CONC_ID, status: 'FECHADA' })
      );
    });
    expect(eqMock).toHaveBeenCalledWith('id', CONC_ID);
    expect(fromMock).toHaveBeenCalledWith('fin_conciliacoes');

    // O bug: `status` viajando num upsert de payload parcial, sem as colunas
    // NOT NULL (loja_id, conta_id, periodo_ini, periodo_fim).
    const upsertsDeConciliacao = upsertMock.mock.calls
      .flat()
      .filter((p: any) => p && !Array.isArray(p) && 'status' in p);
    expect(upsertsDeConciliacao).toHaveLength(0);
  });

  it('mantem FECHADA no estado quando o servidor aceita', async () => {
    useFinanceiroStore.getState().fecharConciliacao(CONC_ID);

    await vi.waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(useFinanceiroStore.getState().conciliacoes[0].status).toBe('FECHADA');
  });

  /**
   * O ponto central do relay: sem rollback o operador ve o mes fechado na tela
   * enquanto o banco recusou. Ele nao volta para conferir.
   */
  it('reverte para o status anterior quando o servidor rejeita', async () => {
    eqMock.mockResolvedValue({
      error: { message: 'null value in column "loja_id" violates not-null constraint' },
    });

    useFinanceiroStore.getState().fecharConciliacao(CONC_ID);

    expect(useFinanceiroStore.getState().conciliacoes[0].status).toBe('FECHADA');

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().conciliacoes[0].status).toBe('ABERTA');
    });
  });

  it('propaga o erro do servidor para quem chamou', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    const erro = await useFinanceiroStore.getState().fecharConciliacao(CONC_ID);

    expect(erro).toBeTruthy();
  });

  it('resolve sem erro quando o servidor aceita', async () => {
    const erro = await useFinanceiroStore.getState().fecharConciliacao(CONC_ID);

    expect(erro).toBeFalsy();
  });
});

describe('updateConta — edicao de conta financeira', () => {
  beforeEach(() => seedConta('Conta Corrente'));

  it('grava via .update() com o id, nunca via upsert parcial', async () => {
    useFinanceiroStore.getState().updateConta(CONTA_ID, { nome: 'Conta Nova' });

    await vi.waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: CONTA_ID, nome: 'Conta Nova' })
      );
    });
    expect(eqMock).toHaveBeenCalledWith('id', CONTA_ID);
    expect(fromMock).toHaveBeenCalledWith('contas_financeiras');

    const upsertsDeConta = upsertMock.mock.calls
      .flat()
      .filter((p: any) => p && !Array.isArray(p) && 'nome' in p);
    expect(upsertsDeConta).toHaveLength(0);
  });

  it('reverte os campos alterados quando o servidor rejeita', async () => {
    eqMock.mockResolvedValue({
      error: { message: 'null value in column "codigo" violates not-null constraint' },
    });

    useFinanceiroStore.getState().updateConta(CONTA_ID, { nome: 'Conta Nova' });

    expect(useFinanceiroStore.getState().contas[0].nome).toBe('Conta Nova');

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().contas[0].nome).toBe('Conta Corrente');
    });
  });

  /**
   * Rollback tem que restaurar SO o que esta acao mudou. Um snapshot da conta
   * inteira desfaria, junto, uma edicao concorrente de outro campo.
   */
  it('rollback restaura apenas os campos que esta acao alterou', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    useFinanceiroStore.getState().updateConta(CONTA_ID, { nome: 'Conta Nova' });

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().contas[0].nome).toBe('Conta Corrente');
    });
    // saldo nao foi tocado por esta acao — segue intacto
    expect(useFinanceiroStore.getState().contas[0].saldoAtual).toBe(1000);
    expect(useFinanceiroStore.getState().contas[0].banco).toBe('Banco QA');
  });

  it('propaga o erro do servidor para quem chamou', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    const erro = await useFinanceiroStore.getState().updateConta(CONTA_ID, { nome: 'X' });

    expect(erro).toBeTruthy();
  });

  /**
   * `bloqueios` e opcional em Conta e fromContaRow so o define quando a coluna
   * vem non-null. Reverter lendo a chave cega de `anterior` gravaria
   * `bloqueios: undefined` — a conta em cache passa a violar o proprio tipo e
   * qualquer conta que use o campo em aritmetica vira NaN. A chave ausente
   * tem que ser REMOVIDA, nao setada como undefined.
   */
  it('rollback remove a chave que nao existia antes, em vez de grava-la undefined', async () => {
    useFinanceiroStore.setState({
      contas: [
        {
          id: CONTA_ID,
          lojaId: LOJA_ID,
          codigo: 'CC-01',
          nome: 'Conta Corrente',
          banco: 'Banco QA',
          agencia: '0001',
          numero: '12345-6',
          moeda: 'BRL',
          saldoAtual: 1000,
          ativo: true,
          createdAt: '2026-08-16T00:00:00.000Z',
        },
      ],
    } as any);
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    useFinanceiroStore.getState().updateConta(CONTA_ID, { bloqueios: 50 } as any);

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().contas[0].bloqueios).toBeUndefined();
    });
    expect('bloqueios' in useFinanceiroStore.getState().contas[0]).toBe(false);
  });
});

/**
 * updateSaldoConta era codigo MORTO: zero call sites em src/. O saldo e escrito
 * exclusivamente no servidor pelas RPCs fin_efetivar_transferencia e
 * fin_estornar_transferencia (UPDATE contas_financeiras SET saldo_atual).
 * Manter um segundo caminho de escrita de saldo no cliente era um upsert
 * parcial armado esperando o primeiro chamador. Foi removido, nao corrigido.
 */
describe('updateSaldoConta — removido', () => {
  it('nao existe mais na store', () => {
    expect((useFinanceiroStore.getState() as any).updateSaldoConta).toBeUndefined();
  });
});
