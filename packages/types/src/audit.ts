import type { PaginationQuery } from './common';

export interface AuditLogQuery extends PaginationQuery {
  occurredFrom?: string;
  occurredTo?: string;
}

export type AuditActorType = 'USER' | 'SYSTEM';

export interface AuditLogResponse {
  id: number;
  occurredAt: string;
  actorType: AuditActorType;
  userId: string | null;
  username: string | null;
  role: string | null;
  employeeNumber: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
  requestId: string | null;
}
