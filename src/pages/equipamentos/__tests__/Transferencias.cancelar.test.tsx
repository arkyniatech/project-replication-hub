/**
 * RELAY 39 — o botão "Cancelar" era código morto que só sabia errar.
 *
 * Ele só renderizava quando o status era RECUSADA, mas RECUSADA é estado
 * TERMINAL na atualizar_status_transferencia: a RPC recusa a transição com
 * "Transferência já está RECUSADA — transição para CANCELADA inválida"
 * (verificado ao vivo no RELAY 37). Ou seja, o botão aparecia no único estado
 * a partir do qual sua própria ação é rejeitada — e CRIADA/EM_TRANSITO, os
 * estados em que cancelar faz sentido e que a RPC aceita, não tinham botão
 * nenhum. Não havia caminho de UI para CANCELADA (item 9.7, BLOQUEADO).
 *
 * Vermelho antes (Cancelar ausente em CRIADA/EM_TRANSITO e presente em
 * RECUSADA), verde depois.
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

const TRANSF_EM_TRANSITO = { ...TRANSF_CRIADA, id: 'transf-2', numero: 2, status: 'EM_TRANSITO' };
const TRANSF_RECUSADA = { ...TRANSF_CRIADA, id: 'transf-3', numero: 3, status: 'RECUSADA' };

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

/** RadixTabs troca de aba no onMouseDown do trigger, não no onClick. */
function abrirEnviadas() {
  const tab = screen.getByRole('tab', { name: /enviadas/i });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
}

beforeEach(() => {
  atualizarStatusMutateAsync.mockClear();
  transferenciasFixture = [];
});

describe('Transferencias — cancelamento nos estados que a RPC aceita', () => {
  it('oferece Cancelar em CRIADA e chama a RPC com CANCELADA', async () => {
    transferenciasFixture = [TRANSF_CRIADA];
    render(<Transferencias />);
    abrirEnviadas();

    fireEvent.click(await screen.findByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(atualizarStatusMutateAsync).toHaveBeenCalledWith({
        id: 'transf-1',
        status: 'CANCELADA',
      });
    });
  });

  it('oferece Cancelar em EM_TRANSITO e chama a RPC com CANCELADA', async () => {
    transferenciasFixture = [TRANSF_EM_TRANSITO];
    render(<Transferencias />);
    abrirEnviadas();

    fireEvent.click(await screen.findByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(atualizarStatusMutateAsync).toHaveBeenCalledWith({
        id: 'transf-2',
        status: 'CANCELADA',
      });
    });
  });

  it('NÃO oferece Cancelar em RECUSADA, que é estado terminal na RPC', async () => {
    transferenciasFixture = [TRANSF_RECUSADA];
    render(<Transferencias />);
    abrirEnviadas();

    // A RECUSADA aparece em Enviadas (pendentesEnviadas inclui RECUSADA).
    // Ancorar na linha garante que a ausência do botão é real, e não efeito
    // de a transferência simplesmente não ter renderizado.
    await screen.findByText((_, el) => el?.textContent === '#3');

    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    expect(atualizarStatusMutateAsync).not.toHaveBeenCalled();
  });
});
