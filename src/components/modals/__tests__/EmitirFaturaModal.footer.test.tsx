/**
 * RELAY 54 — item 16.4 (extensão). Mesma causa do NovoAditivoModal e
 * SubstituicaoModal: DialogContent acumulava max-h-[90vh] + overflow-y-auto
 * no elemento display:grid que também contém o DialogFooter sticky.
 *
 * Em 1366x768 com poucos itens (1-2) o bug não fica visualmente perceptível
 * — o conteúdo já exige scroll (confirmado: scrollHeight > altura visível),
 * mas a margem de overflow é pequena o bastante que o sticky ainda cobre
 * pouco. Em 1366x600 (ou fatura com mais itens em produção) o mesmo footer
 * cobre "Forma Preferida"/"Observações", reproduzido e fotografado.
 * Corrigido preventivamente com a mesma técnica: scroll movido para o
 * wrapper interno do corpo, header/footer fora da área rolável.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import EmitirFaturaModal from '@/components/modals/EmitirFaturaModal';
import type { Contrato } from '@/types';

vi.mock('@/hooks/useSupabaseFaturas', () => ({
  useSupabaseFaturas: () => ({
    createFatura: { mutateAsync: vi.fn() },
  }),
}));
vi.mock('@/hooks/useSupabaseTitulos', () => ({
  useSupabaseTitulos: () => ({
    createTitulo: { mutateAsync: vi.fn() },
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
} as Contrato;

describe('EmitirFaturaModal — footer não sobrepõe o corpo (#16.4)', () => {
  it('DialogContent não acumula overflow-y-auto no mesmo elemento do footer', () => {
    render(
      <EmitirFaturaModal contrato={contratoFixture} open onOpenChange={() => {}} />
    );
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const dialogContent = cancelar.closest('[class*="max-h-"]') as HTMLElement;
    expect(dialogContent).not.toBeNull();
    expect(dialogContent.className).not.toMatch(/overflow-y-auto/);
  });

  it('o footer fica fora do wrapper rolável do corpo', () => {
    render(
      <EmitirFaturaModal contrato={contratoFixture} open onOpenChange={() => {}} />
    );
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const observacoes = screen.getByLabelText(/Observações\/Instruções/i);
    const scrollWrapper = observacoes.closest('.overflow-y-auto');
    expect(scrollWrapper).not.toBeNull();
    expect(scrollWrapper?.contains(cancelar)).toBe(false);
  });
});
