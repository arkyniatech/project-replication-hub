import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import RbacGuard from '@/components/rbac/RbacGuard';
import { AuthContext } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

const mockAuthUser = (userId = 'test-user-id') => {
  return {
    user: { id: userId },
    session: { user: { id: userId } },
    loading: false
  };
};

describe('RbacGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should render children if user has required role', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'admin' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard claims={['dashboard:view']}>
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('should not render children if user lacks required claims', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'standard' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard claims={['dashboard:view']}>
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('should render fallback when unauthorized', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'standard' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');
    const FallbackComp = () => <div data-testid="fallback">Acesso Negado</div>;

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard claims={['dashboard:view']} fallback={<FallbackComp />}>
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    // Wait for the query to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should handle "all" mode correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'admin' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard claims={['dashboard:view', 'admin:access']} mode="all">
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    // Should not render since user only has 'admin' role but needs both claims
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('should handle "any" mode correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'admin' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard claims={['dashboard:view', 'admin:access']} mode="any">
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    // Should render since 'any' mode requires only one claim
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('should handle unauthenticated user', async () => {
    const MockAuthUnauthenticated = {
      user: null,
      session: null,
      loading: false
    };

    const FallbackComp = () => <div data-testid="fallback">Acesso Negado</div>;

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuthUnauthenticated}>
          <RbacGuard claims={['dashboard:view']} fallback={<FallbackComp />}>
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should render RbacButton with permission', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'admin' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard.RbacButton claims={['dashboard:view']}>
            <button data-testid="action-button">Ação Permitida</button>
          </RbacGuard.RbacButton>
        </AuthContext.Provider>
      </wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    const button = screen.getByTestId('action-button');
    expect(button).toBeInTheDocument();
    expect(button).not.toHaveClass('opacity-50');
  });

  it('should render RbacButton disabled without permission', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'standard' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard.RbacButton claims={['admin:access']}>
            <button data-testid="action-button">Ação Bloqueada</button>
          </RbacGuard.RbacButton>
        </AuthContext.Provider>
      </wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    const button = screen.getByTestId('action-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('opacity-50');
  });

  it('should handle withRbac HOC', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'admin' }], error: null }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');

    const TestComponent = () => <div data-testid="wrapped">Componente Protegido</div>;
    const ProtectedComponent = RbacGuard.withRbac(TestComponent, ['dashboard:view']);

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <ProtectedComponent />
        </AuthContext.Provider>
      </wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
  });

  it('should handle query error gracefully', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
      }))
    }));
    (supabase.from as any).mockImplementation(mockFrom);

    const MockAuth = mockAuthUser('test-user-id');
    const FallbackComp = () => <div data-testid="fallback">Erro de Permissões</div>;

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuth}>
          <RbacGuard claims={['dashboard:view']} fallback={<FallbackComp />}>
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    const MockAuthLoading = {
      user: null,
      session: null,
      loading: true
    };

    render(
      <wrapper>
        <AuthContext.Provider value={MockAuthLoading}>
          <RbacGuard claims={['dashboard:view']}>
            <div data-testid="protected">Conteúdo Protegido</div>
          </RbacGuard>
        </AuthContext.Provider>
      </wrapper>
    );

    // Should not render content while loading
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });
});