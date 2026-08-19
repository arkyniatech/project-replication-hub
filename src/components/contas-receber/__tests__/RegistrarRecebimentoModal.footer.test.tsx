/**
 * RELAY 54 — item 16.4 (extensão). Mesma causa do NovoAditivoModal,
 * SubstituicaoModal e EmitirFaturaModal: DialogContent acumulava
 * max-h-[90vh] + overflow-y-auto no elemento display:grid que também
 * contém o DialogFooter sticky.
 *
 * Em 1366x768 não reproduz visualmente (formulário curto o bastante), mas
 * em 1366x600 o footer cobre "Valor Líquido"/"Observações" — reproduzido e
 * fotografado. Corrigido preventivamente com a mesma técnica já validada
 * nos outros três modais.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import RegistrarRecebimentoModal from '../RegistrarRecebimentoModal';

vi.mock('@/hooks/useSupabaseTitulos', () => ({
  useSupabaseTitulos: () => ({ updateTitulo: { mutateAsync: vi.fn() } }),
}));
vi.mock('@/hooks/useSupabaseRecebimentos', () => ({
  useSupabaseRecebimentos: () => ({ createRecebimento: { mutateAsync: vi.fn() } }),
}));
vi.mock('@/hooks/useMultiunidade', () => ({
  useMultiunidade: () => ({ lojaAtual: { id: 'loja-1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const tituloFixture = {
  id: 'titulo-1',
  numero: 'TIT-001-000001',
  valor: 1050,
  saldo: 1050,
  cliente: { nome: 'Cliente Teste' },
};

describe('RegistrarRecebimentoModal — footer não sobrepõe o corpo (#16.4)', () => {
  it('DialogContent não acumula overflow-y-auto no mesmo elemento do footer', () => {
    render(
      <RegistrarRecebimentoModal titulo={tituloFixture} open onOpenChange={() => {}} onSuccess={() => {}} />
    );
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const dialogContent = cancelar.closest('[class*="max-h-"]') as HTMLElement;
    expect(dialogContent).not.toBeNull();
    expect(dialogContent.className).not.toMatch(/overflow-y-auto/);
  });

  it('o footer fica fora do wrapper rolável do corpo', () => {
    render(
      <RegistrarRecebimentoModal titulo={tituloFixture} open onOpenChange={() => {}} onSuccess={() => {}} />
    );
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const observacoes = screen.getByLabelText(/^Observações$/i);
    const scrollWrapper = observacoes.closest('.overflow-y-auto');
    expect(scrollWrapper).not.toBeNull();
    expect(scrollWrapper?.contains(cancelar)).toBe(false);
  });
});
