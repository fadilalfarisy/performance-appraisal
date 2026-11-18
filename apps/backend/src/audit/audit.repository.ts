import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AuditLogQuery } from '@appraisal/types';
import { DB_CONNECTION } from '../db/db.constants';
import type { Database, DbExecutor } from '../db/db.type';
import { auditLogs, type AuditLogInsert } from '../db/audit-logs.schema';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../common/query/query.dto';

export type AuditLogRow = typeof auditLogs.$inferSelect;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Escapes LIKE wildcards so a search term matches literally. */
export function toSearchPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}

/** A date-only upper bound covers the whole day, not just midnight. */
export function endOfDayIfDateOnly(value: string): Date {
  const date = new Date(value);
  if (DATE_ONLY.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

export function buildAuditFilters(query: AuditLogQuery): SQL[] {
  const filters: SQL[] = [];

  if (query.occurredFrom) {
    filters.push(gte(auditLogs.occurredAt, new Date(query.occurredFrom)));
  }
  if (query.occurredTo) {
    filters.push(
      lte(auditLogs.occurredAt, endOfDayIfDateOnly(query.occurredTo)),
    );
  }
  if (query.userId) {
    filters.push(eq(auditLogs.userId, query.userId));
  }
  if (query.entity) {
    filters.push(eq(auditLogs.entity, query.entity));
  }
  if (query.entityId) {
    filters.push(eq(auditLogs.entityId, query.entityId));
  }
  if (query.action) {
    filters.push(eq(auditLogs.action, query.action));
  }
  if (query.actorType) {
    filters.push(eq(auditLogs.actorType, query.actorType));
  }
  if (query.search) {
    const term = toSearchPattern(query.search);
    const search = or(
      ilike(auditLogs.username, term),
      ilike(auditLogs.employeeNumber, term),
      ilike(auditLogs.entityId, term),
    );
    if (search) filters.push(search);
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
