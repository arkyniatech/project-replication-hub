import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '@/contexts/AuthContext';
import mockSupabaseClient from '@/hooks/__mocks__/supabaseClient.mock';

// Mock do AuthProvider
const mockSignInWithCredentials = vi.fn();
const mockToast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      signInWithCredentials: mockSignInWithCredentials,
    }),
  };
});

// Mock do cliente Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_AUTH_PROVIDER', 'supabase');
    vi.stubEnv('VITE_ADMIN_EMAIL', 'admin@locacaoerp.com');
    vi.stubEnv('VITE_ADMIN_PASSWORD', 'admin123');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render login form correctly', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    expect(screen.getByText('Entrar no Sistema')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('should validate email field', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email é obrigatório')).toBeInTheDocument();
    });
  });

  it('should validate password field', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    mockSignInWithCredentials.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithCredentials).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Login realizado",
        description: "Bem-vindo ao sistema!",
      });
    });
  });

  it('should handle login error with invalid credentials', async () => {
    const mockError = new Error('Invalid login credentials');
    mockSignInWithCredentials.mockResolvedValue({ error: mockError });

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithCredentials).toHaveBeenCalledWith('wrong@example.com', 'wrongpass');
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Erro no login",
        description: "Email ou senha incorretos",
      });
    });
  });

  it('should handle network error', async () => {
    const mockError = new Error('Network error: Failed to fetch');
    mockSignInWithCredentials.mockResolvedValue({ error: mockError });

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Erro no login",
        description: "Erro de conexão. Verifique sua internet.",
      });
    });
  });

  it('should toggle password visibility', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should toggle admin mode', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    expect(screen.getByText('Entrar no Sistema')).toBeInTheDocument();

    const adminButton = screen.getByRole('button', { name: 'Modo Admin' });
    fireEvent.click(adminButton);

    expect(screen.getByText('Acesso Administrativo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('admin@locacaoerp.com')).toBeInTheDocument();
  });

  it('should handle successful admin login', async () => {
    mockSignInWithCredentials.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const adminButton = screen.getByRole('button', { name: 'Modo Admin' });
    fireEvent.click(adminButton);

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithCredentials).toHaveBeenCalledWith('admin@locacaoerp.com', 'admin123');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Login Administrativo",
        description: "Acesso concedido como administrador.",
      });
    });
  });

  it('should handle failed admin login', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const adminButton = screen.getByRole('button', { name: 'Modo Admin' });
    fireEvent.click(adminButton);

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'wrongadminpass' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Erro no login",
        description: "Credenciais administrativas incorretas",
      });
    });
  });

  it('should disable form during submission', async () => {
    mockSignInWithCredentials.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100)));

    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const passwordInput = screen.getByLabelText('Senha');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Entrar' });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Entrando...');
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Entrar');
    });
  });

  it('should handle forgot password click', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const forgotPasswordLink = screen.getByText('Esqueceu a senha?');
    fireEvent.click(forgotPasswordLink);

    expect(mockToast).toHaveBeenCalledWith({
      title: "Recuperação de senha",
      description: "Funcionalidade em desenvolvimento. Contate o administrador.",
    });
  });
});