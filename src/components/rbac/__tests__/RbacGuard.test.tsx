import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { RbacGuard, RbacButton, withRbac } from '@/components/rbac/RbacGuard';
import type { Claim } from '@/modules/rh/rbac/claims';

// Mocka o hook que controla as permissões. Os testes injetam o conjunto de
// claims ativas via setMockClaims(...) e validamos o comportamento dos
// componentes consumidores sem tocar em Supabase / AuthContext.
let mockClaims: Claim[] = [];

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => ({
    can: (claim: Claim) => mockClaims.includes(claim),
    anyOf: (claims: Claim[]) => claims.some((c) => mockClaims.includes(c)),
    allOf: (claims: Claim[]) => claims.every((c) => mockClaims.includes(c)),
    perfilAtivo: 'admin',
    claimsAtivas: mockClaims,
    isLoading: false,
  }),
}));

function setMockClaims(claims: Claim[]) {
  mockClaims = claims;
}

describe('RbacGuard', () => {
  beforeEach(() => {
    setMockClaims([]);
  });

  it('renderiza children quando usuário possui a claim (mode any padrão)', () => {
    setMockClaims(['dashboard:view']);
    render(
      <RbacGuard claims={['dashboard:view']}>
        <div data-testid="protected">ok</div>
      </RbacGuard>,
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('não renderiza children quando usuário não possui nenhuma das claims', () => {
    setMockClaims(['relatorios:view']);
    render(
      <RbacGuard claims={['dashboard:view']}>
        <div data-testid="protected">ok</div>
      </RbacGuard>,
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('renderiza fallback quando bloqueado', () => {
    setMockClaims([]);
    render(
      <RbacGuard
        claims={['dashboard:view']}
        fallback={<div data-testid="fallback">denied</div>}
      >
        <div data-testid="protected">ok</div>
      </RbacGuard>,
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('mode="all" exige todas as claims — bloqueia quando falta alguma', () => {
    setMockClaims(['dashboard:view']);
    render(
      <RbacGuard claims={['dashboard:view', 'relatorios:view']} mode="all">
        <div data-testid="protected">ok</div>
      </RbacGuard>,
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('mode="all" libera quando todas as claims estão presentes', () => {
    setMockClaims(['dashboard:view', 'relatorios:view']);
    render(
      <RbacGuard claims={['dashboard:view', 'relatorios:view']} mode="all">
        <div data-testid="protected">ok</div>
      </RbacGuard>,
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('mode="any" libera quando ao menos uma claim está presente', () => {
    setMockClaims(['relatorios:view']);
    render(
      <RbacGuard claims={['dashboard:view', 'relatorios:view']} mode="any">
        <div data-testid="protected">ok</div>
      </RbacGuard>,
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });
});

describe('RbacButton', () => {
  beforeEach(() => {
    setMockClaims([]);
  });

  it('renderiza o children sem wrapper de opacidade quando autorizado', () => {
    setMockClaims(['dashboard:view']);
    render(
      <RbacButton claims={['dashboard:view']}>
        <button data-testid="action">go</button>
      </RbacButton>,
    );
    const button = screen.getByTestId('action');
    expect(button).toBeInTheDocument();
    // Quando autorizado, NÃO existe wrapper com opacity-50.
    expect(document.querySelector('.opacity-50')).toBeNull();
  });

  it('envolve com wrapper opacity-50 + tooltip quando bloqueado', () => {
    setMockClaims([]);
    render(
      <RbacButton claims={['dashboard:view']} disabledTooltip="Sem acesso">
        <button data-testid="action">go</button>
      </RbacButton>,
    );
    const button = screen.getByTestId('action');
    expect(button).toBeInTheDocument();
    // o wrapper de disabled deve existir
    const wrapper = document.querySelector('.opacity-50');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toContainElement(button);
    expect(screen.getByText('Sem acesso')).toBeInTheDocument();
  });
});

describe('withRbac HOC', () => {
  beforeEach(() => {
    setMockClaims([]);
  });

  it('renderiza o componente embrulhado quando autorizado', () => {
    setMockClaims(['dashboard:view']);
    const Inner = () => <div data-testid="wrapped">inner</div>;
    const Protected = withRbac(Inner, ['dashboard:view']);
    render(<Protected />);
    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
  });

  it('oculta o componente quando não autorizado', () => {
    setMockClaims([]);
    const Inner = () => <div data-testid="wrapped">inner</div>;
    const Protected = withRbac(Inner, ['dashboard:view']);
    render(<Protected />);
    expect(screen.queryByTestId('wrapped')).not.toBeInTheDocument();
  });

  it('propaga mode="all" para o RbacGuard', () => {
    setMockClaims(['dashboard:view']);
    const Inner = () => <div data-testid="wrapped">inner</div>;
    const Protected = withRbac(Inner, ['dashboard:view', 'relatorios:view'], 'all');
    render(<Protected />);
    expect(screen.queryByTestId('wrapped')).not.toBeInTheDocument();
  });
});
