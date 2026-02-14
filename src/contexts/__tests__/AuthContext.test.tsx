import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import mockSupabaseClient from '@/hooks/__mocks__/supabaseClient.mock'; // Importa o mock

const mockUser = {
  id: 'mock-user-123',
  email: 'user@example.com',
  metadata: { roles: ['admin'] }
};

const mockAuth = {
  getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } } }),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: () => { } } }
  })
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Mock environment variable
    vi.stubEnv('VITE_AUTH_PROVIDER', 'supabase');
    // Configura o mock do cliente Supabase para o AuthContext
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        ...mockSupabaseClient,
        auth: mockAuth,
      },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should provide auth state and functions to children', async () => {
    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(mockAuth.getSession).toHaveBeenCalled();
  });

  it('should handle sign out', async () => {
    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signOut } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    await act(async () => await signOut());
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('should initialize with Supabase auth when provider is supabase', async () => {
    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    expect(mockAuth.getSession).toHaveBeenCalled();
    expect(mockAuth.onAuthStateChange).toHaveBeenCalled();
  });

  it('should handle successful login with credentials', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    mockAuth.signInWithPassword = mockSignIn;

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signInWithCredentials } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    const result = await act(async () => await signInWithCredentials('test@example.com', 'password123'));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.error).toBeNull();
  });

  it('should handle login error with invalid credentials', async () => {
    const mockError = new Error('Invalid login credentials');
    const mockSignIn = vi.fn().mockResolvedValue({ error: mockError });
    mockAuth.signInWithPassword = mockSignIn;

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signInWithCredentials } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    const result = await act(async () => await signInWithCredentials('wrong@example.com', 'wrongpass'));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'wrong@example.com',
      password: 'wrongpass',
    });
    expect(result.error).toBe(mockError);
  });

  it('should handle successful user registration', async () => {
    // Mock window.prompt for signUp test
    const mockPrompt = vi.fn();
    global.window.prompt = mockPrompt;
    mockPrompt.mockReturnValueOnce('test@example.com');
    mockPrompt.mockReturnValueOnce('password123');

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signUp } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    await act(async () => await signUp());

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should handle registration cancellation', async () => {
    // Mock window.prompt returning null (user cancelled)
    global.window.prompt = vi.fn().mockReturnValue(null);

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signUp } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    await act(async () => await signUp());

    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('should handle registration error', async () => {
    const mockError = new Error('User already registered');
    const mockSignUp = vi.fn().mockResolvedValue({ error: mockError });
    mockAuth.signUp = mockSignUp;

    // Mock window.prompt and window.alert
    global.window.prompt = vi.fn()
      .mockReturnValueOnce('test@example.com')
      .mockReturnValueOnce('password123');
    const mockAlert = vi.fn();
    global.window.alert = mockAlert;

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signUp } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    await act(async () => await signUp());

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockAlert).toHaveBeenCalledWith('Erro no registro: User already registered');
  });

  it('should handle signIn cancellation', async () => {
    // Mock window.prompt returning null (user cancelled)
    global.window.prompt = vi.fn().mockReturnValue(null);

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signIn } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    await act(async () => await signIn());

    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should handle signIn error', async () => {
    const mockError = new Error('Invalid login credentials');
    const mockSignIn = vi.fn().mockResolvedValue({ error: mockError });
    mockAuth.signInWithPassword = mockSignIn;

    // Mock window.prompt and window.alert
    global.window.prompt = vi.fn()
      .mockReturnValueOnce('test@example.com')
      .mockReturnValueOnce('password123');
    const mockAlert = vi.fn();
    global.window.alert = mockAlert;

    await act(async () => {
      render(<AuthProvider>
        <div data-test-id="child" />
      </AuthProvider>);
    });

    const { signIn } = await import('@/contexts/AuthContext').then(m => m.useAuth());
    await act(async () => await signIn());

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockAlert).toHaveBeenCalledWith('Erro no login: Invalid login credentials');
  });
});