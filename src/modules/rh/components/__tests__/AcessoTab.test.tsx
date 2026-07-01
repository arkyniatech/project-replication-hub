/**
 * Prova que a aba de Acesso (RH → Pessoa → Acesso):
 *  1) hidrata os papéis e lojas atuais ao abrir (evita "perder" configs);
 *  2) o botão "Aplicar Senha" chama a edge function `update-user-password`
 *     com o payload correto;
 *  3) "Salvar Alterações" chama updateProfile/updateRoles/updateLojas
 *     com o payload esperado.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Polyfills Radix
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? RO;
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
}

// --- Mocks ------------------------------------------------------------------

const invokeFn = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
const updateProfileMutate = vi.fn().mockResolvedValue(undefined);
const updateRolesMutate = vi.fn().mockResolvedValue(undefined);
const addRolesMutate = vi.fn().mockResolvedValue(undefined);
const updateLojasMutate = vi.fn().mockResolvedValue(undefined);

// Simula supabase.from('user_roles')/('user_lojas_permitidas').select().eq()
function makeFrom(table: string) {
  return {
    select: () => ({
      eq: () =>
        Promise.resolve({
          data:
            table === 'user_roles'
              ? [{ role: 'gestor' }, { role: 'vendedor' }]
              : [{ loja_id: 'loja-1' }, { loja_id: 'loja-2' }],
          error: null,
        }),
    }),
  };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (t: string) => makeFrom(t),
    functions: { invoke: (...args: any[]) => invokeFn(...args) },
  },
}));

vi.mock('../../hooks/useSupabaseUserProfiles', () => ({
  useSupabaseUserProfiles: () => ({
    profiles: [
      {
        id: 'user-1',
        pessoa_id: 'pessoa-1',
        username: 'ana.silva',
        loja_padrao_id: 'loja-1',
        two_fa_enabled: false,
        exige_troca_senha: false,
        ativo: true,
      },
    ],
    updateProfile: { mutateAsync: updateProfileMutate },
  }),
}));
vi.mock('../../hooks/useSupabaseUserRoles', () => ({
  useSupabaseUserRoles: () => ({
    addRoles: { mutateAsync: addRolesMutate },
    updateRoles: { mutateAsync: updateRolesMutate },
  }),
}));
vi.mock('../../hooks/useSupabaseUserLojas', () => ({
  useSupabaseUserLojas: () => ({
    updateLojas: { mutateAsync: updateLojasMutate },
  }),
}));
vi.mock('../../hooks/useSupabaseLojas', () => ({
  useSupabaseLojas: () => ({
    lojas: [
      { id: 'loja-1', nome: 'Matriz', codigo: 'M01' },
      { id: 'loja-2', nome: 'Filial', codigo: 'F01' },
    ],
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { AcessoTab } from '../AcessoTab';

const pessoa = { id: 'pessoa-1', nome: 'Ana Silva' };

describe('AcessoTab', () => {
  beforeEach(() => {
    invokeFn.mockClear();
    updateProfileMutate.mockClear();
    updateRolesMutate.mockClear();
    updateLojasMutate.mockClear();
  });

  it('hidrata roles e lojas atuais do usuário ao carregar', async () => {
    render(<AcessoTab pessoa={pessoa} />);

    // Aguarda hidratação — checkbox de Gestor e Vendedor marcados
    await waitFor(() => {
      const gestorCard = screen.getByText('Gestor').closest('div.p-4');
      expect(gestorCard?.className).toContain('border-primary');
    });
    const vendedorCard = screen.getByText('Vendedor').closest('div.p-4');
    expect(vendedorCard?.className).toContain('border-primary');

    // Matriz + Filial devem estar marcadas como lojas permitidas
    const matrizCard = screen.getByText('Matriz').closest('div.p-3');
    const filialCard = screen.getByText('Filial').closest('div.p-3');
    expect(matrizCard?.className).toContain('border-primary');
    expect(filialCard?.className).toContain('border-primary');
  });

  it('"Aplicar Senha" chama edge function update-user-password com o payload correto', async () => {
    render(<AcessoTab pessoa={pessoa} />);

    // Espera hidratação do userProfile
    await screen.findByText('Definir Senha Temporária');

    // Preenche senha válida
    const input = screen.getByPlaceholderText(/mínimo 8 caracteres/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'SenhaForte123' } });

    fireEvent.click(screen.getByRole('button', { name: /aplicar senha/i }));

    await waitFor(() => expect(invokeFn).toHaveBeenCalledTimes(1));
    const [fnName, fnArgs] = invokeFn.mock.calls[0];
    expect(fnName).toBe('update-user-password');
    expect(fnArgs.body).toEqual({
      user_id: 'user-1',
      password: 'SenhaForte123',
      exige_troca_senha: false,
    });
  });

  it('"Aplicar Senha" rejeita senhas com menos de 8 caracteres (não invoca edge)', async () => {
    render(<AcessoTab pessoa={pessoa} />);
    await screen.findByText('Definir Senha Temporária');

    const input = screen.getByPlaceholderText(/mínimo 8 caracteres/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /aplicar senha/i }));

    // Nada foi invocado
    await new Promise((r) => setTimeout(r, 50));
    expect(invokeFn).not.toHaveBeenCalled();
  });

  it('"Salvar Alterações" propaga profile + roles + lojas para os hooks', async () => {
    render(<AcessoTab pessoa={pessoa} />);

    // Aguarda hidratação
    await waitFor(() => {
      const gestorCard = screen.getByText('Gestor').closest('div.p-4');
      expect(gestorCard?.className).toContain('border-primary');
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(updateProfileMutate).toHaveBeenCalled());
    expect(updateRolesMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      roles: expect.arrayContaining(['gestor', 'vendedor']),
    });
    expect(updateLojasMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      lojaIds: expect.arrayContaining(['loja-1', 'loja-2']),
    });

    const profileArgs = updateProfileMutate.mock.calls[0][0];
    expect(profileArgs.id).toBe('user-1');
    expect(profileArgs.updates).toMatchObject({
      username: 'ana.silva',
      loja_padrao_id: 'loja-1',
    });
  });
});
