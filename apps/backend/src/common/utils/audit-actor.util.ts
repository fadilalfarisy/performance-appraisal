import type { RequestContextService } from '../context/request-context.service';

/** Actor fields copied from the request context into an audit entry. */
export interface AuditActor {
  userId: string | null;
  username: string | null;
  role: string | null;
  employeeNumber: string | null;
  ipAddress: string | null;
  requestId: string | null;
}

/**
 * Builds the audit actor from the current request context. Returns nulls when
 * there is no signed-in user, so scheduled jobs can still pass their own
 * `actorType: 'SYSTEM'`.
 */
export function auditActor(
  context: Pick<RequestContextService, 'getUser' | 'getIp' | 'getRequestId'>,
): AuditActor {
  const user = context.getUser();

  return {
    userId: user?.userId ?? null,
    username: user?.username ?? null,
    role: user?.roles?.[0] ?? null,
    employeeNumber: user?.employeeId ?? null,
    ipAddress: context.getIp() ?? null,
    requestId: context.getRequestId() ?? null,
  };
}
