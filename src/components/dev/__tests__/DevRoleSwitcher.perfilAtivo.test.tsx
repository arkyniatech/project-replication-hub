/**
 * RELAY 57 — useRbac.ts:150 tinha fallback fail-open `|| 'vendedor'`. Enquanto
 * o papel ainda não resolvia, o usuário era tratado como vendedor — e o
 * DevRoleSwitcher lia `isLoading` (não `isResolvendoPermissoes`), que no
 * react-query v5 fica false durante a restauração da sessão (query
 * `enabled: !!user?.id`, nunca entra em fetching). Resultado: o rótulo
 * passava direto pelo spinner e mostrava "Vendedor" para qualquer papel,
 * inclusive antes dos dados reais chegarem.
 *
 * Vermelho antes: isLoading=false, isResolvendoPermissoes=true, papel real
 * ainda não chegou -> renderizava "Vendedor". Verde depois: mostra o spinner
 * até resolver, e o papel real depois.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const rbacFixture: {
  perfilAtivo: string;
  isLoading: boolean;
  isResolvendoPermissoes: boolean;
} = {
  perfilAtivo: '',
  isLoading: false,
  isResolvendoPermissoes: true,
};

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => rbacFixture,
}));

import { DevRoleSwitcher } from '../DevRoleSwitcher';

beforeEach(() => {
  rbacFixture.perfilAtivo = '';
  rbacFixture.isLoading = false;
  rbacFixture.isResolvendoPermissoes = true;
});

describe('DevRoleSwitcher não usa isLoading para decidir o que mostrar', () => {
  it('NÃO mostra "Vendedor" enquanto o papel ainda está resolvendo (isLoading=false, isResolvendoPermissoes=true)', () => {
    rbacFixture.perfilAtivo = '';
    rbacFixture.isLoading = false;
    rbacFixture.isResolvendoPermissoes = true;

    render(<DevRoleSwitcher />);

    expect(screen.queryByText('Vendedor')).not.toBeInTheDocument();
  });

  it('mostra o papel real (ex: motorista) depois que os papéis resolvem', () => {
    rbacFixture.perfilAtivo = 'motorista';
    rbacFixture.isLoading = false;
    rbacFixture.isResolvendoPermissoes = false;

    render(<DevRoleSwitcher />);

    expect(screen.getByText('Motorista')).toBeInTheDocument();
    expect(screen.queryByText('Vendedor')).not.toBeInTheDocument();
  });
});
