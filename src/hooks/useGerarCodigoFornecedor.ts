import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para gerar código automático de fornecedor
 * Formato: FOR001, FOR002, FOR003, etc.
 */
export function useGerarCodigoFornecedor() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('gerar_codigo_fornecedor');

      if (error) {
        console.error('Erro ao gerar código:', error);
        throw error;
      }

      return data as string;
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar código: ${error.message}`);
    }
  });
}
