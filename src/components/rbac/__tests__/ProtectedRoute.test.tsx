import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactElement } from 'react';
import { RequirePerms, ProtectedRoute } from '@/components/rbac/ProtectedRoute';
import type { Claim } from '@/modules/rh/rbac/claims';

// Mocka o hook de permissão que os guards consomem. Injetamos claims/loading
// via as variáveis abaixo (mesmo padrão de RbacGuard.test.tsx), sem tocar em
// Supabase/AuthContext.
let mockClaims: Claim[] = [];
let mockLoading = false;

vi.mock('@/hooks/useRbacPermissions', () => ({
  useRbacPermissions: () => ({
    can: (c: Claim) => mockClaims.includes(c),
    canAny: (cs: Claim[]) => cs.some((c) => mockClaims.includes(c)),
    canAll: (cs: Claim[]) => cs.every((c) => mockClaims.includes(c)),
    isLoading: mockLoading,
  }),
}));

const RH_ADMIN_CLAIMS: Claim[] = ['rh:users', 'rh:permissions', 'rh:pessoas_edit', 'rh:ponto_aprovar'];

// Renderiza o guard como elemento da rota /rh/pessoas, com uma rota /403 de marcação
// para provar o redirecionamento quando negado.
function renderGuarded(ui: ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/rh/pessoas']}>
      <Routes>
        <Route path="/403" element={<div data-testid="forbidden">Acesso Negado</div>} />
        <Route path="/rh/pessoas" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

const Protegido = <div data-testid="protected">conteúdo administrativo</div>;

beforeEach(() => {
  mockClaims = [];
  mockLoading = false;
});

describe('RequirePerms (guard de rota /rh)', () => {
  it('durante o carregamento das roles mostra loader e NÃO redireciona (anti flash-lockout)', () => {
    mockLoading = true;
    mockClaims = [];
    renderGuarded(<RequirePerms any={RH_ADMIN_CLAIMS}>{Protegido}</RequirePerms>);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forbidden')).not.toBeInTheDocument();
  });

  it('sem nenhuma claim de RH redireciona para /403', () => {
    mockClaims = ['logistica:view']; // ex.: motorista
    renderGuarded(<RequirePerms any={RH_ADMIN_CLAIMS}>{Protegido}</RequirePerms>);
    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('com apenas uma claim de RH (ex.: gestor com rh:users) libera o conteúdo', () => {
    mockClaims = ['rh:users'];
    renderGuarded(<RequirePerms any={RH_ADMIN_CLAIMS}>{Protegido}</RequirePerms>);
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.queryByTestId('forbidden')).not.toBeInTheDocument();
  });
});

describe('ProtectedRoute (guard de claim única)', () => {
  it('durante o carregamento mostra loader e não redireciona', () => {
    mockLoading = true;
    renderGuarded(<ProtectedRoute perm="rh:users">{Protegido}</ProtectedRoute>);
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByTestId('forbidden')).not.toBeInTheDocument();
  });

  it('nega e redireciona quando falta a claim', () => {
    mockClaims = [];
    renderGuarded(<ProtectedRoute perm="rh:users">{Protegido}</ProtectedRoute>);
    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('libera quando possui a claim', () => {
    mockClaims = ['rh:users'];
    renderGuarded(<ProtectedRoute perm="rh:users">{Protegido}</ProtectedRoute>);
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });
});
