import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import * as schema from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  private readonly selectClause = sql`
    SELECT
      e.id,
      e.employee_number AS "employeeNumber",
      e.full_name AS "fullName",
      e.birth_date AS "birthDate",
      e.join_date AS "joinDate",
      e.status,
      e.address,
      e.gender,
      json_build_object('id', m.id, 'fullName', m.full_name) AS superior,
      json_build_object('id', p.id, 'name', p.name) AS position,
      json_build_object('id', d.id, 'name', d.name) AS department,
      json_build_object(
        'id', c.id,
        'contractType', c.contract_type,
        'startDate', c.start_date,
        'endDate', c.end_date,
        'status', c.status
      ) AS contract
  `;

  private readonly fromClause = sql`
    FROM employees e
    LEFT JOIN employees m
      ON m.id = e.superior_id
    LEFT JOIN positions p
      ON p.id = e.position_id
    LEFT JOIN departments d
      ON d.id = e.department_id
    LEFT JOIN (
      SELECT employee_id, MAX(start_date) AS latest_start_date
      FROM contracts
      GROUP BY employee_id
    ) latest
      ON latest.employee_id = e.id
    LEFT JOIN contracts c
      ON c.employee_id = latest.employee_id
      AND c.start_date = latest.latest_start_date
  `;

  async findAllWithRelationAndQuery(
    whereClause: SQL,
    orderClause: SQL,
    limit: number,
    offset: number,
  ) {
    const result = await this.db.execute(sql`
      ${this.selectClause}
      ${this.fromClause}
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ${limit} OFFSET ${offset};
    `);

    return result.rows;
  }

  async countEmployees(whereClause: SQL): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT count(*)::int AS count
      ${this.fromClause}
      WHERE ${whereClause}
    `);

    return Number((result.rows[0] as { count: number } | undefined)?.count ?? 0);
  }

  async findOneWithRelations(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<Record<string, unknown> | null> {
    const result = await executor.execute(sql`
      ${this.selectClause}
      ${this.fromClause}
      WHERE e.id = ${id} AND e.deleted_at IS NULL
      LIMIT 1
    `);

    return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
  }

  async createAndSave(
    dto: CreateEmployeeDto,
    executor: DbExecutor = this.db,
  ) {
    const [result] = await executor
      .insert(schema.employees)
      .values(dto)
      .returning();
    return result ?? null;
  }

  async updateAndSave(
    id: string,
    dto: UpdateEmployeeDto,
    executor: DbExecutor = this.db,
  ) {
    const [result] = await executor
      .update(schema.employees)
      .set(dto)
      .where(and(eq(schema.employees.id, id), notDeleted(schema.employees)))
      .returning();
    return result ?? null;
  }

  async softDelete(id: string, executor: DbExecutor = this.db) {
    const [result] = await executor
      .update(schema.employees)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(and(eq(schema.employees.id, id), notDeleted(schema.employees)))
      .returning();
    return result ?? null;
  }

  async isLinkedToUsers(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<boolean> {
    const [user] = await executor
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(eq(schema.users.employeeId, id), notDeleted(schema.users)))
      .limit(1);
    return !!user;
  }
}
