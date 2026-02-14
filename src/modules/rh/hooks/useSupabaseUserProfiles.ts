import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  username: string | null;
  pessoa_id: string;
  two_fa_enabled: boolean;
  exige_troca_senha: boolean;
  ativo: boolean;
  loja_padrao_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useSupabaseUserProfiles() {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          pessoas(nome, cpf, cargo, loja_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const createProfile = useMutation({
    mutationFn: async (profileData: {
      id: string;
      username: string;
      pessoa_id: string;
      two_fa_enabled: boolean;
      exige_troca_senha: boolean;
      loja_padrao_id: string | null;
    }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserProfile> }) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async ({ user_id, email }: { user_id?: string; email?: string }) => {
      // Obter token de autenticação atual
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id, email },
        headers: {
          Authorization: session ? `Bearer ${session.access_token}` : '',
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-lojas'] });
    }
  });

  return {
    profiles,
    isLoading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    deleteUser
  };
}
