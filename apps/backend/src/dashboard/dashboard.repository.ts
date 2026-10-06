import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database } from '../db/db.type';
import { appraisals, departments, employees } from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async appraisalsByStatus(departmentIds?: string[]) {
    const filters: SQL[] = [notDeleted(appraisals)];
    if (departmentIds) {
      filters.push(
        departmentIds.length === 0
          ? sql`1 = 0`
          : inArray(appraisals.departmentId, departmentIds),
      );
    }

    const rows = await this.db
      .select({ status: appraisals.status, count: sql<number>`count(*)` })
      .from(appraisals)
      .where(and(...filters))
      .groupBy(appraisals.status);

    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async employeeTotal(departmentIds?: string[]): Promise<number> {
    const filters: SQL[] = [notDeleted(employees)];
    if (departmentIds) {
      filters.push(
        departmentIds.length === 0
          ? sql`1 = 0`
          : inArray(employees.departmentId, departmentIds),
      );
    }

    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(and(...filters));

    return Number(row?.count ?? 0);
  }

  async employeesByDepartment(departmentIds?: string[]) {
    const filters: SQL[] = [notDeleted(departments), eq(departments.isActive, true)];
    if (departmentIds) {
      filters.push(
        departmentIds.length === 0
          ? sql`1 = 0`
          : inArray(departments.id, departmentIds),
      );
    }

    const rows = await this.db
      .select({
        departmentId: departments.id,
        department: departments.name,
        total: sql<number>`count(${employees.id})`,
      })
      .from(departments)
      .leftJoin(
        employees,
        and(eq(employees.departmentId, departments.id), notDeleted(employees)),
      )
      .where(and(...filters))
      .groupBy(departments.id, departments.name)
      .orderBy(asc(departments.name));

    return rows.map((row) => ({
      departmentId: row.departmentId,
      department: row.department,
      total: Number(row.total),
    }));
  }
}
