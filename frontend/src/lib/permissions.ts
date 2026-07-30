import { Role } from '@/types';

export type PermissionAction =
  | 'view:dashboard'
  | 'view:analytics'
  | 'view:recruiters'
  | 'manage:recruiters'
  | 'create:recruiter'
  | 'edit:recruiter'
  | 'delete:recruiter'
  | 'view:profiles'
  | 'create:profile'
  | 'edit:profile'
  | 'delete:profile'
  | 'bulk:profile'
  | 'assign:profile'
  | 'view:applications'
  | 'create:application'
  | 'edit:application'
  | 'export:applications'
  | 'view:activity'
  | 'view:activity:all'
  | 'manage:activity'
  | 'export:activity'
  | 'view:updates'
  | 'manage:updates';

type RolePermissionMap = Record<Role, PermissionAction[]>;

const ROLE_PERMISSIONS: RolePermissionMap = {
  ADMIN: [
    'view:dashboard',
    'view:analytics',
    'view:recruiters',
    'manage:recruiters',
    'create:recruiter',
    'edit:recruiter',
    'delete:recruiter',
    'view:profiles',
    'create:profile',
    'edit:profile',
    'delete:profile',
    'bulk:profile',
    'assign:profile',
    'view:applications',
    'create:application',
    'edit:application',
    'export:applications',
    'view:activity',
    'view:activity:all',
    'manage:activity',
    'export:activity',
    'view:updates',
    'manage:updates',
  ],
  TEAM_LEADER: [
    'view:dashboard',
    'view:analytics',
    'view:recruiters',
    'view:profiles',
    'create:profile',
    'edit:profile',
    'bulk:profile',
    'assign:profile',
    'view:applications',
    'create:application',
    'edit:application',
    'export:applications',
    'view:activity',
    'view:activity:all',
    'manage:activity',
    'export:activity',
    'view:updates',
  ],
  RECRUITER: [
    'view:profiles',
    'edit:profile',
    'view:applications',
    'create:application',
    'edit:application',
    'export:applications',
    'view:activity',
    'export:activity',
    'view:updates',
  ],
  RESUME_ASSIST: [
    'view:dashboard',
    'view:activity',
    'view:updates',
  ],
  SALES_EXEC: [
    'view:dashboard',
    'view:activity',
    'view:updates',
  ],
};

export function hasPermission(role: Role | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(action) : false;
}

export function hasAnyPermission(role: Role | undefined, actions: PermissionAction[]): boolean {
  if (!role) return false;
  return actions.some((a) => hasPermission(role, a));
}

export function hasRole(userRole: Role | undefined, ...roles: Role[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

export function isManagerRole(role: Role | undefined): boolean {
  return hasRole(role, 'ADMIN', 'TEAM_LEADER');
}

export function getRoleLabel(role: Role | string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'TEAM_LEADER':
      return 'Team Leader';
    case 'RECRUITER':
      return 'Recruiter';
    case 'RESUME_ASSIST':
      return 'Resume Assist';
    case 'SALES_EXEC':
      return 'Sales Executive';
    default:
      return role;
  }
}

export function getRoleBadgeVariant(role: Role | undefined): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'ADMIN':
      return 'default';
    case 'TEAM_LEADER':
      return 'secondary';
    default:
      return 'outline';
  }
}

// For fine-grained checks based on ownership
export interface OwnershipContext {
  ownerId?: string | null;
  assignedRecruiterIds?: string[];
  createdById?: string | null;
}

export function canEditProfile(
  role: Role | undefined,
  currentUserId: string | undefined,
  context?: OwnershipContext
): boolean {
  if (!role || !currentUserId) return false;
  if (role === 'ADMIN') return true;
  if (role === 'TEAM_LEADER') {
    if (!context) return true; // TL can generally edit, scoped by team in backend
    // if profile assigned to self or to team member created by TL
    return true;
  }
  if (role === 'RECRUITER') {
    if (!context?.assignedRecruiterIds) return false;
    return context.assignedRecruiterIds.includes(currentUserId);
  }
  return false;
}

export const PERMISSIONS = {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasRole,
  isManagerRole,
};
