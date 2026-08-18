/**
 * RELAY 45 / item 7.5c. O carrinho gravava tipo: 'LOCACAO' em faturas.tipo —
 * vocabulário que pertence a titulos.categoria, não a faturas.tipo. O CHECK da
 * coluna só aceita FISCAL_MOCK/DEMONSTRATIVO, então TODA emissão pelo carrinho
 * violava a constraint 23514 e nada era gravado. Esta é a correção MÍNIMA para
 * destravar a emissão — não escolhe qual tipo de fatura o negócio quer emitir
 * por aqui, só usa o único valor que o sistema hoje sabe produzir de verdade.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Espelha o CHECK de 20260101043357_create_faturas.sql:
//   tipo TEXT NOT NULL CHECK (tipo IN ('FISCAL_MOCK', 'DEMONSTRATIVO'))
const FATURAS_TIPO_VALIDOS = ['FISCAL_MOCK', 'DEMONSTRATIVO'];

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? RO;
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const faturasInsertMock = vi.fn();
const titulosInsertMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'qa@teste.com' } } }) },
    from: (table: string) => {
      if (table === 'faturas') {
        return {
          insert: (payload: any) => {
            faturasInsertMock(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({
                  data: { id: 'fatura-1', numero: 'FAT-001-000099' },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === 'titulos') {
        return {
          insert: (payload: any) => {
            titulosInsertMock(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({
                  data: { id: 'titulo-1', numero: 'TIT-001-000099', valor: 100, vencimento: '2026-09-01', cliente: {} },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`tabela não mockada: ${table}`);
    },
  },
}));

vi.mock('@/stores/faturamentoStore', () => ({
  useFaturamentoStore: () => ({
    lancamentosFaturaveis: [
      {
        id: 'lanc-1',
        selecionado: true,
        clienteId: 'cliente-1',
        clienteNome: 'QA Contrato Wizard',
        contratoId: 'contrato-1',
        contratoNumero: '13',
        itemDescricao: 'Locação',
        quantidade: 1,
        precoUnitario: 100,
        subtotal: 100,
        periodo: '01/08 a 31/08',
      },
    ],
    kpis: { emAtraso: 0 },
    config: { bloqueioInadimplencia: false },
    addException: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-001', nome: 'Águas de Lindóia' } }),
}));
vi.mock('@/hooks/useSupabaseCobrancasInter', () => ({
  useSupabaseCobrancasInter: () => ({ createCobranca: { mutateAsync: vi.fn() } }),
}));

import { FaturamentoCarrinho } from '../FaturamentoCarrinho';

describe('FaturamentoCarrinho — tipo enviado a faturas.tipo', () => {
  beforeEach(() => {
    faturasInsertMock.mockClear();
    titulosInsertMock.mockClear();
  });

  it('grava um valor aceito pelo CHECK de faturas.tipo, não vocabulário de categoria', async () => {
    render(<FaturamentoCarrinho />);

    fireEvent.click(await screen.findByRole('button', { name: /emitir fatura/i }));

    await waitFor(() => expect(faturasInsertMock).toHaveBeenCalled());

    const payload = faturasInsertMock.mock.calls[0][0];
    expect(FATURAS_TIPO_VALIDOS).toContain(payload.tipo);
    // 'LOCACAO' é o valor de titulos.categoria — nunca foi um tipo de fatura válido.
    expect(payload.tipo).not.toBe('LOCACAO');
  });
});
