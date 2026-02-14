import { ReactNode } from 'react';
import { useRbac } from '@/hooks/useRbac';
import { Claim } from '@/modules/rh/rbac/claims';

interface RbacGuardProps {
  claims: Claim[];
  mode?: 'any' | 'all'; // any = pelo menos uma claim, all = todas as claims
  fallback?: ReactNode;
  children: ReactNode;
}

export function RbacGuard({ 
  claims, 
  mode = 'any', 
  fallback = null,
  children 
}: RbacGuardProps) {
  const { anyOf, allOf } = useRbac();
  
  const hasPermission = mode === 'any' ? anyOf(claims) : allOf(claims);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Componente para botões condicionais
interface RbacButtonProps {
  claims: Claim[];
  mode?: 'any' | 'all';
  children: ReactNode;
  disabledTooltip?: string;
}

export function RbacButton({ 
  claims, 
  mode = 'any', 
  children,
  disabledTooltip = "Permissão necessária"
}: RbacButtonProps) {
  const { anyOf, allOf } = useRbac();
  
  const hasPermission = mode === 'any' ? anyOf(claims) : allOf(claims);
  
  if (!hasPermission) {
    return (
      <div className="relative group">
        <div className="opacity-50 cursor-not-allowed">
          {children}
        </div>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {disabledTooltip}
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

// HOC para proteger componentes
export function withRbac<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredClaims: Claim[],
  mode: 'any' | 'all' = 'any'
) {
  return function RbacWrappedComponent(props: P) {
    return (
      <RbacGuard claims={requiredClaims} mode={mode}>
        <WrappedComponent {...props} />
      </RbacGuard>
    );
  };
}