import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { employees, positions } from '../db/schema';
import { notDeleted } from '../db/helpers/soft-delete';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

export type PositionRow = typeof positions.$inferSelect;

@Injectable()
export class PositionsRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async findById(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<PositionRow | null> {
    const [result] = await executor
      .select()
      .from(positions)
      .where(and(eq(positions.id, id), notDeleted(positions)))
      .limit(1);
    return result ?? null;
  }

  async findAll(executor: DbExecutor = this.db): Promise<PositionRow[]> {
    return executor
      .select()
      .from(positions)
      .where(notDeleted(positions))
      .orderBy(asc(positions.name));
  }

  async createAndSave(
    dto: CreatePositionDto,
    executor: DbExecutor = this.db,
  ): Promise<PositionRow | null> {
    const [result] = await executor.insert(positions).values(dto).returning();
    return result ?? null;
  }

  async updateAndSave(
    id: string,
    dto: UpdatePositionDto,
    executor: DbExecutor = this.db,
  ): Promise<PositionRow | null> {
    const [result] = await executor
      .update(positions)
      .set(dto)
      .where(and(eq(positions.id, id), notDeleted(positions)))
      .returning();
    return result ?? null;
  }

  async softDelete(
    id: string,
    executor: DbExecutor = this.db,
  ): Promise<PositionRow | null> {
    const [result] = await executor
      .update(positions)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(and(eq(positions.id, id), notDeleted(positions)))
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
      .where(and(eq(employees.positionId, id), notDeleted(employees)))
      .limit(1);
    return !!employee;
  }
}
