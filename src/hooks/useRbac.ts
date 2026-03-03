import { useMemo } from 'react';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Claim } from '@/modules/rh/rbac/claims';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Mapeamento de roles para claims válidos
const ROLE_TO_CLAIMS: Record<AppRole, Claim[]> = {
  admin: [
    'dashboard:view', 'relatorios:view',
    'clientes:view', 'clientes:create', 'clientes:edit',
    'equipamentos:view', 'equipamentos:edit', 'equipamentos:create', 'equipamentos:view-price',
    'contratos:view', 'contratos:create', 'contratos:edit', 'contratos:renew', 'contratos:close',
    'logistica:view', 'logistica:operar', 'logistica:config',
    'financeiro.cr:view', 'financeiro.cr:config', 'financeiro.cr:emitir-bolepix', 'financeiro.cr:cancelar-bolepix', 'financeiro.cr:ver-bolepix',
    'fin:transferir', 'fin:conciliar', 'fin:ver-saldos',
    'estoque:view', 'estoque:ajustar',
    'rh:users', 'rh:permissions', 'rh:pessoas_edit', 'rh:ponto_aprovar',
    'settings:templates', 'settings:sequencias',
    'config:usuarios',
    'manutencaoOS:ver', 'manutencaoOS:operar', 'manutencaoOS:liberar', 'manutencaoOS:cinza', 'manutencaoOS:config',
    'dre:view', 'dre:fechar', 'dre:reabrir',
    'org:multi_loja_report', 'org:trocar_loja',
    'compras:view', 'compras:req:create', 'compras:req:view', 'compras:cot:create', 'compras:cot:edit', 'compras:po:create', 'compras:rec:operar', 'compras:approve',
    'almox:view', 'almox:ajustar', 'almox:patrimonial', 'almox:contagem:processar'
  ],
  vendedor: [
    'dashboard:view',
    'clientes:view', 'clientes:create', 'clientes:edit',
    'equipamentos:view', 'equipamentos:view-price',
    'contratos:view', 'contratos:create', 'contratos:edit', 'contratos:renew',
    'logistica:view', 'logistica:operar',
    'financeiro.cr:view',
    'fin:ver-saldos',
    'compras:view', 'compras:req:create', 'compras:req:view',
    'almox:view'
  ],
  motorista: [
    'logistica:view', 'logistica:operar'
  ],
  mecanico: [
    'equipamentos:view',
    'manutencaoOS:ver', 'manutencaoOS:operar', 'manutencaoOS:liberar'
  ],
  financeiro: [
    'dashboard:view', 'relatorios:view',
    'clientes:view',
    'contratos:view',
    'financeiro.cr:view', 'financeiro.cr:config', 'financeiro.cr:emitir-bolepix', 'financeiro.cr:cancelar-bolepix', 'financeiro.cr:ver-bolepix',
    'fin:transferir', 'fin:conciliar', 'fin:ver-saldos',
    'config:usuarios',
    'dre:view'
  ],
  gestor: [
    'dashboard:view', 'relatorios:view',
    'clientes:view', 'clientes:create', 'clientes:edit',
    'equipamentos:view', 'equipamentos:edit', 'equipamentos:create', 'equipamentos:view-price',
    'contratos:view', 'contratos:create', 'contratos:edit', 'contratos:renew', 'contratos:close',
    'logistica:view', 'logistica:config',
    'financeiro.cr:view',
    'fin:ver-saldos', 'fin:conciliar',
    'estoque:view', 'estoque:ajustar',
    'rh:users',
    'org:multi_loja_report',
    'manutencaoOS:ver', 'manutencaoOS:operar', 'manutencaoOS:liberar', 'manutencaoOS:cinza', 'manutencaoOS:config',
    'compras:view', 'compras:req:create', 'compras:req:view', 'compras:cot:create', 'compras:cot:edit', 'compras:po:create', 'compras:approve',
    'almox:view', 'almox:ajustar', 'almox:patrimonial', 'almox:contagem:processar'
  ],
  rh: [
    'dashboard:view',
    'rh:users', 'rh:permissions', 'rh:pessoas_edit', 'rh:ponto_aprovar',
    'config:usuarios'
  ],
  master: [
    'dashboard:view', 'relatorios:view',
    'clientes:view', 'clientes:create', 'clientes:edit',
    'equipamentos:view', 'equipamentos:edit', 'equipamentos:create', 'equipamentos:view-price',
    'contratos:view', 'contratos:create', 'contratos:edit', 'contratos:renew', 'contratos:close',
    'logistica:view', 'logistica:operar', 'logistica:config',
    'financeiro.cr:view', 'financeiro.cr:config', 'financeiro.cr:emitir-bolepix', 'financeiro.cr:cancelar-bolepix', 'financeiro.cr:ver-bolepix',
    'fin:transferir', 'fin:conciliar', 'fin:ver-saldos',
    'estoque:view', 'estoque:ajustar',
    'rh:users', 'rh:permissions', 'rh:pessoas_edit', 'rh:ponto_aprovar',
    'settings:templates', 'settings:sequencias',
    'config:usuarios',
    'manutencaoOS:ver', 'manutencaoOS:operar', 'manutencaoOS:liberar', 'manutencaoOS:cinza', 'manutencaoOS:config',
    'dre:view', 'dre:fechar', 'dre:reabrir',
    'org:multi_loja_report', 'org:trocar_loja',
    'compras:view', 'compras:req:create', 'compras:req:view', 'compras:cot:create', 'compras:cot:edit', 'compras:po:create', 'compras:rec:operar', 'compras:approve',
    'almox:view', 'almox:ajustar', 'almox:patrimonial', 'almox:contagem:processar'
  ],
};

