import { UserRole } from '@appraisal/types';
import { can, PERMISSIONS, type Permission } from './permissions';

describe('permissions matrix', () => {
  const cases: Array<[UserRole | null, Permission, boolean]> = [
    [UserRole.ADMIN, 'department:manage', true],
    [UserRole.HR, 'department:manage', false],
    [UserRole.HR, 'employee:manage', true],
    [UserRole.HEAD_DEPARTMENT, 'employee:manage', false],
    [UserRole.HR, 'appraisal:create', true],
    [UserRole.HEAD_DEPARTMENT, 'appraisal:rate', true],
    [UserRole.SUPERVISOR, 'appraisal:rate', false],
    [UserRole.MANAGER, 'appraisal:approve', true],
    [UserRole.GENERAL_MANAGER, 'appraisal:complete', true],
    [UserRole.ADMIN, 'appraisal:reopen', true],
    [UserRole.SUPERVISOR, 'note:manage', true],
    [UserRole.HR, 'note:manage', false],
    [null, 'employee:manage', false],
  ];

  it.each(cases)('role %s -> %s = %s', (role, permission, expected) => {
    expect(can(role, permission)).toBe(expected);
  });

  it('every permission has at least one role', () => {
    for (const roles of Object.values(PERMISSIONS)) {
      expect(roles.length).toBeGreaterThan(0);
    }
  });
});
