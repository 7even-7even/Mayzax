import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionAction } from '@/lib/permissions';
import { Role } from '@/types';

interface PermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  // ways to gate
  permission?: PermissionAction;
  permissions?: PermissionAction[]; // any
  roles?: Role[];
  requireAllPermissions?: boolean;
}

export function PermissionGate({
  children,
  fallback = null,
  permission,
  permissions,
  roles,
  requireAllPermissions = false,
}: PermissionGateProps) {
  const { can, canAny, hasRole, role } = usePermissions();

  if (roles && roles.length > 0) {
    if (!hasRole(...roles)) return <>{fallback}</>;
  }

  if (permission) {
    if (!can(permission)) return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0) {
    const hasPerms = requireAllPermissions
      ? permissions.every((p) => can(p))
      : canAny(permissions);
    if (!hasPerms) return <>{fallback}</>;
  }

  // if no specific gate, check we have a role at all
  if (!role) return <>{fallback}</>;

  return <>{children}</>;
}

interface RoleGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  allow: Role[];
}

export function RoleGate({ children, fallback = null, allow }: RoleGateProps) {
  const { hasRole } = usePermissions();
  if (!hasRole(...allow)) return <>{fallback}</>;
  return <>{children}</>;
}
