import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, sql, ilike, and } from 'drizzle-orm';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';

@Injectable()
export class DepartmentsRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, id))
      .limit(1);
    return result || null;
  }

  async findAllWithCount(query: DepartmentQueryDto): Promise<[any[], number]> {
    const { page = 1, limit = 20, search } = query;

    const whereClauses = [];
    if (search) {
      whereClauses.push(ilike(schema.departments.name, `%${search}%`));
    }

    const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const data = await this.db
      .select()
      .from(schema.departments)
      .where(where)
      .limit(limit)
      .offset((page - 1) * limit);

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.departments)
      .where(where);

    if (!totalResult || totalResult.count === undefined) {
      throw new Error('Failed to count departments');
    }

    return [data, Number(totalResult.count ?? 0)];
  }

  async createAndSave(dto: CreateDepartmentDto) {
    const [result] = await this.db
      .insert(schema.departments)
      .values(dto)
      .returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdateDepartmentDto) {
    const [result] = await this.db
      .update(schema.departments)
      .set(dto)
      .where(eq(schema.departments.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.departments)
      .where(eq(schema.departments.id, id))
      .returning();
    return result || null;
  }

  async isLinkedToEmployees(id: string): Promise<boolean> {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.departmentId, id))
      .limit(1);
    return !!employee;
  }
}
