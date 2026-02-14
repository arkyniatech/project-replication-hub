import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AuthContextProvider } from '@/contexts/AuthContext';
import mockSupabaseClient from '@/hooks/__mocks__/supabaseClient.mock';

const TestComponent = () => <div data-testid="protected">Conteúdo Protegido</div>;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Outlet: () => <div>Outlet</div>
  };
});

const mockUser = {
  id: 'mock-user-123',
  email: 'user@example.com',
  metadata: { roles: ['admin'] }
};

const mockAuth = {
  getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } } }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: () => { } } }
  })
};

describe('RequireAuth Component', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        ...mockSupabaseClient,
        auth: mockAuth,
      },
    }));
  });

  it('renders protected content when authenticated', async () => {
    render(
      <AuthContextProvider>
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      </AuthContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects when not authenticated', async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } }); // Simula usuário não autenticado

    render(
      <AuthContextProvider>
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      </AuthContextProvider>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    // Simula o estado de carregamento inicial (sessão pendente)
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });
    // Garante que o AuthContext não resolva imediatamente para simular o carregamento
    vi.doMock('@/contexts/AuthContext', async (importActual) => {
      const actual = await importActual();
      return {
        ...actual,
        AuthContextProvider: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="loading">Carregando...</div>
        ),
      };
    });

    render(
      <AuthContextProvider>
        <RequireAuth>
          <TestComponent />
        </RequireAuth>
      </AuthContextProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });
});