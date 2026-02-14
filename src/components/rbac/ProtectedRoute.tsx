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
  const { can } = useRbacPermissions();

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
  const { canAny, canAll } = useRbacPermissions();

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