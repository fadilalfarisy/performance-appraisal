import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreateDailyNoteDto } from './dto/create-daily-note.dto';
import { UpdateDailyNoteDto } from './dto/update-daily-note.dto';

@Injectable()
export class DailyNotesRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.dailyNotes)
      .where(eq(schema.dailyNotes.id, id))
      .limit(1);
    return result || null;
  }

  async findAllByEmployee(employeeId: string) {
    return await this.db
      .select()
      .from(schema.dailyNotes)
      .where(eq(schema.dailyNotes.employeeId, employeeId));
  }

  async findAllBySupervisor(supervisorId: string) {
    return await this.db
      .select()
      .from(schema.dailyNotes)
      .where(eq(schema.dailyNotes.supervisorId, supervisorId));
  }

  async createAndSave(supervisorId: string, dto: CreateDailyNoteDto) {
    const [result] = await this.db
      .insert(schema.dailyNotes)
      .values({
        ...dto,
        supervisorId,
      })
      .returning();
    return result;
  }

  async updateAndSave(id: string, dto: UpdateDailyNoteDto) {
    const [result] = await this.db
      .update(schema.dailyNotes)
      .set({
        ...dto,
      })
      .where(eq(schema.dailyNotes.id, id))
      .returning();
    return result || null;
  }

  async delete(id: string) {
    const [result] = await this.db
      .delete(schema.dailyNotes)
      .where(eq(schema.dailyNotes.id, id))
      .returning();
    return result || null;
  }
}
