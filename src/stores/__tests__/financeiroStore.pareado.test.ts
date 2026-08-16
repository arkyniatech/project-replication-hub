/**
 * O flag `pareado` nao persistia (Relay 22).
 *
 * O par ia para `fin_matches`, mas `fin_extrato_linhas.pareado` continuava
 * false no banco. Estado real encontrado em producao:
 *
 *   fin_matches:        3 registros
 *   fin_extrato_linhas: 6 linhas, TODAS com pareado = false
 *                       (duas delas COM match)
 *
 * Causa: a escrita usava `.upsert({ id, pareado })` — payload parcial. O upsert
 * do PostgREST e `INSERT ... ON CONFLICT DO UPDATE`, entao o Postgres monta
 * primeiro a linha candidata do INSERT. `fin_extrato_linhas` tem conciliacao_id,
 * data, valor e tipo NOT NULL sem default, entao o INSERT e recusado pela
 * constraint ANTES de a clausula de conflito rodar. A linha existe, o UPDATE
 * nunca acontece. Quarta aparicao do mesmo padrao (ver
 * financeiroStore.cancelarTransfer.test.ts).
 *
 * Consequencia operacional: depois de um F5 o operador ve a linha como nao
 * conciliada, pareia de novo, e cria pareamento duplicado — exatamente o erro
 * que um modulo de conciliacao existe para evitar.
 *
 * Vermelho antes da correcao (chamava upsert com payload parcial), verde depois
 * (.update() com o id, e erro do servidor reverte o otimismo).
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
const LINHA_ID = 'linha-1';
const LANC_ID = 'lanc-1';
const MATCH_ID = 'match-1';

function seedLinha(pareado: boolean) {
  useFinanceiroStore.setState({
    extratoLinhas: [
      {
        id: LINHA_ID,
        conciliacaoId: CONC_ID,
        data: '2026-08-16',
        historico: 'QA transferencia enviada',
        valor: 100,
        tipo: 'D',
        pareado,
      },
    ],
    matches: pareado
      ? [
          {
            id: MATCH_ID,
            conciliacaoId: CONC_ID,
            extratoId: LINHA_ID,
            lancamentoId: LANC_ID,
            modo: 'MANUAL',
            criadoEmISO: '2026-08-16T00:00:00.000Z',
          },
        ]
      : [],
  } as any);
}

/** Roteia por tabela: fin_matches segue como upsert (linha nova, payload completo). */
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

beforeEach(() => {
  fromMock.mockReset();
  updateMock.mockReset();
  upsertMock.mockReset();
  deleteMock.mockReset();
  eqMock.mockReset();
  // A store zustand e global ao modulo e vaza entre testes. Reset explicito:
  // sem isto um teste que semeasse so um dos arrays herdaria os matches do
  // anterior em silencio.
  useFinanceiroStore.setState({ extratoLinhas: [], matches: [] } as any);
});

describe('createMatch — persistencia do flag pareado', () => {
  beforeEach(() => {
    mockSupabase();
    seedLinha(false);
  });

  it('grava pareado=true via .update() com o id, nunca via upsert parcial', async () => {
    useFinanceiroStore.getState().createMatch({
      conciliacaoId: CONC_ID,
      extratoId: LINHA_ID,
      lancamentoId: LANC_ID,
      modo: 'MANUAL',
    });

    await vi.waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: LINHA_ID, pareado: true })
      );
    });
    expect(eqMock).toHaveBeenCalledWith('id', LINHA_ID);
    expect(fromMock).toHaveBeenCalledWith('fin_extrato_linhas');

    // O bug original: `pareado` viajando num upsert de payload parcial.
    const upsertsDeLinha = upsertMock.mock.calls
      .flat()
      .filter((p: any) => p && !Array.isArray(p) && 'pareado' in p);
    expect(upsertsDeLinha).toHaveLength(0);
  });

  it('mantem pareado=true no estado quando o servidor aceita', async () => {
    useFinanceiroStore.getState().createMatch({
      conciliacaoId: CONC_ID,
      extratoId: LINHA_ID,
      lancamentoId: LANC_ID,
      modo: 'MANUAL',
    });

    await vi.waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(true);
  });

  it('reverte o flag otimista quando o servidor rejeita a escrita', async () => {
    eqMock.mockResolvedValue({
      error: { message: 'null value in column "conciliacao_id" violates not-null constraint' },
    });

    useFinanceiroStore.getState().createMatch({
      conciliacaoId: CONC_ID,
      extratoId: LINHA_ID,
      lancamentoId: LANC_ID,
      modo: 'MANUAL',
    });

    expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(true);

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(false);
    });
  });

  /**
   * As duas escritas nao sao atomicas. Desfazer so metade deixaria a linha
   * marcada como conciliada sem match: nao aparece para desparear, o auto-match
   * a ignora por `pareado`, e o fechamento a conta como conferida.
   */
  it('desfaz o par INTEIRO — flag e match — quando so a gravacao do match falha', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'permission denied for fin_matches' } });

    useFinanceiroStore.getState().createMatch({
      conciliacaoId: CONC_ID,
      extratoId: LINHA_ID,
      lancamentoId: LANC_ID,
      modo: 'MANUAL',
    });

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(false);
    });
    expect(useFinanceiroStore.getState().matches).toHaveLength(0);
  });

  it('nao deixa linha marcada como pareada sem match quando so o flag falha', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    useFinanceiroStore.getState().createMatch({
      conciliacaoId: CONC_ID,
      extratoId: LINHA_ID,
      lancamentoId: LANC_ID,
      modo: 'MANUAL',
    });

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().matches).toHaveLength(0);
    });
    expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(false);
  });
});

