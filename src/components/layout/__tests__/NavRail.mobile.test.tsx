/**
 * RELAY 54 — item 16.3. A NavRail é fixed + w-16 sem NENHUM breakpoint
 * responsivo (nem md:, nem hidden). Em 390x844 ela fica sobre o conteúdo e
 * o AppShell soma um marginLeft incondicional (64px/344px), forçando scroll
 * horizontal em toda tela que usa o AppShell — inclusive Portal do Motorista
 * e Portal RH, desenhadas para celular.
 *
 * Não é a Sidebar do shadcn/ui (não existe no projeto) nem falta de
 * provider — é sidebar própria, hover-only (useNavRail só reage a
 * mouseenter/mouseleave), nunca pensada para telas pequenas.
 *
 * Correção: a rail vira "hidden md:flex" (breakpoint md = 768px, mesmo
 * usado por useIsMobile). Abaixo de md ela não deve renderizar como
 * elemento visível — a navegação mobile passa a vir do MobileNav (Sheet).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavRail } from '../NavRail';

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => ({ can: () => true }),
}));

const renderRail = () =>
  render(
    <MemoryRouter>
      <NavRail
        isExpanded={false}
        isPinned={false}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
        onToggleExpand={() => {}}
        onTogglePin={() => {}}
      />
    </MemoryRouter>
  );

describe('NavRail — some em telas pequenas (#16.3)', () => {
  it('tem a classe "hidden" para sumir abaixo do breakpoint md', () => {
    const { getByLabelText } = renderRail();
    const nav = getByLabelText('Navegação principal');
    expect(nav.className).toMatch(/\bhidden\b/);
  });

  it('reaparece a partir do breakpoint md via "md:flex"', () => {
    const { getByLabelText } = renderRail();
    const nav = getByLabelText('Navegação principal');
    expect(nav.className).toMatch(/\bmd:flex\b/);
  });
});
