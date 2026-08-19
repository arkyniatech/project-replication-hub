/**
 * RELAY 54 — item 16.4. Em 1366x768, o footer (Cancelar/Criar Aditivo)
 * aparece por cima do campo Descrição, cortando o formulário.
 *
 * Causa: DialogContent acumula max-h-[90vh] + overflow-y-auto no MESMO
 * elemento que é `display: grid` (dialog.tsx) e contém o DialogFooter
 * sticky. O sticky bottom-0 se ancora ao próprio grid container rolável,
 * não ao viewport visível do modal — por isso ele "flutua" no meio do
 * conteúdo em vez de ficar preso embaixo. RenovarContratoModal não tem
 * max-h/overflow no DialogContent e por isso nunca reproduziu.
 *
 * Correção: o scroll sai do DialogContent e vai para um wrapper interno
 * ao redor do corpo — header e footer ficam fora da área rolável, então o
 * footer nunca compete com o sticky do próprio conteúdo.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NovoAditivoModal from '../NovoAditivoModal';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useSupabaseAditivos', () => ({
  useSupabaseAditivos: () => ({
    createAditivo: { mutateAsync: vi.fn() },
    updateAditivo: { mutateAsync: vi.fn() },
  }),
}));

const contrato: any = {
  id: 'c-1',
  numero: '14',
  status: 'ATIVO',
  lojaId: 'loja-1',
  cliente: { nomeRazao: 'Cliente Teste' },
  itens: [],
};

describe('NovoAditivoModal — footer não sobrepõe o corpo (#16.4)', () => {
  it('DialogContent não é o próprio scroll container (overflow não fica na mesma div que o footer)', () => {
    render(
      <NovoAditivoModal contrato={contrato} open onOpenChange={() => {}} onSuccess={() => {}} />
    );
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    // DialogContent é o elemento com role="dialog" — sobe do footer até achá-lo.
    const dialogContent = cancelar.closest('[class*="max-h-"]') as HTMLElement;
    expect(dialogContent).not.toBeNull();
    expect(dialogContent.className).not.toMatch(/overflow-y-auto/);
  });

  it('existe um wrapper interno com o scroll, contendo o corpo do formulário', () => {
    render(
      <NovoAditivoModal contrato={contrato} open onOpenChange={() => {}} onSuccess={() => {}} />
    );
    const descricao = screen.getByLabelText(/Descrição/i);
    const scrollWrapper = descricao.closest('.overflow-y-auto');
    expect(scrollWrapper).not.toBeNull();
  });

  it('o footer (Cancelar/Criar Aditivo) fica fora do wrapper com scroll', () => {
    render(
      <NovoAditivoModal contrato={contrato} open onOpenChange={() => {}} onSuccess={() => {}} />
    );
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    const scrollWrapper = screen.getByLabelText(/Descrição/i).closest('.overflow-y-auto');
    expect(scrollWrapper?.contains(cancelar)).toBe(false);
  });
});