describe('removeMatch — persistencia do flag pareado', () => {
  beforeEach(() => {
    mockSupabase();
    seedLinha(true);
  });

  it('grava pareado=false via .update() com o id', async () => {
    useFinanceiroStore.getState().removeMatch(MATCH_ID);

    await vi.waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: LINHA_ID, pareado: false })
      );
    });
    expect(eqMock).toHaveBeenCalledWith('id', LINHA_ID);

    const upsertsDeLinha = upsertMock.mock.calls
      .flat()
      .filter((p: any) => p && !Array.isArray(p) && 'pareado' in p);
    expect(upsertsDeLinha).toHaveLength(0);
  });

  it('reverte o despareamento otimista quando o servidor rejeita', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    useFinanceiroStore.getState().removeMatch(MATCH_ID);

    expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(false);

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(true);
    });
  });

  /**
   * O rollback tem que restaurar as DUAS metades. Restaurar so o flag deixa uma
   * linha que se mostra conciliada mas nao tem match: sem botao de desparear,
   * ignorada pelo auto-match, e ainda assim contada como conferida no
   * fechamento — a mesma divergencia escondida do bug original.
   */
  it('restaura o match junto com o flag, sem deixar linha pareada orfa', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } });

    useFinanceiroStore.getState().removeMatch(MATCH_ID);

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(true);
    });
    const { matches } = useFinanceiroStore.getState();
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe(MATCH_ID);
  });

  /**
   * O erro do delete era descartado: o match continuava vivo no servidor com a
   * linha despareada, e depois do F5 o par reaparecia so na coluna de
   * lancamentos — o bug original espelhado.
   */
  it('reverte quando o delete do match falha, mesmo com o flag aceito', async () => {
    deleteMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'permission denied for fin_matches' } }),
    });

    useFinanceiroStore.getState().removeMatch(MATCH_ID);

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().matches).toHaveLength(1);
    });
    expect(useFinanceiroStore.getState().extratoLinhas[0].pareado).toBe(true);
  });

  /**
   * Rollback atrasado x acao mais nova. O operador despareia (delete lento que
   * vai falhar) e repareia a linha com OUTRO lancamento antes do erro chegar.
   * Restaurar o match antigo aqui deixaria dois matches na mesma linha: o resumo
   * conta dois lancamentos pareados para uma linha so e os dois ficam travados
   * no auto-match. Quem manda e a acao mais nova.
   */
  it('nao ressuscita o match antigo se a linha ja foi repareada', async () => {
    let liberarDelete: (v: any) => void;
    deleteMock.mockReturnValue({
      eq: vi.fn().mockReturnValue(new Promise((r) => { liberarDelete = r; })),
    });

    useFinanceiroStore.getState().removeMatch(MATCH_ID);
    expect(useFinanceiroStore.getState().matches).toHaveLength(0);

    // Repareamento da mesma linha com outro lancamento, antes de o erro chegar.
    useFinanceiroStore.getState().createMatch({
      conciliacaoId: CONC_ID,
      extratoId: LINHA_ID,
      lancamentoId: 'lanc-outro',
      modo: 'MANUAL',
    });
    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().matches).toHaveLength(1);
    });

    liberarDelete!({ error: { message: 'permission denied for fin_matches' } });
    await new Promise((r) => setTimeout(r, 30));

    const { matches, extratoLinhas } = useFinanceiroStore.getState();
    expect(matches).toHaveLength(1);
    expect(matches[0].lancamentoId).toBe('lanc-outro');
    expect(matches.some(m => m.id === MATCH_ID)).toBe(false);
    expect(extratoLinhas[0].pareado).toBe(true);
  });
});
