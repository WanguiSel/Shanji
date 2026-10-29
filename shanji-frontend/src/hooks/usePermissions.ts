import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, ROLE_PERMISSIONS, type PermissionAction } from '../lib/permissions';
import type { User } from '../types';

export interface UserPermissions {
  can: (permission: PermissionAction) => boolean;
  role: string;
  permissions: PermissionAction[];
  isPM: boolean;
  isAssistant: boolean;
  isSiteSupervisor: boolean;
  isFinance: boolean;
  isProcurement: boolean;
  isOHS: boolean;
  isME: boolean;
}

export function usePermissions(user?: User | null): UserPermissions {
  const { profile } = useAuth();

  return useMemo(() => {
    const role = user?.role || (profile?.role as string) || 'member';
    const permissions = ROLE_PERMISSIONS.find((r) => r.role === role)?.permissions || [];

    return {
      role,
      permissions,
      can: (permission: PermissionAction) => hasPermission(role, permission),
      isPM: role === 'project_manager',
      isAssistant: role === 'project_assistant',
      isSiteSupervisor: role === 'site_supervisor',
      isFinance: role === 'finance',
      isProcurement: role === 'procurement',
      isOHS: role === 'ohs',
      isME: role === 'me',
    };
  }, [user, profile]);
}