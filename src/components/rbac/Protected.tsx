import React from 'react';
import { useRbacPermissions } from '@/hooks/useRbacPermissions';
import type { Claim } from '@/modules/rh/rbac/claims';
import { toast } from 'sonner';

interface ProtectedProps {
  children: React.ReactNode;
  perm: Claim;
  fallback?: React.ReactNode;
  showToast?: boolean;
}

/**
 * Component wrapper para proteger conteúdo por permissão
 */
export function Protected({ children, perm, fallback = null, showToast = false }: ProtectedProps) {
  const { can } = useRbacPermissions();

  if (!can(perm)) {
    if (showToast) {
      toast.error('Permissão insuficiente', {
        description: `Você não tem permissão para: ${perm}`
      });
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface IfPermProps {
  children: React.ReactNode;
  perm: Claim;
  any?: Claim[];
  all?: Claim[];
}

/**
 * Component condicional para renderizar baseado em permissão
 */
export function IfPerm({ children, perm, any, all }: IfPermProps) {
  const { can, canAny, canAll } = useRbacPermissions();

  let hasPermission = false;

  if (perm) {
    hasPermission = can(perm);
  } else if (any) {
    hasPermission = canAny(any);
  } else if (all) {
    hasPermission = canAll(all);
  }

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}

interface PermButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  perm: Claim;
  children: React.ReactNode;
  showTooltip?: boolean;
}

/**
 * Button que só aparece se tiver permissão
 */
export function PermButton({ perm, children, showTooltip = true, onClick, ...props }: PermButtonProps) {
  const { can } = useRbacPermissions();

  const hasPermission = can(perm);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!hasPermission) {
      e.preventDefault();
      toast.error('Permissão insuficiente', {
        description: `Você não tem permissão para: ${perm}`
      });
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  };

  if (!hasPermission) {
    return null;
  }

  return (
    <button
      {...props}
      onClick={handleClick}
      title={showTooltip ? `Requer: ${perm}` : props.title}
    >
      {children}
    </button>
  );
}