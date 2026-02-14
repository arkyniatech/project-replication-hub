import { useMemo } from 'react';
import { useRbac } from './useRbac';
import type { Claim } from '@/modules/rh/rbac/claims';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRbacPermissions() {
  const { can: rbacCan, anyOf: rbacAnyOf, allOf: rbacAllOf, claimsAtivas, isLoading } = useRbac();
  const { user } = useAuth();
  
  const { data: userLojas } = useQuery({
    queryKey: ['user-lojas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_lojas_permitidas')
        .select('loja_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });
  
  const effectivePermissions = useMemo(() => claimsAtivas, [claimsAtivas]);

  const can = rbacCan;
  const canAny = rbacAnyOf;
  const canAll = rbacAllOf;

  const getEffectivePermissions = (): string[] => {
    return effectivePermissions;
  };

  const isMultiLoja = () => {
    return (userLojas?.length || 0) > 1;
  };

  const canTrocarLoja = () => {
    return can('org:trocar_loja');
  };

  const currentUser = {
    id: user?.id,
    permissions: effectivePermissions,
    lojas: userLojas || []
  };

  return {
    can,
    canAny,
    canAll,
    getEffectivePermissions,
    isMultiLoja,
    canTrocarLoja,
    currentUser
  };
}

/**
 * Hook para verificações específicas comuns
 */
export function usePermissionChecks() {
  const { can } = useRbacPermissions();

  return {
    // Legacy compatibility
    canViewClientes: () => can('clientes:view'),
    canCreateClientes: () => can('clientes:create'), 
    canEditClientes: () => can('clientes:edit'),
    canViewContratos: () => can('contratos:view'),
    canCreateContratos: () => can('contratos:create'),
    canEditContratos: () => can('contratos:edit'),
    canRenewContratos: () => can('contratos:renew'),
    
    // Equipamentos
    canViewEquipamentos: () => can('equipamentos:view'),
    canEditEquipamentos: () => can('equipamentos:edit'),
    canViewPrecos: () => can('equipamentos:view-price'),

    // Logística
    canOperarLogistica: () => can('logistica:operar'),
    canConfigLogistica: () => can('logistica:config'),

    // Financeiro
    canViewCR: () => can('financeiro.cr:view'),
    canConfigCR: () => can('financeiro.cr:config'),

    // Estoque
    canViewEstoque: () => can('estoque:view'),
    canAjustarEstoque: () => can('estoque:ajustar'),

    // RH
    canManageUsers: () => can('rh:users'),
    canManagePermissions: () => can('rh:permissions'),

    // Settings
    canConfigTemplates: () => can('settings:templates'),
    canConfigSequencias: () => can('settings:sequencias'),

    // Utils
    can
  };
}
