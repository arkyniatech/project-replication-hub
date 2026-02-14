import { useState, useEffect } from 'react';
import type { PermissoesPerfil } from '@/types';

// Development mode - sempre permite acesso total
const isDevelopment = true;

// Mock current user - replace with real auth context
const getCurrentUser = () => ({
  id: "1",
  nome: "Admin Sistema",
  perfilId: "admin"
});

// Get simulated profile from localStorage
const getSimulatedProfile = (): string | null => {
  return localStorage.getItem('simulandoPerfilId');
};

// Permissões completas para desenvolvimento
const getFullPermissions = (): PermissoesPerfil => ({
  clientes: { ver: true, criar: true, editar: true, excluir: true },
  equipamentos: { ver: true, criar: true, editar: true, excluir: true },
  contratos: { ver: true, criar: true, editar: true, excluir: true, renovar: true, devolverSubstituir: true },
  financeiro: { ver: true, criar: true, editar: true, excluir: true, emitirFatura: true, receberPagamento: true },
  inadimplencia: { ver: true, criar: true, editar: true, excluir: true, enviarMensagens: true },
  manutencaoOS: { ver: true, criar: true, editar: true, excluir: true },
  logistica: { ver: true, criar: true, editar: true, excluir: true },
  caixa: { ver: true, gerirCaixa: true },
  configuracoes: { gerirConfiguracoes: true }
});

// Get user permissions from config
const getUserPermissions = (perfilId: string): PermissoesPerfil | null => {
  // Em desenvolvimento, sempre retorna permissões completas
  if (isDevelopment) {
    return getFullPermissions();
  }

  try {
    const stored = localStorage.getItem('erp-config');
    if (stored) {
      const config = JSON.parse(stored);
      return config.perfis?.[perfilId]?.permissoes || null;
    }
  } catch (error) {
    console.error('Erro ao carregar permissões:', error);
  }
  
  // Fallback para admin se não encontrar
  return getFullPermissions();
};

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissoesPerfil | null>(null);
  const [currentProfile, setCurrentProfile] = useState<string>('admin');

  useEffect(() => {
    const user = getCurrentUser();
    const simulatedProfile = getSimulatedProfile();
    const activeProfile = simulatedProfile || user.perfilId;
    
    setCurrentProfile(activeProfile);
    setPermissions(getUserPermissions(activeProfile));
  }, []);

  const can = (dominio: keyof PermissoesPerfil, acao: string): boolean => {
    // Em desenvolvimento, sempre permite
    if (isDevelopment) return true;
    
    if (!permissions) return false;
    
    const dominioPermissions = permissions[dominio];
    if (!dominioPermissions) return false;
    
    return (dominioPermissions as any)[acao] === true;
  };

  const isSimulating = (): boolean => {
    return getSimulatedProfile() !== null;
  };

  const getSimulatedProfileName = (): string | null => {
    const profileId = getSimulatedProfile();
    if (!profileId) return null;
    
    try {
      const stored = localStorage.getItem('erp-config');
      if (stored) {
        const config = JSON.parse(stored);
        return config.perfis?.[profileId]?.nome || profileId;
      }
    } catch (error) {
      console.error('Erro ao carregar nome do perfil:', error);
    }
    
    return profileId;
  };

  return {
    permissions,
    currentProfile,
    can,
    isSimulating,
    getSimulatedProfileName
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