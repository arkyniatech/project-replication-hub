import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

export function useSupabaseUserRoles() {
  const queryClient = useQueryClient();

  const addRoles = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const rolesData = roles.map(role => ({
        user_id: userId,
        role: role
      }));

      const { data, error } = await supabase
        .from('user_roles')
        .insert(rolesData)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  const updateRoles = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      // Remove todas as roles antigas
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Adiciona as novas roles
      const rolesData = roles.map(role => ({
        user_id: userId,
        role: role
      }));

      const { data, error } = await supabase
        .from('user_roles')
        .insert(rolesData)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profiles'] });
    }
  });

  return {
    addRoles,
    removeRole,
    updateRoles
  };
}
