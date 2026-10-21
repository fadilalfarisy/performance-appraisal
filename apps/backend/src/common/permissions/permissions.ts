import { UserRole } from '@appraisal/types';

/** Roles that see every department. */
export const GLOBAL_SCOPE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.HR,
  UserRole.GENERAL_MANAGER,
];

/**
 * The PRD 5.8 permission matrix as data. Controllers and services read this
 * instead of scattering role checks through their code.
 */
export type Permission =
  | 'department:manage'
  | 'position:manage'
  | 'employee:manage'
  | 'contract:manage'
  | 'user:manage'
  | 'criteria:manage'
  | 'appraisal:create'
  | 'appraisal:rate'
  | 'appraisal:submit'
  | 'appraisal:approve'
  | 'appraisal:complete'
  | 'appraisal:reopen'
  | 'note:manage'
  | 'audit:read';

export const PERMISSIONS: Record<Permission, UserRole[]> = {
  'department:manage': [UserRole.ADMIN],
  'position:manage': [UserRole.ADMIN],
  'employee:manage': [UserRole.ADMIN, UserRole.HR],
  'contract:manage': [UserRole.ADMIN, UserRole.HR],
  'user:manage': [UserRole.ADMIN],
  'criteria:manage': [UserRole.ADMIN, UserRole.HR],
  'appraisal:create': [UserRole.HR],
  'appraisal:rate': [UserRole.HEAD_DEPARTMENT],
  'appraisal:submit': [UserRole.HEAD_DEPARTMENT],
  'appraisal:approve': [UserRole.MANAGER],
  'appraisal:complete': [UserRole.GENERAL_MANAGER],
  'appraisal:reopen': [UserRole.ADMIN],
  'note:manage': [UserRole.HEAD_DEPARTMENT, UserRole.SUPERVISOR],
  'audit:read': [UserRole.ADMIN, UserRole.HR],
};

export function can(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return PERMISSIONS[permission].includes(role as UserRole);
}
