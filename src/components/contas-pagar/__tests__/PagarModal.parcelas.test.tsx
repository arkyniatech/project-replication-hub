/**
 * Relay 62 — o modal de pagamento nasce vazio e recebe as parcelas depois.
 *
 * PagarParcelas monta o PagarModal desde o início da página, com parcelas=[].
 * `useState(parcelas.map(...))` só roda na primeira montagem, então
 * `parcelasData` ficava permanentemente vazio: ao selecionar parcelas e abrir,
 * `parcelasData[i]` era undefined e o render quebrava com
 * "Cannot read properties of undefined (reading 'valorPago')".
 *
 * Ficou escondido enquanto a tela de Parcelas estava vazia — nunca havia
 * parcela para selecionar. Gravar as parcelas (relay 61) tornou este caminho
 * alcançável pela primeira vez.
 *
 * Mesmo padrão já resolvido no EditarParcelaModal via `parcelaCarregadaId`.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { PagarModal } from '../PagarModal';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-1', nome: 'Loja Teste' } }),
}));

vi.mock('@/hooks/useSupabaseContasFinanceiras', () => ({
  useSupabaseContasFinanceiras: () => ({
    contas: [{ id: 'conta-1', nome: 'Banco Teste' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSupabaseMovimentosPagar', () => ({
  useSupabaseMovimentosPagar: () => ({
    registrarPagamento: { mutateAsync: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn() }) } },
}));

const parcelasFixture = [
  {
    id: 'p1',
    numero_parcela: 1,
    vencimento: '2026-09-10',
    valor: 800,
    pago: 0,
    saldo: 800,
    status: 'ABERTA',
    // o pai (PagarParcelas) já achata fornecedor para string
    fornecedor: 'QA Fornecedor Relay09',
    unidade: 'Loja Teste',
    categoria: 'Manutenção de frota',
    tituloId: 't1',
  },
  {
    id: 'p2',
    numero_parcela: 2,
    vencimento: '2026-10-10',
    valor: 800,
    pago: 0,
    saldo: 800,
    status: 'ABERTA',
    // o pai (PagarParcelas) já achata fornecedor para string
    fornecedor: 'QA Fornecedor Relay09',
    unidade: 'Loja Teste',
    categoria: 'Manutenção de frota',
    tituloId: 't1',
  },
];

function renderizar(props: any) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(PagarModal, props)
    )
  );
}

describe('PagarModal — parcelas chegam depois da montagem (Relay 62)', () => {
  it('renderiza as linhas quando o modal é montado vazio e recebe parcelas depois', () => {
    // Estado real da tela: o modal existe desde o início, fechado e sem dados.
    const { rerender } = renderizar({
      open: false,
      onClose: () => {},
      parcelas: [],
      onSuccess: () => {},
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(PagarModal, {
          open: true,
          onClose: () => {},
          parcelas: parcelasFixture,
          onSuccess: () => {},
        })
      )
    );

    // Antes da correção isto lançava ao renderizar, em vez de falhar a asserção.
    expect(screen.getAllByText(/QA Fornecedor Relay09/).length).toBe(2);
    expect(screen.getAllByDisplayValue('800').length).toBeGreaterThan(0);
  });

  it('reflete a nova seleção quando as parcelas trocam com o modal já aberto', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderizar({
      open: true,
      onClose: () => {},
      parcelas: [parcelasFixture[0]],
      onSuccess: () => {},
    });

    rerender(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(PagarModal, {
          open: true,
          onClose: () => {},
          parcelas: parcelasFixture,
          onSuccess: () => {},
        })
      )
    );

    // Duas parcelas selecionadas => duas linhas de valor.
    expect(screen.getAllByDisplayValue('800').length).toBeGreaterThanOrEqual(2);
  });
});
