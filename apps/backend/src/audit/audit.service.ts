import { Injectable } from '@nestjs/common';
import type { DbExecutor } from '../db/db.type';
import { AuditRepository } from './audit.repository';
import { maskSensitive } from './audit.mask';

export type AuditActorType = 'USER' | 'SYSTEM';

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
}
