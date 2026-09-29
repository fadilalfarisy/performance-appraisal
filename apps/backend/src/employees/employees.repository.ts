// employees/employees.repository.ts
import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, sql, SQL } from 'drizzle-orm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { DbExecutor } from '../db/db.type';

@Injectable()
export class EmployeesRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  private readonly selectClause = sql`
    SELECT
      e.id,
      e.nip,
      e.full_name AS "fullName",
      e.birth_date AS "birthDate",
      e.status,
      e.address,
      e.gender,
      json_build_object(
        'id', m.id,
        'fullName', m.full_name
      ) AS manager,
      json_build_object(
        'id', p.id,
        'name', p.name
      ) AS position,
      json_build_object(
        'id', d.id,
        'name', d.name
      ) AS department,
      json_build_object(
        'id', c.id,
        'startDate', c.start_date,
        'endDate', c.end_date,
        'status', c.status
      ) AS contract
  `;

  private readonly fromClause = sql`
    FROM employees e
    LEFT JOIN employees m
      ON m.id = e.manager_id
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
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(schema.employees).where(whereClause);

    return Number(result?.count ?? 0);
  }

  async findOneWithRelations(id: string) {
    const result = await this.db.execute(sql`
      ${this.selectClause}
      ${this.fromClause}
      WHERE e.id = ${id}
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  async createAndSave(dto: CreateEmployeeDto, tx: DbExecutor = this.db) {
    const [result] = await tx.insert(schema.employees).values(dto).returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdateEmployeeDto) {
    const [result] = await this.db
      .update(schema.employees)
      .set(dto)
      .where(eq(schema.employees.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.employees)
      .where(eq(schema.employees.id, id))
      .returning();
    return result || null;
  }

  async isLinkedToUsers(id: string): Promise<boolean> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.employeeId, id))
      .limit(1);
    return !!user;
  }
}
