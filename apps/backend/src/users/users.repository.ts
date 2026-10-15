import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { UserDepartmentSummary, UserRole } from '@appraisal/types';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { departments, employees, userDepartments, users } from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';

export type UserUpdate = Partial<{
  password: string;
  role: UserRole;
  employeeId: string | null;
  isActive: boolean;
}>;

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  private readonly baseSelect = {
    id: users.id,
    username: users.username,
    role: users.role,
    isActive: users.isActive,
    employee: { id: employees.id, fullName: employees.fullName },
  };

  async findAll(executor: DbExecutor = this.db) {
    return executor
      .select(this.baseSelect)
      .from(users)
      .leftJoin(employees, eq(users.employeeId, employees.id))
      .where(notDeleted(users));
  }

  async findById(id: string, executor: DbExecutor = this.db) {
    const [row] = await executor
      .select(this.baseSelect)
      .from(users)
      .leftJoin(employees, eq(users.employeeId, employees.id))
      .where(and(eq(users.id, id), notDeleted(users)))
      .limit(1);
    return row ?? null;
  }

  async findByUsernameForAuth(username: string) {
    const [row] = await this.db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.username, username), notDeleted(users)))
      .limit(1);
    return row ?? null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return !!row;
  }

  async departmentsByUserIds(
    userIds: string[],
  ): Promise<Record<string, UserDepartmentSummary[]>> {
    if (userIds.length === 0) return {};

    const rows = await this.db
      .select({
        userId: userDepartments.userId,
        id: departments.id,
        name: departments.name,
      })
      .from(userDepartments)
      .innerJoin(departments, eq(userDepartments.departmentId, departments.id))
      .where(inArray(userDepartments.userId, userIds));

    const map: Record<string, UserDepartmentSummary[]> = {};
    for (const row of rows) {
      (map[row.userId] ??= []).push({ id: row.id, name: row.name });
    }
    return map;
  }

  async departmentsByUserId(userId: string) {
    const map = await this.departmentsByUserIds([userId]);
    return map[userId] ?? [];
  }

  async createAndSave(
    values: {
      username: string;
      password: string;
      role: UserRole;
      employeeId?: string | null;
    },
    executor: DbExecutor = this.db,
  ) {
    const [row] = await executor
      .insert(users)
      .values({
        username: values.username,
        password: values.password,
        role: values.role,
        employeeId: values.employeeId ?? null,
      })
      .returning({ id: users.id });
    return row ?? null;
  }

  async updateAndSave(
    id: string,
    values: UserUpdate,
    executor: DbExecutor = this.db,
  ) {
    const [row] = await executor
      .update(users)
      .set(values)
      .where(and(eq(users.id, id), notDeleted(users)))
      .returning({ id: users.id });
    return row ?? null;
  }

  async updateLastLogin(id: string) {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async setDepartments(
    userId: string,
    departmentIds: string[],
    executor: DbExecutor = this.db,
  ) {
    await executor
      .delete(userDepartments)
      .where(eq(userDepartments.userId, userId));
    if (departmentIds.length > 0) {
      await executor
        .insert(userDepartments)
        .values(departmentIds.map((departmentId) => ({ userId, departmentId })));
    }
  }

  async softDelete(id: string, executor: DbExecutor = this.db) {
    const [row] = await executor
      .update(users)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(and(eq(users.id, id), notDeleted(users)))
      .returning({ id: users.id });
    return row ?? null;
  }
}
