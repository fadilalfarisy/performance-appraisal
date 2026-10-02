import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { AuthenticatedUser } from '@appraisal/types';
import { DB_CONNECTION } from '../../db/db.constants';
import type { Database } from '../../db/db.type';
import { userDepartments } from '../../db/schema';
import { GLOBAL_SCOPE_ROLES } from '../permissions/permissions';

export type DepartmentScope = 'ALL' | string[];

@Injectable()
export class ScopeService {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  /**
   * Returns the department ids a user may access, or 'ALL' for global roles
   * (ADMIN, HR, GENERAL_MANAGER).
   */
  async getDepartmentScope(user: AuthenticatedUser): Promise<DepartmentScope> {
    const role = user.roles[0];
    if (role && GLOBAL_SCOPE_ROLES.includes(role as never)) {
      return 'ALL';
    }

    const rows = await this.db
      .select({ departmentId: userDepartments.departmentId })
      .from(userDepartments)
      .where(eq(userDepartments.userId, user.userId));

    return rows.map((row) => row.departmentId);
  }

  async canAccessDepartment(
    user: AuthenticatedUser,
    departmentId: string,
  ): Promise<boolean> {
    const scope = await this.getDepartmentScope(user);
    return scope === 'ALL' || scope.includes(departmentId);
  }

  /** Out-of-scope records are reported as 404 so their existence never leaks. */
  async assertDepartmentAccess(
    user: AuthenticatedUser,
    departmentId: string,
  ): Promise<void> {
    if (!(await this.canAccessDepartment(user, departmentId))) {
      throw new NotFoundException();
    }
  }
}
