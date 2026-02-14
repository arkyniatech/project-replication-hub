import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseLojas() {
  const { data: lojas = [], isLoading, error } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data;
    }
  });

  return { lojas, isLoading, error };
}
