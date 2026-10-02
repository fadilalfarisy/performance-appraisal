import { Injectable } from '@nestjs/common';
import type { DbExecutor } from '../db/db.type';
import { auditLogs, type AuditLogInsert } from '../db/audit-logs.schema';

@Injectable()
export class AuditRepository {
  async insert(executor: DbExecutor, values: AuditLogInsert): Promise<void> {
    await executor.insert(auditLogs).values(values);
  }
}
