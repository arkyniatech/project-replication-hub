/**
 * RELAY 54 — item 16.3. MobileNav é o Sheet que substitui a NavRail/
 * NavOverlayPanel (hover-only) abaixo do breakpoint md. Cobre: abre/fecha
 * pelo estado controlado, lista os itens visíveis por padrão, respeita as
 * mesmas regras de permissão do painel desktop e fecha ao navegar (Sheet
 * não deve continuar aberto sobre a página de destino).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileNav } from '../MobileNav';

const canPermissionsMock = vi.fn(() => true);
const canRbacMock = vi.fn(() => true);

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ can: canPermissionsMock }),
}));
vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => ({ can: canRbacMock }),
}));

const renderNav = (open = true, onOpenChange = vi.fn()) => {
  const utils = render(
    <MemoryRouter>
      <MobileNav open={open} onOpenChange={onOpenChange} />
    </MemoryRouter>
  );
  return { ...utils, onOpenChange };
};

describe('MobileNav (#16.3)', () => {
  it('lista os itens principais quando aberto', () => {
    renderNav(true);
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contratos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Equipamentos/i })).toBeInTheDocument();
  });

  it('não renderiza a lista quando fechado', () => {
    renderNav(false);
    expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument();
  });

  it('esconde Equipamentos sem a claim equipamentos:view', () => {
    canRbacMock.mockImplementation((claim: string) => claim !== 'equipamentos:view');
    renderNav(true);
    expect(screen.queryByRole('link', { name: /Equipamentos/i })).not.toBeInTheDocument();
    canRbacMock.mockImplementation(() => true);
  });

  it('fecha ao clicar em um item (navegação)', () => {
    const onOpenChange = vi.fn();
    renderNav(true, onOpenChange);
    fireEvent.click(screen.getByRole('link', { name: /Contratos/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
