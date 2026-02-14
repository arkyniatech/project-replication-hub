import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSupabaseAuth() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          pessoas (
            nome,
            cpf,
            cargo,
            loja_id
          )
        `)
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id
  });

  const { data: lojas, isLoading: lojasLoading } = useQuery({
    queryKey: ['user-lojas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_lojas_permitidas')
        .select('loja_id, lojas(nome, codigo)')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  return {
    user,
    profile,
    roles: roles || [],
    lojas: lojas || [],
    isLoading: profileLoading || rolesLoading || lojasLoading
  };
}
