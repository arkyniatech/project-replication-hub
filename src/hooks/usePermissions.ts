import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { PermissoesPerfil } from '@/types';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Permissões por papel REAL (user_roles no Supabase). Mantém o formato
// PermissoesPerfil que as ~17 telas consumidoras já usam. A autoridade final
// continua sendo a RLS do banco — isto aqui só esconde/mostra ações na UI.
// (Substitui o mock antigo com isDevelopment=true, que liberava tudo p/ todos
// e lia um perfil simulado de localStorage/?role= — backdoors removidos.)

const VAZIO: PermissoesPerfil = {
  clientes: { ver: false, criar: false, editar: false, excluir: false },
  equipamentos: { ver: false, criar: false, editar: false, excluir: false },
  contratos: { ver: false, criar: false, editar: false, excluir: false, renovar: false, devolverSubstituir: false },
  financeiro: { ver: false, criar: false, editar: false, excluir: false, emitirFatura: false, receberPagamento: false },
  inadimplencia: { ver: false, criar: false, editar: false, excluir: false, enviarMensagens: false },
  manutencaoOS: { ver: false, criar: false, editar: false, excluir: false },
  logistica: { ver: false, criar: false, editar: false, excluir: false },
  caixa: { ver: false, gerirCaixa: false },
  configuracoes: { gerirConfiguracoes: false },
};

const TOTAL: PermissoesPerfil = {
  clientes: { ver: true, criar: true, editar: true, excluir: true },
  equipamentos: { ver: true, criar: true, editar: true, excluir: true },
  contratos: { ver: true, criar: true, editar: true, excluir: true, renovar: true, devolverSubstituir: true },
  financeiro: { ver: true, criar: true, editar: true, excluir: true, emitirFatura: true, receberPagamento: true },
  inadimplencia: { ver: true, criar: true, editar: true, excluir: true, enviarMensagens: true },
  manutencaoOS: { ver: true, criar: true, editar: true, excluir: true },
  logistica: { ver: true, criar: true, editar: true, excluir: true },
  caixa: { ver: true, gerirCaixa: true },
  configuracoes: { gerirConfiguracoes: true },
};

type PermParcial = { [D in keyof PermissoesPerfil]?: Partial<PermissoesPerfil[D]> };

const POR_PAPEL: Partial<Record<AppRole, PermParcial>> = {
  master: TOTAL,
  admin: TOTAL,
  financeiro: {
    clientes: { ver: true },
    equipamentos: { ver: true },
    contratos: { ver: true },
    financeiro: { ver: true, criar: true, editar: true, excluir: false, emitirFatura: true, receberPagamento: true },
    inadimplencia: { ver: true, criar: true, editar: true, enviarMensagens: true },
    caixa: { ver: true, gerirCaixa: true },
  },
  gestor: {
    clientes: { ver: true, criar: true, editar: true },
    equipamentos: { ver: true, criar: true, editar: true },
    contratos: { ver: true, criar: true, editar: true, renovar: true, devolverSubstituir: true },
    financeiro: { ver: true, emitirFatura: true },
    inadimplencia: { ver: true, enviarMensagens: true },
    manutencaoOS: { ver: true, criar: true, editar: true },
    logistica: { ver: true, criar: true, editar: true },
    caixa: { ver: true },
  },
  vendedor: {
    clientes: { ver: true, criar: true, editar: true },
    equipamentos: { ver: true },
    contratos: { ver: true, criar: true, editar: true, renovar: true },
    financeiro: { ver: true },
    logistica: { ver: true },
  },
  operacao: {
    equipamentos: { ver: true, editar: true },
    contratos: { ver: true, devolverSubstituir: true },
    manutencaoOS: { ver: true, criar: true, editar: true },
    logistica: { ver: true, criar: true, editar: true },
  },
  mecanico: {
    equipamentos: { ver: true },
    manutencaoOS: { ver: true, criar: true, editar: true },
  },
  motorista: {
    logistica: { ver: true, editar: true },
  },
  rh: {
    clientes: { ver: true },
  },
  usuario: {},
};

function mesclar(roles: AppRole[]): PermissoesPerfil {
  const out: PermissoesPerfil = JSON.parse(JSON.stringify(VAZIO));
  for (const role of roles) {
    const parcial = POR_PAPEL[role];
    if (!parcial) continue;
    for (const dominio of Object.keys(out) as (keyof PermissoesPerfil)[]) {
      const d = parcial[dominio];
      if (!d) continue;
      for (const [acao, valor] of Object.entries(d)) {
        if (valor === true) (out[dominio] as Record<string, boolean>)[acao] = true;
      }
    }
  }
  return out;
}

export function usePermissions() {
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
    enabled: !!user?.id,
  });

  const roles = useMemo(() => (userRoles ?? []).map((r) => r.role as AppRole), [userRoles]);
  const permissions = useMemo(() => mesclar(roles), [roles]);

  const can = (dominio: keyof PermissoesPerfil, acao: string): boolean => {
    // Enquanto os papéis carregam, libera otimista: a RLS do banco é a
    // autoridade — isto evita flash de "Acesso Negado" a cada navegação.
    if (isLoading) return true;
    const dominioPermissions = permissions[dominio];
    if (!dominioPermissions) return false;
    return (dominioPermissions as Record<string, boolean>)[acao] === true;
  };

  // API preservada p/ os consumidores antigos; simulação de perfil foi
  // removida (era um backdoor via localStorage/?role=).
  const isSimulating = (): boolean => false;
  const getSimulatedProfileName = (): string | null => null;

  return {
    permissions,
    currentProfile: roles[0] ?? 'usuario',
    can,
    isSimulating,
    getSimulatedProfileName,
  };
}

// Convenience hook for common permission checks
export function usePermissionChecks() {
  const { can } = usePermissions();

  return {
    canViewClientes: () => can('clientes', 'ver'),
    canCreateClientes: () => can('clientes', 'criar'),
    canEditClientes: () => can('clientes', 'editar'),
    canDeleteClientes: () => can('clientes', 'excluir'),

    canViewContratos: () => can('contratos', 'ver'),
    canCreateContratos: () => can('contratos', 'criar'),
    canEditContratos: () => can('contratos', 'editar'),
    canRenovarContratos: () => can('contratos', 'renovar'),
    canDevolverContratos: () => can('contratos', 'devolverSubstituir'),

    canViewFinanceiro: () => can('financeiro', 'ver'),
    canEmitirFatura: () => can('financeiro', 'emitirFatura'),
    canReceberPagamento: () => can('financeiro', 'receberPagamento'),

    canViewInadimplencia: () => can('inadimplencia', 'ver'),
    canEnviarMensagens: () => can('inadimplencia', 'enviarMensagens'),

    canGerirCaixa: () => can('caixa', 'gerirCaixa'),
    canGerirConfiguracoes: () => can('configuracoes', 'gerirConfiguracoes'),

    can
  };
}
