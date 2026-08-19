/**
 * RELAY 54 — os `|| '1'` restantes. Quarta vez que corrigimos esta família.
 *
 * `lojaAtual?.id || '1'` inventa um id quando não há loja ativa. loja_id é
 * uuid no banco, então o literal '1' nunca chegou a gravar: o Postgres recusa
 * com 22P02 antes. As medições confirmam que NADA foi corrompido —
 * contratos/titulos/fin_transferencias/aditivos com loja_id = '1': zero.
 * A correção é preventiva, não reparo. Mas o usuário hoje vê erro (ou lista
 * vazia) sem entender por quê, e é isso que muda aqui.
 *
 * Regra da casa, já aplicada em SolicitacoesManutencao e NovaTransferenciaModal:
 * usar useMultiunidade e BLOQUEAR com aviso quando não houver loja — nunca
 * inventar id.
 *
 * Vermelho antes (consulta com '1'), verde depois (aviso, sem consulta).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const getTransfersByLoja = vi.fn();
const getContasByLoja = vi.fn();
let lojaAtualFixture: { id: string; nome: string } | null = { id: 'loja-a-uuid', nome: 'Loja A' };

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: lojaAtualFixture }),
}));

vi.mock('@/stores/financeiroStore', () => ({
  useFinanceiroStore: () => ({
    getTransfersByLoja,
    getContasByLoja,
    efetivarTransfer: vi.fn(),
    cancelarTransfer: vi.fn(),
    estornarTransfer: vi.fn(),
  }),
}));

vi.mock('../NovaTransferenciaModal', () => ({
  NovaTransferenciaModal: () => null,
}));

import { TransferenciasTab } from '../TransferenciasTab';

beforeEach(() => {
  getTransfersByLoja.mockReset().mockReturnValue([]);
  getContasByLoja.mockReset().mockReturnValue([]);
  lojaAtualFixture = { id: 'loja-a-uuid', nome: 'Loja A' };
});

describe("TransferenciasTab — loja ativa real, sem fallback '1'", () => {
  it('consulta usando o uuid da loja ativa', () => {
    render(<TransferenciasTab />);

    expect(getTransfersByLoja).toHaveBeenCalledWith('loja-a-uuid');
    expect(getContasByLoja).toHaveBeenCalledWith('loja-a-uuid');
  });

  it("nunca consulta com o literal '1'", () => {
    lojaAtualFixture = null;
    render(<TransferenciasTab />);

    const usouLiteral = getTransfersByLoja.mock.calls.some(([id]) => id === '1');
    expect(usouLiteral).toBe(false);
  });

  it('bloqueia com aviso quando não há loja ativa, em vez de inventar id', () => {
    lojaAtualFixture = null;
    render(<TransferenciasTab />);

    expect(screen.getByText(/selecione uma loja/i)).toBeInTheDocument();
  });
});
