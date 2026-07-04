/**
 * Prova que a criação de usuário NÃO envia mais valores rejeitados pelo enum
 * `app_role` do banco (que originava "invalid input value for enum app_role").
 *
 * Estratégia: render integrado do modal com todos os hooks/supabase mockados.
 * Capturamos o body enviado à Edge Function `create-user` (que é quem insere
 * em `user_roles` via service_role) e validamos contra `VALID_APP_ROLES`.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { VALID_APP_ROLES, SELECTABLE_ROLES } from '../../utils/roleMapping';

// jsdom polyfills usados pelos primitivos Radix
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? RO;
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
}

// --- Mocks ------------------------------------------------------------------

const addRolesMutate = vi.fn().mockResolvedValue(undefined);
const addLojasMutate = vi.fn().mockResolvedValue(undefined);
const createProfileMutate = vi.fn().mockResolvedValue(undefined);
const invokeFn = vi.fn().mockResolvedValue({ data: { user_id: 'user-xyz' }, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok_'.padEnd(40, 'x') } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [{ role: 'master' }], error: null }),
        }),
      }),
    }),
    functions: { invoke: (...args: any[]) => invokeFn(...args) },
  },
}));

vi.mock('../../hooks/useSupabaseUserProfiles', () => ({
  useSupabaseUserProfiles: () => ({ createProfile: { mutateAsync: createProfileMutate } }),
}));
vi.mock('../../hooks/useSupabaseUserRoles', () => ({
  useSupabaseUserRoles: () => ({ addRoles: { mutateAsync: addRolesMutate } }),
}));
vi.mock('../../hooks/useSupabaseUserLojas', () => ({
  useSupabaseUserLojas: () => ({ addLojas: { mutateAsync: addLojasMutate } }),
}));
vi.mock('../../hooks/useSupabaseLojas', () => ({
  useSupabaseLojas: () => ({
    lojas: [{ id: 'loja-1', nome: 'Matriz' }],
  }),
}));
vi.mock('@/services/logger', () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { CriarUsuarioModal } from '../CriarUsuarioModal';

const pessoa: any = {
  id: 'p-1',
  nome: 'Ana Silva',
  cpf: '000.000.000-00',
  cargo: 'Vendedor',
  matricula: '123',
};

// O modal usa useQueryClient para invalidar a lista de usuários após criar
function renderModal(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CriarUsuarioModal — payload de roles conforme enum app_role', () => {
  beforeEach(() => {
    addRolesMutate.mockClear();
    addLojasMutate.mockClear();
    invokeFn.mockClear();
  });

  it('submete com perfis válidos (gestor + vendedor) e NÃO envia valores fora do enum', async () => {
    renderModal(<CriarUsuarioModal open onOpenChange={() => {}} pessoa={pessoa} />);

    // Selecionar loja obrigatória
    fireEvent.click(await screen.findByText('Matriz'));

    // Garantir que "Gerente" (→ gestor) e "Vendedor" estão marcados.
    // O cargo "Vendedor" já sugere vendedor via sugerirRolePorCargo.
    // Adicionamos "Gerente" clicando no chip.
    fireEvent.click(screen.getByText('Gerente'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /criar usuário/i }));

    await waitFor(() => expect(invokeFn).toHaveBeenCalled(), { timeout: 3000 });

    // (a) create-user chamado
    const [fnName, fnArgs] = invokeFn.mock.calls[0];
    expect(fnName).toBe('create-user');
    expect(fnArgs.body).toMatchObject({ pessoa_id: 'p-1' });

    // (b) roles enviadas no body da Edge Function pertencem ao enum
    const rolesArg: string[] = fnArgs.body.roles;
    expect(Array.isArray(rolesArg)).toBe(true);
    expect(rolesArg.length).toBeGreaterThan(0);
    for (const r of rolesArg) {
      expect(VALID_APP_ROLES as readonly string[]).toContain(r);
    }
    expect(rolesArg).toEqual(expect.arrayContaining(['gestor', 'vendedor']));

    // (c) nenhum valor FORA do enum (o bug original enviava 'user'/'gerente')
    for (const bad of ['user', 'gerente']) {
      expect(rolesArg).not.toContain(bad);
    }
  });

  it('submete com "Operação" e "Usuário" e envia operacao/usuario (valores válidos)', async () => {
    renderModal(<CriarUsuarioModal open onOpenChange={() => {}} pessoa={{ ...pessoa, cargo: '' }} />);
    fireEvent.click(await screen.findByText('Matriz'));
    fireEvent.click(screen.getByText('Operação'));
    fireEvent.click(screen.getByText('Usuário'));
    fireEvent.click(screen.getByRole('button', { name: /criar usuário/i }));

    await waitFor(() => expect(invokeFn).toHaveBeenCalled(), { timeout: 3000 });
    const rolesArg: string[] = invokeFn.mock.calls[0][1].body.roles;
    expect(rolesArg).toEqual(expect.arrayContaining(['operacao', 'usuario']));
    // jamais os valores errados
    expect(rolesArg).not.toContain('user');
    expect(rolesArg).not.toContain('gerente');
    for (const r of rolesArg) {
      expect(VALID_APP_ROLES as readonly string[]).toContain(r);
    }
  });

  it('todos os chips selecionáveis do modal pertencem ao enum app_role', () => {
    for (const chip of SELECTABLE_ROLES) {
      expect(VALID_APP_ROLES as readonly string[]).toContain(chip.value);
    }
  });
});
