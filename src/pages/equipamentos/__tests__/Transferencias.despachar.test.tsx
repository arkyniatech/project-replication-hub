/**
 * RELAY 37 — a RPC atualizar_status_transferencia ja implementa a transicao
 * CRIADA -> EM_TRANSITO, mas nenhum botao da tela chamava com esse status:
 * Aceitar/Negar so aparecem quando status ja e EM_TRANSITO, entao toda
 * transferencia criada ficava travada em CRIADA para sempre (RELAY 36, 9.6-9.9).
 *
 * Vermelho antes (sem acao de despacho para status CRIADA), verde depois
 * (botao "Despachar" chama atualizarStatus com EM_TRANSITO e some quando o
 * status ja avancou).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const atualizarStatusMutateAsync = vi.fn().mockResolvedValue(undefined);

const TRANSF_CRIADA = {
  id: 'transf-1',
  numero: 1,
  origem_loja_id: 'loja-1',
  destino_loja_id: 'loja-2',
  status: 'CRIADA',
  motorista: null,
  veiculo: null,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
  origem: { id: 'loja-1', nome: 'Loja QA Origem', codigo: 'QA1' },
  destino: { id: 'loja-2', nome: 'Loja QA Destino', codigo: 'QA2' },
};

const TRANSF_EM_TRANSITO = {
  ...TRANSF_CRIADA,
  id: 'transf-2',
  numero: 2,
  status: 'EM_TRANSITO',
};

let transferenciasFixture: any[] = [];

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => ({ can: () => true }),
}));

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-1', nome: 'Loja QA Origem' } }),
}));

vi.mock('@/hooks/useKeyboardShortcut', () => ({
  useKeyboardShortcut: () => {},
}));

vi.mock('@/hooks/useSupabaseTransferencias', () => ({
  useSupabaseTransferencias: () => ({
    transferencias: transferenciasFixture,
    isLoading: false,
    atualizarStatus: {
      mutateAsync: atualizarStatusMutateAsync,
      isPending: false,
    },
  }),
}));

vi.mock('@/components/transferencias/NovaTransferenciaModal', () => ({
  NovaTransferenciaModal: () => null,
}));
vi.mock('@/components/transferencias/DetalheTransferenciaModal', () => ({
  DetalheTransferenciaModal: () => null,
}));
vi.mock('@/components/transferencias/NegarTransferenciaModal', () => ({
  NegarTransferenciaModal: () => null,
}));
vi.mock('@/components/transferencias/DespachoPDF', () => ({
  DespachoPDF: () => null,
}));

import Transferencias from '../Transferencias';

beforeEach(() => {
  atualizarStatusMutateAsync.mockClear();
  transferenciasFixture = [];
});

describe('Transferencias — despacho de transferencia CRIADA', () => {
  it('oferece a acao de despachar quando a transferencia esta CRIADA e chama a RPC com EM_TRANSITO', async () => {
    transferenciasFixture = [TRANSF_CRIADA];
    render(<Transferencias />);

    // RadixTabs troca de aba no onMouseDown do trigger, nao no onClick.
    const tabEnviadas = screen.getByRole('tab', { name: /enviadas/i });
    fireEvent.mouseDown(tabEnviadas);
    fireEvent.click(tabEnviadas);

    const despacharBtn = await screen.findByRole('button', { name: /despachar/i });
    fireEvent.click(despacharBtn);

    await waitFor(() => {
      expect(atualizarStatusMutateAsync).toHaveBeenCalledWith({
        id: 'transf-1',
        status: 'EM_TRANSITO',
      });
    });
  });

  it('NAO oferece a acao de despachar quando a transferencia ja esta EM_TRANSITO', async () => {
    transferenciasFixture = [TRANSF_EM_TRANSITO];
    render(<Transferencias />);

    const tabEnviadas = screen.getByRole('tab', { name: /enviadas/i });
    fireEvent.mouseDown(tabEnviadas);
    fireEvent.click(tabEnviadas);

    await screen.findByText((_, el) => el?.textContent === '#2');
    expect(screen.queryByRole('button', { name: /despachar/i })).not.toBeInTheDocument();
  });
});
