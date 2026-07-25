import { useMemo, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  hasPermission,
  hasAnyPermission,
  hasRole,
  isManagerRole,
  canEditProfile,
  PermissionAction,
  OwnershipContext,
} from '@/lib/permissions';
import { Role } from '@/types';

export function usePermissions() {
  const { user } = useAuth();

  const role = user?.role as Role | undefined;
  const userId = user?.id;

  const can = useCallback(
    (action: PermissionAction): boolean => {
      return hasPermission(role, action);
    },
    [role]
  );

  const canAny = useCallback(
    (actions: PermissionAction[]): boolean => {
      return hasAnyPermission(role, actions);
    },
    [role]
  );

  const hasRoleCheck = useCallback(
    (...roles: Role[]): boolean => {
      return hasRole(role, ...roles);
    },
    [role]
  );

  const permissions = useMemo(() => {
    return {
      // role flags
      role,
      userId,
      isAdmin: role === 'ADMIN',
      isTeamLeader: role === 'TEAM_LEADER',
      isRecruiter: role === 'RECRUITER',
      isManager: isManagerRole(role),

      // core permission helpers
      can,
      canAny,
      hasRole: hasRoleCheck,

      // granular helpers
      canViewDashboard: hasPermission(role, 'view:dashboard'),
      canViewAnalytics: hasPermission(role, 'view:analytics'),
      canManageRecruiters: hasPermission(role, 'manage:recruiters'),
      canViewRecruiters: hasPermission(role, 'view:recruiters'),
      canCreateRecruiter: hasPermission(role, 'create:recruiter'),
      canDeleteRecruiter: hasPermission(role, 'delete:recruiter'),

      canViewProfiles: hasPermission(role, 'view:profiles'),
      canCreateProfile: hasPermission(role, 'create:profile'),
      canEditProfile: hasPermission(role, 'edit:profile'),
      canDeleteProfile: hasPermission(role, 'delete:profile'),
      canBulkProfile: hasPermission(role, 'bulk:profile'),
      canAssignProfile: hasPermission(role, 'assign:profile'),

      canViewApplications: hasPermission(role, 'view:applications'),
      canCreateApplication: hasPermission(role, 'create:application'),
      canExportApplications: hasPermission(role, 'export:applications'),

      canViewActivity: hasPermission(role, 'view:activity'),
      canViewAllActivity: hasPermission(role, 'view:activity:all'),
      canExportActivity: hasPermission(role, 'export:activity'),
      canManageActivity: hasPermission(role, 'manage:activity'),

      canViewUpdates: hasPermission(role, 'view:updates'),
      canManageUpdates: hasPermission(role, 'manage:updates'),

      // ownership-aware
      canEditProfileOwned: (ctx?: OwnershipContext) => canEditProfile(role, userId, ctx),
    };
  }, [role, userId, can, canAny, hasRoleCheck]);

  return permissions;
}

// Alias for simpler API: useCan()
export function useCan() {
  const perms = usePermissions();
  return perms.can;
}
