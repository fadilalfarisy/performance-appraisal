import { Injectable } from '@nestjs/common';
import type {
  ApiResponse,
  AuditActorType,
  AuditLogQuery,
  AuditLogResponse,
} from '@appraisal/types';
import type { DbExecutor } from '../db/db.type';
import { paginated } from '../common/utils/response.util';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '../common/query/query.dto';
import { AuditRepository, type AuditLogRow } from './audit.repository';
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

@Injectable()
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

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
