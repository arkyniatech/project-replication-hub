/**
 * cancelarTransfer tinha dois bugs juntos:
 *   1) gravava via `.upsert({id, status})` — payload parcial que viola as
 *      colunas NOT NULL de fin_transferencias (loja_id, origem_id, ...) no
 *      branch de INSERT do upsert, então o banco rejeita e a linha continua
 *      PENDENTE.
 *   2) o erro do Supabase era só logado/toast — a UI já tinha aplicado
 *      CANCELADA no estado otimista e nunca revertia.
 *
 * Este teste prova que o estado da store, após a promise da escrita
 * resolver, reflete o que o servidor realmente persistiu — não o estado
 * otimista. Vermelho antes da correção (ficava CANCELADA mesmo com erro
 * simulado do servidor), verde depois (.update() é chamado e falha causa
 * rollback para o status anterior).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateMock = vi.fn();
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

const TRANSFER_ID = 'transfer-1';

function seedPendingTransfer() {
  useFinanceiroStore.setState({
    transferencias: [
      {
        id: TRANSFER_ID,
        lojaId: 'loja-1',
        origemId: 'conta-a',
        destinoId: 'conta-b',
        valor: 50,
        taxa: 0,
        data: '2026-08-15',
        status: 'PENDENTE',
        createdBy: 'user-1',
        createdAtISO: '2026-08-15T00:00:00.000Z',
      },
    ],
  } as any);
}

beforeEach(() => {
  fromMock.mockReset();
  updateMock.mockReset();
  eqMock.mockReset();
  seedPendingTransfer();
});

describe('cancelarTransfer', () => {
  it('persiste CANCELADA via .update() (não .upsert parcial)', async () => {
    eqMock.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock, upsert: vi.fn() });

    useFinanceiroStore.getState().cancelarTransfer(TRANSFER_ID);

    // estado otimista imediato
    expect(useFinanceiroStore.getState().transferencias[0].status).toBe('CANCELADA');

    await vi.waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: TRANSFER_ID, status: 'CANCELADA' })
      );
    });
    expect(eqMock).toHaveBeenCalledWith('id', TRANSFER_ID);

    // após a escrita resolver com sucesso, o estado persistido continua CANCELADA
    expect(useFinanceiroStore.getState().transferencias[0].status).toBe('CANCELADA');
  });

  it('reverte o estado otimista quando o servidor rejeita a escrita', async () => {
    eqMock.mockResolvedValue({ error: { message: 'null value in column "loja_id"' } });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ update: updateMock, upsert: vi.fn() });

    useFinanceiroStore.getState().cancelarTransfer(TRANSFER_ID);

    expect(useFinanceiroStore.getState().transferencias[0].status).toBe('CANCELADA');

    await vi.waitFor(() => {
      expect(useFinanceiroStore.getState().transferencias[0].status).toBe('PENDENTE');
    });
  });
});