export interface RbacHookReturn {
  can: (claim: Claim) => boolean;
  anyOf: (claims: Claim[]) => boolean;
  allOf: (claims: Claim[]) => boolean;
  perfilAtivo: string;
  claimsAtivas: Claim[];
  isLoading: boolean;
}

export function useRbac(): RbacHookReturn {
  const { user } = useAuth();

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const claimsAtivas = useMemo(() => {
    if (!userRoles) return [];

    const allClaims = new Set<Claim>();
    userRoles.forEach(({ role }) => {
      const claims = ROLE_TO_CLAIMS[role as AppRole] || [];
      claims.forEach(claim => allClaims.add(claim));
    });

    return Array.from(allClaims);
  }, [userRoles]);

  const can = (claim: Claim): boolean => {
    return claimsAtivas.includes(claim);
  };

  const anyOf = (claims: Claim[]): boolean => {
    return claims.some(claim => can(claim));
  };

  const allOf = (claims: Claim[]): boolean => {
    return claims.every(claim => can(claim));
  };

  const perfilAtivo = userRoles?.[0]?.role || 'vendedor';

  return {
    can,
    anyOf,
    allOf,
    perfilAtivo,
    claimsAtivas,
    isLoading
  };
}

// HOC para proteger rotas
export function guardRoute(requiredClaims: Claim[]) {
  return function withGuard(Component: React.ComponentType<any>) {
    const ProtectedComponent = (props: any) => {
      const { anyOf } = useRbac();

      if (!anyOf(requiredClaims)) {
        return React.createElement(
          'div',
          { className: 'flex flex-col items-center justify-center min-h-[400px] text-center space-y-4' },
          React.createElement('div', { className: 'text-6xl' }, '🔒'),
          React.createElement('h2', { className: 'text-xl font-semibold' }, 'Acesso Restrito'),
          React.createElement(
            'p',
            { className: 'text-muted-foreground max-w-md' },
            'Você não possui as permissões necessárias para acessar esta funcionalidade.'
          ),
          React.createElement(
            'button',
            {
              onClick: () => window.history.back(),
              className: 'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
            },
            'Voltar'
          )
        );
      }

      return React.createElement(Component, props);
    };

    return ProtectedComponent;
  };
}
