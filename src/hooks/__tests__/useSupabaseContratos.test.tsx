import { describe, it, vi, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSupabaseContratos } from '@/hooks/useSupabaseContratos';
import { mockSupabaseClient } from '@/hooks/__mocks__/supabaseClient.mock';

const mockContract = {
  id: '123',
  nome: 'Test Contract',
  data_inicio: '2024-01-01',
  data_fim: '2025-01-01',
};

const mockError = new Error('Database error');

describe('useSupabaseContratos', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSupabaseClient.from.mockClear();
  });

  it('should fetch contratos successfully', async () => {
    mockSupabaseClient.from().select().limit().toJSON.mockResolvedValueOnce({
      data: [mockContract],
      error: null
    });

    const { result } = renderHook(() => useSupabaseContratos());

    await act(async () => {
      const data = await result.current.getContratos();
      expect(data).toEqual([mockContract]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contratos');
    });
  });

  it('should handle fetch errors', async () => {
    mockSupabaseClient.from().select().limit().toJSON.mockResolvedValueOnce({
      data: null,
      error: mockError
    });

    const { result } = renderHook(() => useSupabaseContratos());

    await act(async () => {
      const data = await result.current.getContratos();
      expect(data).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error fetching contratos:', mockError);
    });
  });

  it('should create contrato successfully', async () => {
    mockSupabaseClient.from().insert.mockResolvedValue({
      data: [mockContract],
      error: null
    });

    const { result } = renderHook(() => useSupabaseContratos());

    await act(async () => {
      const data = await result.current.createContrato(mockContract);
      expect(data).toEqual([mockContract]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contratos');
    });
  });

  it('should handle create errors', async () => {
    mockSupabaseClient.from().insert.mockResolvedValue({
      data: null,
      error: mockError
    });

    const { result } = renderHook(() => useSupabaseContratos());

    await act(async () => {
      const data = await result.current.createContrato(mockContract);
      expect(data).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error creating contrato:', mockError);
    });
  });
});