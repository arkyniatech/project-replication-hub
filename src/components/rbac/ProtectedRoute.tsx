import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import type { Claim } from '@/modules/rh/rbac/claims';

interface ProtectedRouteProps {
  children: React.ReactNode;
  perm: Claim;
  redirectTo?: string;
}

/**
 * Wrapper para proteger rotas inteiras por permissão
 */
export function ProtectedRoute({
  children,
  perm,
  redirectTo = '/403'
}: ProtectedRouteProps) {
  const { can, isLoading } = useRbacPermissions();

  // Enquanto as roles do usuário carregam, claimsAtivas=[] — não redirecionar
  // ainda, senão o usuário legítimo pisca no /403 antes das claims chegarem.
  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando…</div>;
  }

  if (!can(perm)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

interface RequirePermsProps {
  children: React.ReactNode;
  any?: Claim[];
  all?: Claim[];
  redirectTo?: string;
}

/**
 * Wrapper para proteger rotas com múltiplas permissões
 */
export function RequirePerms({
  children,
  any,
  all,
  redirectTo = '/403'
}: RequirePermsProps) {
  const { canAny, canAll, isLoading } = useRbacPermissions();

  // Espera o carregamento das roles antes de decidir (evita flash de /403).
  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Carregando…</div>;
  }

  let hasPermission = false;

  if (any) {
    hasPermission = canAny(any);
  } else if (all) {
    hasPermission = canAll(all);
  }

  if (!hasPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}