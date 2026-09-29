import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.positions)
      .where(eq(schema.positions.id, id))
      .limit(1);
    return result || null;
  }

  async findAll() {
    const result = await this.db
      .select({
        id: schema.positions.id,
        name: schema.positions.name
      })
      .from(schema.positions);
    return result
  }

  async createAndSave(dto: CreatePositionDto) {
    const [result] = await this.db
      .insert(schema.positions)
      .values(dto)
      .returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdatePositionDto) {
    const [result] = await this.db
      .update(schema.positions)
      .set(dto)
      .where(eq(schema.positions.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.positions)
      .where(eq(schema.positions.id, id))
      .returning();
    return result || null;
  }

  async isLinkedToEmployees(id: string) {
    const [employee] = await this.db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.positionId, id))
      .limit(1);
    return !!employee;
  }
}
