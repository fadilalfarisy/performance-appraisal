import { Inject, Injectable } from '@nestjs/common';
import { and, desc, gte, lte, sql, type SQL } from 'drizzle-orm';
import type { AuditLogQuery } from '@appraisal/types';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { auditLogs, type AuditLogInsert } from '../db/audit-logs.schema';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../common/query/query.dto';

export type AuditLogRow = typeof auditLogs.$inferSelect;

export function buildAuditFilters(query: AuditLogQuery): SQL[] {
  const filters: SQL[] = [];

  if (query.occurredFrom) {
    filters.push(gte(auditLogs.occurredAt, new Date(query.occurredFrom)));
  }
  if (query.occurredTo) {
    filters.push(lte(auditLogs.occurredAt, new Date(query.occurredTo)));
  }

  return filters;
}

@Injectable()
export class AuditRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async insert(executor: DbExecutor, values: AuditLogInsert): Promise<void> {
    await executor.insert(auditLogs).values(values);
  }

  async findAllWithCount(query: AuditLogQuery) {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = query;
    const filters = buildAuditFilters(query);
    const where = filters.length > 0 ? and(...filters) : undefined;

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id))
      .limit(limit)
      .offset((page - 1) * limit);

    const [total] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(where);

    return [rows, Number(total?.count ?? 0)] as const;
  }
}
