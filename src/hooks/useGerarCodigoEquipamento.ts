import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para gerar código automático de equipamento
 * Formato: LA + código da loja (3 dígitos) + sequencial (3 dígitos)
 * Exemplo: LA001042 (Loja 001, equipamento 042)
 */
export function useGerarCodigoEquipamento() {
  return useMutation({
    mutationFn: async () => {
      // MOCK: Generate code client-side because database function is missing
      // Format: LA + timestamp slice (mocking the store/seq logic)
      const mockCode = `LA${Date.now().toString().slice(-6)}`;
      return Promise.resolve(mockCode);
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar código: ${error.message}`);
    }
  });
}
