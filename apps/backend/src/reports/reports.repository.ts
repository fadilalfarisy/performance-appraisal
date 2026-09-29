import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { ReportStatus } from './reports.enum';

@Injectable()
export class ReportsRepository {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.id, id))
      .limit(1);
    return result || null;
  }

  async updateStatus(id: string, status: ReportStatus) {
    const [result] = await this.db
      .update(schema.reports)
      .set({ status })
      .where(eq(schema.reports.id, id))
      .returning();
    return result || null;
  }

  async createApproval(
    reportId: string,
    approverId: string,
    status: ReportStatus,
    note?: string,
  ) {
    const [result] = await this.db
      .insert(schema.reportApprovals)
      .values({
        reportId,
        approverId,
        status,
        note,
      })
      .returning();
    return result;
  }

  async findWithRelations(id: string) {
    // Basic implementation, can be expanded for more details
    return this.findById(id);
  }
}
