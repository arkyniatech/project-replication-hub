// Export all RBAC components and hooks for easy importing
export { Protected, IfPerm, PermButton } from './Protected';
export { ProtectedRoute, RequirePerms } from './ProtectedRoute';
export { useRbacPermissions, usePermissionChecks } from '@/hooks/useRbacPermissions';
export type { Permission } from '@/modules/rh/utils/rbac';