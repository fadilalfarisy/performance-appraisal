import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DB_CONNECTION } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { sql, and, inArray } from 'drizzle-orm';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Cron('0 0 1 * *') // Runs at 00:00 on day 1 of every month
  async handleMonthlyContractReview() {
    this.logger.log('Running monthly contract review scheduler...');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // 1. Find employees whose contracts expire this month
    const expiringContracts = await this.db
      .select({
        employeeId: schema.contracts.employeeId,
      })
      .from(schema.contracts)
      .where(
        and(
          sql`${schema.contracts.endDate} >= ${startOfMonth.toISOString().split('T')[0]}`,
          sql`${schema.contracts.endDate} <= ${endOfMonth.toISOString().split('T')[0]}`,
        ),
      );

    if (expiringContracts.length === 0) {
      this.logger.log('No expiring contracts found this month.');
      return;
    }

    const employeeIds = expiringContracts.map((c) => c.employeeId);

    // 2. Set employee status to INACTIVE
    await this.db
      .update(schema.employees)
      .set({ status: 'INACTIVE' })
      .where(inArray(schema.employees.id, employeeIds));

    this.logger.log(
      `Updated ${employeeIds.length} employees to INACTIVE status for appraisal.`,
    );
  }
}
