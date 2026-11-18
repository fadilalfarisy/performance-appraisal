import { Injectable } from '@nestjs/common';
import type {
  ApiResponse,
  AuditActorType,
  AuditLogQuery,
  AuditLogResponse,
} from '@appraisal/types';
import type { DbExecutor } from '../db/db.type';
import { DbService } from '../db/db.service';
import { RequestContextService } from '../common/context/request-context.service';
import { auditActor } from '../common/utils/audit-actor.util';
import { paginated } from '../common/utils/response.util';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '../common/query/query.dto';
import { AuditRepository, type AuditLogRow } from './audit.repository';
import { AuditExcelService } from './audit.excel';
import { maskSensitive } from './audit.mask';

export type { AuditActorType } from '@appraisal/types';

export interface AuditEntry {
  actorType?: AuditActorType;
  userId?: string | null;
  username?: string | null;
  role?: string | null;
  employeeNumber?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  requestId?: string | null;
}

const EXPORT_FILTER_KEYS = [
  'occurredFrom',
  'occurredTo',
  'userId',
  'entity',
  'entityId',
  'action',
  'actorType',
  'search',
] as const;

@Injectable()
export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    private readonly db: DbService,
    private readonly excel: AuditExcelService,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Records an audit entry. Pass the same transaction executor as the change it
   * describes so the write and its audit row commit or fail together.
   */
  async record(executor: DbExecutor, entry: AuditEntry): Promise<void> {
    await this.repository.insert(executor, {
      actorType: entry.actorType ?? 'USER',
      userId: entry.userId ?? null,
      username: entry.username ?? null,
      role: entry.role ?? null,
      employeeNumber: entry.employeeNumber ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      beforeData: maskSensitive(entry.before ?? null),
      afterData: maskSensitive(entry.after ?? null),
      metadata: maskSensitive(entry.metadata ?? null),
      ipAddress: entry.ipAddress ?? null,
      requestId: entry.requestId ?? null,
    });
  }

  async findAll(
    query: AuditLogQuery,
  ): Promise<ApiResponse<AuditLogResponse[]>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const [rows, total] = await this.repository.findAllWithCount({
      ...query,
      page,
      limit,
    });

    return paginated(
      rows.map((row) => this.toResponse(row)),
      { total, page, limit },
    );
  }

  async export(
    query: AuditLogQuery,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const rows = await this.repository.findForExport(query);
    const buffer = await this.excel.buildExport(rows);
    const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.xlsx`;

    await this.db.transaction((tx) =>
      this.record(tx, {
        action: 'AUDIT_LOG_EXPORTED',
        entity: 'audit_log',
        metadata: {
          file: filename,
          filters: this.exportFilters(query),
          rows: rows.length,
        },
        ...auditActor(this.requestContext),
      }),
    );

    return { buffer, filename };
  }

  private exportFilters(query: AuditLogQuery): Record<string, string> {
    const filters: Record<string, string> = {};

    for (const key of EXPORT_FILTER_KEYS) {
      const value = query[key];
      if (value) filters[key] = value;
    }

    return filters;
  }

  private toResponse(row: AuditLogRow): AuditLogResponse {
    return {
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      actorType: row.actorType as AuditActorType,
      userId: row.userId,
      username: row.username,
      role: row.role,
      employeeNumber: row.employeeNumber,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      before: row.beforeData,
      after: row.afterData,
      metadata: row.metadata,
      ipAddress: row.ipAddress,
      requestId: row.requestId,
    };
  }
}
