import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import EmitirFaturaModal from '@/components/modals/EmitirFaturaModal';
import type { Contrato } from '@/types';

// Colunas reais de public.titulos (conferidas no banco vivo — ver RELAY 28).
// Não existe 'descricao' como coluna top-level; só dentro de 'timeline' (jsonb).
const TITULOS_COLUNAS_VALIDAS = [
  'id', 'numero', 'loja_id', 'cliente_id', 'contrato_id', 'fatura_id', 'aditivo_id',
  'categoria', 'subcategoria', 'emissao', 'vencimento', 'valor', 'pago', 'saldo',
  'forma', 'status', 'origem', 'timeline', 'observacoes', 'created_at', 'updated_at',
];

const createTituloMutateAsync = vi.fn().mockResolvedValue({ id: 'titulo-1', numero: 'TIT-001-000001' });
const createFaturaMutateAsync = vi.fn().mockResolvedValue({ id: 'fatura-1', numero: 'FAT-001-000001' });

vi.mock('@/hooks/useSupabaseFaturas', () => ({
  useSupabaseFaturas: () => ({
    createFatura: { mutateAsync: createFaturaMutateAsync },
  }),
}));

vi.mock('@/hooks/useSupabaseTitulos', () => ({
  useSupabaseTitulos: () => ({
    createTitulo: { mutateAsync: createTituloMutateAsync },
    titulos: [],
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const contratoFixture: Contrato = {
  id: 1,
  lojaId: 'loja-1',
  numero: '1',
  clienteId: 'cliente-1',
  cliente: {
    id: 'cliente-1',
    lojaId: 'loja-1',
    tipo: 'PF',
    nome: 'Diego Hora',
    nomeRazao: 'Diego Hora',
  } as Contrato['cliente'],
  itens: [
    {
      id: 'item-1',
      equipamento: { descricao: 'Modelo Teste' },
      quantidade: 1,
      periodo: 'diario',
      valorUnitario: 100,
      valorTotal: 100,
    } as unknown as Contrato['itens'][number],
  ],
  entrega: { data: '2026-04-09', janela: 'MANHA' },
  condicoes: { confirmacoes: [] },
  pagamento: { forma: 'PIX', vencimentoISO: '2026-09-15' },
  status: 'ATIVO',
  rascunho: false,
  timeline: [],
  valorTotal: 100,
  dataInicio: '2026-04-09',
  dataFim: '2026-04-10',
  formaPagamento: 'PIX',
  createdAt: '2026-04-09T00:00:00.000Z',
  updatedAt: '2026-04-09T00:00:00.000Z',
};

beforeEach(() => {
  createTituloMutateAsync.mockClear();
  createFaturaMutateAsync.mockClear();
});

describe('EmitirFaturaModal — payload do insert em titulos', () => {
  it('só envia colunas que existem em public.titulos', async () => {
    render(
      <EmitirFaturaModal
        contrato={contratoFixture}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Emitir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Emitir fatura' }));

    await waitFor(() => expect(createTituloMutateAsync).toHaveBeenCalledTimes(1));

    const payload = createTituloMutateAsync.mock.calls[0][0];
    const colunasInvalidas = Object.keys(payload).filter(
      (chave) => !TITULOS_COLUNAS_VALIDAS.includes(chave)
    );

    expect(colunasInvalidas).toEqual([]);
  });
});
