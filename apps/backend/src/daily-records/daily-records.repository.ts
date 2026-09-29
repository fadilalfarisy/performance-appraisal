import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';

@Injectable()
export class DailyRecordsRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.dailyRecords)
      .where(eq(schema.dailyRecords.id, id))
      .limit(1);
    return result || null;
  }

  async findAllByEmployee(employeeId: string) {
    return await this.db
      .select()
      .from(schema.dailyRecords)
      .where(eq(schema.dailyRecords.employeeId, employeeId));
  }

  async findAllBySupervisor(supervisorId: string) {
    return await this.db
      .select()
      .from(schema.dailyRecords)
      .where(eq(schema.dailyRecords.supervisorId, supervisorId));
  }

  async createAndSave(supervisorId: string, dto: CreateDailyRecordDto) {
    const [result] = await this.db
      .insert(schema.dailyRecords)
      .values({
        ...dto,
        supervisorId,
      })
      .returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdateDailyRecordDto) {
    const [result] = await this.db
      .update(schema.dailyRecords)
      .set({
        ...dto,
      })
      .where(eq(schema.dailyRecords.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.dailyRecords)
      .where(eq(schema.dailyRecords.id, id))
      .returning();
    return result || null;
  }
}
