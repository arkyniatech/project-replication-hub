import { describe, it, vi, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import mockSupabaseClient from '@/hooks/__mocks__/supabaseClient.mock'; // Importa o mock

const mockAuthUser = {
  id: 'mock-user-123',
  email: 'user@example.com',
  metadata: { roles: ['admin'] }
};

const mockAuth = {
  getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockAuthUser } } }),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: () => { } } }
  })
};

describe('Rotas Protegidas - E2E Tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Configura o mock do cliente Supabase para o AuthContext
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        ...mockSupabaseClient,
        auth: mockAuth,
      },
    }));
  });

  it('should render protected page when authenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should redirect to auth when accessing protected route unauthenticated', async () => {
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('should show forbidden page for insufficient permissions', async () => {
    const limitedUser = { ...mockAuthUser, metadata: { roles: ['read-only'] } };
    mockAuth.getSession.mockResolvedValueOnce({ 
      data: { session: { user: limitedUser } } 
    });

    render(
      <MemoryRouter initialEntries={['/equipamentos/cadastro']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    });
  });

  it('should handle navigation between protected routes', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Clicar em um link de navegação para Equipamentos
    // Mock de exemplo, precisa ser adaptado aos elementos reais da sua aplicação
    const linkEquipamentos = screen.getByText('Equipamentos');
    linkEquipamentos.click();

    await waitFor(() => {
      expect(screen.getByText('Lista de Equipamentos')).toBeInTheDocument();
    });
  });

  it('should maintain auth state across route changes', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Clicar em um link de navegação para Contratos
    // Mock de exemplo, precisa ser adaptado aos elementos reais da sua aplicação
    const linkContratos = screen.getByText('Contratos');
    linkContratos.click();

    await waitFor(() => {
      expect(screen.getByText('Lista de Contratos')).toBeInTheDocument();
    });

    expect(mockAuth.getSession).toHaveBeenCalledTimes(2); // Deve ser chamado 2 vezes: na inicialização e na mudança de rota
  });

  it('should handle complete authentication flow: login -> access protected route -> logout', async () => {
    // Start unauthenticated
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Should redirect to login
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    // Simulate successful login by updating the mock
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: mockAuthUser } } });

    // Trigger re-render with authenticated state
    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Verify user can access protected content
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Simulate logout
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });

    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('should handle role-based access control in E2E flow', async () => {
    // Test admin user accessing admin-only routes
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Administração de Usuários')).toBeInTheDocument();
    });

    // Test regular user being denied access to admin routes
    const regularUser = { ...mockAuthUser, metadata: { roles: ['user'] } };
    mockAuth.getSession.mockResolvedValueOnce({
      data: { session: { user: regularUser } }
    });

    const { rerender: rerenderAdmin } = render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <App />
      </MemoryRouter>
    );

    rerenderAdmin(
      <MemoryRouter initialEntries={['/admin/users']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
    });
  });

  it('should handle session expiration gracefully', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Simulate session expiration
    mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });

    // Trigger auth state change (this would normally come from Supabase)
    mockAuth.onAuthStateChange.mock.calls.forEach(([callback]) => {
      if (callback) callback('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('should handle concurrent authentication checks', async () => {
    // Simulate multiple auth checks happening simultaneously
    const authChecks = Array(3).fill(null).map(() =>
      mockAuth.getSession.mockResolvedValueOnce({ data: { session: { user: mockAuthUser } } })
    );

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Verify auth was checked multiple times
    expect(mockAuth.getSession).toHaveBeenCalledTimes(3);
  });

  it('should handle authentication errors gracefully', async () => {
    // Simulate auth error
    mockAuth.getSession.mockRejectedValueOnce(new Error('Auth service unavailable'));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Should still render login or handle error appropriately
    await waitFor(() => {
      // Either shows login or error handling UI
      expect(screen.getByText('Login') || screen.getByText('Erro')).toBeInTheDocument();
    });
  });

  it('should validate token refresh scenarios', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Simulate token refresh
    const refreshedUser = { ...mockAuthUser, id: 'refreshed-user-id' };
    mockAuth.getSession.mockResolvedValueOnce({
      data: { session: { user: refreshedUser } }
    });

    // Trigger auth state change for token refresh
    mockAuth.onAuthStateChange.mock.calls.forEach(([callback]) => {
      if (callback) callback('TOKEN_REFRESHED', { user: refreshedUser });
    });

    await waitFor(() => {
      // User should still be authenticated with refreshed token
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});