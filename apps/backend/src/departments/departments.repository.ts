import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { departments, employees } from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';

export type DepartmentRow = typeof departments.$inferSelect;

@Injectable()
export class DepartmentsRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async findById(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<DepartmentRow | null> {
    const [result] = await executor
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), notDeleted(departments)))
      .limit(1);
    return result ?? null;
  }

  async findAllWithCount(
    query: DepartmentQueryDto,
  ): Promise<[DepartmentRow[], number]> {
    const { page = 1, limit = 20, search } = query;

    const filters: SQL[] = [notDeleted(departments)];
    if (search) {
      const searchFilter = or(
        ilike(departments.name, `%${search}%`),
        ilike(departments.code, `%${search}%`),
      );
      if (searchFilter) filters.push(searchFilter);
    }
    const where = and(...filters);

    const data = await this.db
      .select()
      .from(departments)
      .where(where)
      .limit(limit)
      .offset((page - 1) * limit);

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(where);

    return [data, Number(totalResult?.count ?? 0)];
  }

  async createAndSave(
    dto: CreateDepartmentDto,
    executor: DbExecutor = this.db,
  ): Promise<DepartmentRow | null> {
    const [result] = await executor
      .insert(departments)
      .values(dto)
      .returning();
    return result ?? null;
  }

  async updateAndSave(
    id: string,
    dto: UpdateDepartmentDto,
    executor: DbExecutor = this.db,
  ): Promise<DepartmentRow | null> {
    const [result] = await executor
      .update(departments)
      .set(dto)
      .where(and(eq(departments.id, id), notDeleted(departments)))
      .returning();
    return result ?? null;
  }

  async softDelete(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<DepartmentRow | null> {
    const [result] = await executor
      .update(departments)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(and(eq(departments.id, id), notDeleted(departments)))
      .returning();
    return result ?? null;
  }

  async isLinkedToEmployees(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<boolean> {
    const [employee] = await executor
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(eq(employees.departmentId, id), notDeleted(employees)),
      )
      .limit(1);
    return !!employee;
  }
}
