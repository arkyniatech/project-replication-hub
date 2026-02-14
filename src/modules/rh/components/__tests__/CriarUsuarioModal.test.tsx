import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CriarUsuarioModal } from '../CriarUsuarioModal';
import { useToast } from '@/hooks/use-toast';

// Mocks
const mockToast = vi.fn();
const mockCreateProfile = vi.fn();
const mockAddRoles = vi.fn();
const mockAddLojas = vi.fn();
const mockLojas = [
  { id: 'loja1', nome: 'Loja Centro' },
  { id: 'loja2', nome: 'Loja Norte' },
];

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../hooks/useSupabaseUserProfiles', () => ({
  useSupabaseUserProfiles: () => ({
    createProfile: mockCreateProfile,
  }),
}));

vi.mock('../hooks/useSupabaseUserRoles', () => ({
  useSupabaseUserRoles: () => ({
    addRoles: mockAddRoles,
  }),
}));

vi.mock('../hooks/useSupabaseUserLojas', () => ({
  useSupabaseUserLojas: () => ({
    addLojas: mockAddLojas,
  }),
}));

vi.mock('../hooks/useSupabaseLojas', () => ({
  useSupabaseLojas: () => ({
    lojas: mockLojas,
  }),
}));

vi.mock('@/services/logger', () => ({
  logAction: vi.fn(),
}));

// Mock crypto.randomBytes
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => Buffer.from('mockrandombytes16chars')),
  },
}));

// Mock bcrypt - not used in this component but imported
vi.mock('bcrypt', () => ({
  default: {},
}));

