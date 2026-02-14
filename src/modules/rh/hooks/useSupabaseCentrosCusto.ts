import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSupabaseCentrosCusto() {
  const { data: centrosCusto = [], isLoading, error } = useQuery({
    queryKey: ['centros-custo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centros_custo')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data;
    }
  });

  return { centrosCusto, isLoading, error };
}
