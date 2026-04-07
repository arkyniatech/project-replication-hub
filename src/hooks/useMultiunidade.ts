import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SessionState } from '@/types';

const SESSION_KEY = 'erp-session';
const LOJA_EXPIRE_TIME = 24 * 60 * 60 * 1000; // 24 horas

interface Loja {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

// Validar se é UUID válido
const isValidUUID = (str: string | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

function getSession(): SessionState {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return { lojaAtivaId: null, lembraUltimaLoja: false };
      }
      return session;
    }
  } catch (error) {
    console.error('Erro ao carregar sessão:', error);
  }
  return { lojaAtivaId: null, lembraUltimaLoja: false };
}

function setSession(session: SessionState) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Erro ao salvar sessão:', error);
  }
}

export function useMultiunidade() {
  const [session, setSessionState] = useState<SessionState>(getSession());

  // Buscar user roles para verificar permissões
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles-multi'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    }
  });

  // Buscar todas as lojas do Supabase
  const { data: lojas = [], isLoading: loadingLojas } = useQuery({
    queryKey: ['lojas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar lojas permitidas para o usuário atual
  const { data: userLojas = [], isLoading: loadingUserLojas } = useQuery({
    queryKey: ['user-lojas'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_lojas_permitidas')
        .select('loja_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(ul => ul.loja_id) || [];
    }
  });

  // Buscar perfil do usuário para loja padrão
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('loja_padrao_id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const loading = loadingLojas || loadingUserLojas;

  // Verifica se o usuário pode ver todas as lojas (admin ou gestor)
  const canViewAllLojas = useCallback((): boolean => {
    return userRoles.includes('admin') || userRoles.includes('gestor') || userRoles.includes('master');
  }, [userRoles]);

  const getLojasPermitidas = (): Loja[] => {
    // Master/admin/gestor veem TODAS as lojas, independente de user_lojas_permitidas
    if (canViewAllLojas()) return lojas;
    if (userLojas.length === 0) return lojas; // Fallback: sem restrições
    return lojas.filter(loja => userLojas.includes(loja.id));
  };

  const getLojaAtual = (): Loja | null => {
    if (!session.lojaAtivaId || session.lojaAtivaId === 'TODAS') return null;
    return lojas.find(loja => loja.id === session.lojaAtivaId) || null;
  };

  const selecionarLoja = (lojaId: string, lembrar: boolean = false) => {
    // Validar se é UUID válido ou "TODAS"
    if (lojaId !== 'TODAS' && !isValidUUID(lojaId)) {
      console.error('ID de loja inválido:', lojaId);
      return;
    }
    
    const novaSession: SessionState = {
      lojaAtivaId: lojaId,
      lembraUltimaLoja: lembrar,
      expiresAt: lembrar ? Date.now() + LOJA_EXPIRE_TIME : undefined
    };
    
    setSession(novaSession);
    setSessionState(novaSession);
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const trocarLoja = (novaLojaId: string) => {
    // Permitir "TODAS" apenas para admin/gestor
    if (novaLojaId === 'TODAS' && !canViewAllLojas()) {
      console.error('Usuário não tem permissão para ver todas as lojas');
      return;
    }
    
    // Validar se é UUID válido (exceto "TODAS")
    if (novaLojaId !== 'TODAS' && !isValidUUID(novaLojaId)) {
      console.error('ID de loja inválido:', novaLojaId);
      return;
    }

    const novaSession: SessionState = {
      ...session,
      lojaAtivaId: novaLojaId
    };
    
    setSession(novaSession);
    setSessionState(novaSession);
    
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionState({ lojaAtivaId: null, lembraUltimaLoja: false });
  };

  // Retorna as lojas efetivas baseado no contexto (todas ou permitidas)
  const getEffectiveLojas = (): Loja[] => {
    if (session.lojaAtivaId === 'TODAS' && canViewAllLojas()) {
      return lojas;
    }
    return getLojasPermitidas();
  };

  const needsLojaSelection = (): boolean => {
    const lojasPermitidas = getLojasPermitidas();
    return lojasPermitidas.length > 1 && !session.lojaAtivaId;
  };

  const canAccessLoja = (lojaId: string): boolean => {
    if (lojaId === 'TODAS') return canViewAllLojas();
    return getLojasPermitidas().some(loja => loja.id === lojaId);
  };

  // Auto-selecionar loja padrão se não houver loja ativa ou se for inválida
  useEffect(() => {
    // Verificar se precisa migrar de código antigo para UUID
    const precisaMigrar = session.lojaAtivaId && 
                         session.lojaAtivaId !== 'TODAS' && 
                         !isValidUUID(session.lojaAtivaId);
    
    if ((precisaMigrar || !session.lojaAtivaId) && !loading && lojas.length > 0) {
      const lojasPermitidas = getLojasPermitidas();
      
      // Se tinha um código antigo (ex: "loja-1"), tentar migrar
      if (precisaMigrar && session.lojaAtivaId) {
        // Tentar encontrar a primeira loja (código antigo era geralmente "loja-1")
        const primeiraLoja = lojasPermitidas[0];
        if (primeiraLoja) {
          console.log('Migrando de código antigo para UUID:', session.lojaAtivaId, '->', primeiraLoja.id);
          selecionarLoja(primeiraLoja.id, session.lembraUltimaLoja);
          return;
        }
      }
      
      // Prioridade 1: Loja padrão do perfil
      if (userProfile?.loja_padrao_id && 
          isValidUUID(userProfile.loja_padrao_id) &&
          lojasPermitidas.some(l => l.id === userProfile.loja_padrao_id)) {
        selecionarLoja(userProfile.loja_padrao_id, true);
      } 
      // Prioridade 2: Se tem apenas uma loja, selecionar automaticamente
      else if (lojasPermitidas.length === 1) {
        selecionarLoja(lojasPermitidas[0].id, true);
      }
      // Prioridade 3: Se tem múltiplas lojas mas nenhuma padrão, selecionar a primeira
      else if (lojasPermitidas.length > 0) {
        selecionarLoja(lojasPermitidas[0].id, false);
      }
    }
  }, [session.lojaAtivaId, userProfile, loading, lojas.length]);

  return {
    session,
    lojas,
    loading,
    lojaAtual: getLojaAtual(),
    lojasPermitidas: getLojasPermitidas(),
    needsLojaSelection: needsLojaSelection(),
    selecionarLoja,
    trocarLoja,
    logout,
    canAccessLoja,
    canViewAllLojas,
    getEffectiveLojas
  };
}

// Helper function para usar em filtros
export function getLojaAtivaId(): string | null {
  const session = getSession();
  return session.lojaAtivaId;
}