const mockPessoa = {
  id: 'pessoa-123',
  nome: 'João Silva',
  cpf: '12345678901',
  cargo: 'motorista',
  matricula: 'MAT001',
  email: 'joao.silva@empresa.com',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('CriarUsuarioModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProfile.mockResolvedValue({ id: 'user-123' });
    mockAddRoles.mockResolvedValue(undefined);
    mockAddLojas.mockResolvedValue(undefined);
  });

  it('should not render when pessoa is null', () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={null}
      />,
      { wrapper }
    );

    expect(screen.queryByText('Criar Acesso ao Sistema')).not.toBeInTheDocument();
  });

  it('should render modal correctly when open', () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    expect(screen.getByText('Criar Acesso ao Sistema')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('joao.silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('joao.silva@empresa.com')).toBeInTheDocument();
  });

  it('should generate username from full name', () => {
    const pessoaComNomeCompleto = {
      ...mockPessoa,
      nome: 'Maria Aparecida Santos Silva',
    };

    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={pessoaComNomeCompleto}
      />,
      { wrapper }
    );

    expect(screen.getByDisplayValue('maria.silva')).toBeInTheDocument();
  });

  it('should handle single name username generation', () => {
    const pessoaComNomeUnico = {
      ...mockPessoa,
      nome: 'João',
    };

    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={pessoaComNomeUnico}
      />,
      { wrapper }
    );

    expect(screen.getByDisplayValue('joao')).toBeInTheDocument();
  });

  it('should suggest role based on cargo', () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    const motoristaBadge = screen.getByText('Motorista');
    expect(motoristaBadge).toHaveClass('bg-indigo-500');
  });

  it('should allow role selection', () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    const adminBadge = screen.getByText('Admin');
    fireEvent.click(adminBadge);

    expect(adminBadge).toHaveClass('bg-red-500', 'text-white');
  });

  it('should toggle loja selection', () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    expect(lojaCentroBadge).toHaveClass('bg-slate-500'); // selected class
  });

  it('should show loja padrao select when lojas are selected', () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    expect(screen.queryByText('Loja Padrão (opcional)')).not.toBeInTheDocument();

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    expect(screen.getByText('Loja Padrão (opcional)')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Selecione pelo menos um perfil',
        variant: 'destructive'
      });
    });
  });

  it('should validate loja selection', async () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    // Select a role first
    const motoristaBadge = screen.getByText('Motorista');
    fireEvent.click(motoristaBadge);

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Selecione pelo menos uma loja',
        variant: 'destructive'
      });
    });
  });

  it('should validate loja padrao consistency', async () => {
    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    // Select role and loja
    const motoristaBadge = screen.getByText('Motorista');
    fireEvent.click(motoristaBadge);

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    // Set loja padrao to loja2 (not selected)
    const lojaPadraoSelect = screen.getByRole('combobox');
    fireEvent.change(lojaPadraoSelect, { target: { value: 'loja2' } });

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro',
        description: 'Loja padrão deve estar nas lojas permitidas',
        variant: 'destructive'
      });
    });
  });

  it('should create user successfully', async () => {
    const mockOnOpenChange = vi.fn();

    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={mockOnOpenChange}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    // Fill required fields
    const motoristaBadge = screen.getByText('Motorista');
    fireEvent.click(motoristaBadge);

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    // Mock supabase functions.invoke
    const mockSupabaseFunctions = vi.fn().mockResolvedValue({
      data: { user_id: 'new-user-123' },
      error: null,
    });

    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        functions: {
          invoke: mockSupabaseFunctions,
        },
      },
    }));

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSupabaseFunctions).toHaveBeenCalledWith('create-user', {
        body: expect.objectContaining({
          email: 'joao.silva@empresa.com',
          password: expect.any(String), // Generated password
          username: 'joao.silva',
          pessoa_id: 'pessoa-123',
          two_fa_enabled: false,
          exige_troca_senha: true,
          loja_padrao_id: null,
        }),
      });
    });

    await waitFor(() => {
      expect(mockAddRoles).toHaveBeenCalledWith({
        userId: 'new-user-123',
        roles: ['motorista'],
      });
    });

    await waitFor(() => {
      expect(mockAddLojas).toHaveBeenCalledWith({
        userId: 'new-user-123',
        lojaIds: ['loja1'],
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Usuário criado com sucesso!',
      description: 'Acesso criado para João Silva. Senha temporária gerada automaticamente.',
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should generate secure password', () => {
    const { gerarSenhaSegura } = require('../CriarUsuarioModal');

    const senha = gerarSenhaSegura();

    // Base64 encoded 16 bytes should be 22 characters + padding
    expect(senha).toHaveLength(24); // crypto.randomBytes(16).toString('base64') gives 24 chars
    expect(typeof senha).toBe('string');
  });

  it('should handle create user error', async () => {
    const mockSupabaseFunctions = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('User creation failed'),
    });

    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        functions: {
          invoke: mockSupabaseFunctions,
        },
      },
    }));

    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    // Select required fields
    const motoristaBadge = screen.getByText('Motorista');
    fireEvent.click(motoristaBadge);

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro ao criar usuário',
        description: 'Ocorreu um erro ao criar o acesso',
        variant: 'destructive',
      });
    });
  });

  it('should handle user already exists error', async () => {
    const mockSupabaseFunctions = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('already registered'),
    });

    vi.mock('@/integrations/supabase/client', () => ({
      supabase: {
        functions: {
          invoke: mockSupabaseFunctions,
        },
      },
    }));

    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    // Select required fields
    const motoristaBadge = screen.getByText('Motorista');
    fireEvent.click(motoristaBadge);

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erro ao criar usuário',
        description: 'Este e-mail já está cadastrado no sistema',
        variant: 'destructive',
      });
    });
  });

  it('should disable form during submission', async () => {
    mockCreateProfile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ id: 'user-123' }), 100)));

    render(
      <CriarUsuarioModal
        open={true}
        onOpenChange={() => {}}
        pessoa={mockPessoa}
      />,
      { wrapper }
    );

    // Select required fields
    const motoristaBadge = screen.getByText('Motorista');
    fireEvent.click(motoristaBadge);

    const lojaCentroBadge = screen.getByText('Loja Centro');
    fireEvent.click(lojaCentroBadge);

    const submitButton = screen.getByRole('button', { name: 'Criar Usuário' });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Criando...');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Criar Usuário');
    });
  });
});