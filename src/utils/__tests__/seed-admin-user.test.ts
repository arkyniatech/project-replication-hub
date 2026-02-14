import { describe, it, beforeEach, vi, expect } from 'vitest';
import { seedAdminUser } from '../seed-admin-user';

// Mock do cliente Supabase
const mockSupabase = {
  supabaseUrl: 'https://mock.supabase.co',
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock de fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('seedAdminUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PROD', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should seed admin user successfully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        message: 'Usuário admin criado com sucesso',
        user_id: 'admin-user-123',
        email: 'admin@empresa.com',
        role: 'admin',
      }),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const result = await seedAdminUser();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://mock.supabase.co/functions/v1/seed-admin',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    expect(result).toEqual({
      success: true,
      message: 'Usuário admin criado com sucesso',
      user_id: 'admin-user-123',
      email: 'admin@empresa.com',
      role: 'admin',
    });
  });

  it('should handle Edge Function error', async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: 'Admin already exists',
      }),
    };

    mockFetch.mockResolvedValue(mockResponse);

    await expect(seedAdminUser()).rejects.toThrow('Admin already exists');
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(seedAdminUser()).rejects.toThrow('Network error');
  });

  it('should prevent execution in production', async () => {
    vi.stubEnv('PROD', 'true');

    await expect(seedAdminUser()).rejects.toThrow(
      'Seed do admin só pode ser executado em ambiente de desenvolvimento'
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle successful seed with admin already existing', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: false,
        message: 'Usuário admin já existe no sistema',
      }),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const result = await seedAdminUser();

    expect(result).toEqual({
      success: false,
      message: 'Usuário admin já existe no sistema',
    });
  });

  it('should handle malformed response', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    };

    mockFetch.mockResolvedValue(mockResponse);

    const result = await seedAdminUser();

    expect(result).toEqual({});
  });
});