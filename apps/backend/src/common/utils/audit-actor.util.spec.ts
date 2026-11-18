import type { AuthenticatedUser } from '@appraisal/types';
import { auditActor } from './audit-actor.util';
import type { RequestContextService } from '../context/request-context.service';

type AuditContext = Pick<
  RequestContextService,
  'getUser' | 'getIp' | 'getRequestId'
>;

const contextWith = (data: {
  user?: AuthenticatedUser;
  ip?: string;
  requestId?: string;
}): AuditContext => ({
  getUser: jest.fn(() => data.user),
  getIp: jest.fn(() => data.ip),
  getRequestId: jest.fn(() => data.requestId),
});

const user: AuthenticatedUser = {
  userId: 'user-1',
  username: 'budi',
  employeeId: 'emp-1',
  employeeNumber: 'E-001',
  roles: ['ADMIN', 'HR'],
};

describe('auditActor', () => {
  it('maps the signed-in user, ip, and request id', () => {
    const actor = auditActor(
      contextWith({ user, ip: '10.0.0.1', requestId: 'req-1' }),
    );

    expect(actor).toEqual({
      userId: 'user-1',
      username: 'budi',
      role: 'ADMIN',
      employeeNumber: 'E-001',
      ipAddress: '10.0.0.1',
      requestId: 'req-1',
    });
  });

  it('uses the first role only', () => {
    const actor = auditActor(contextWith({ user }));

    expect(actor.role).toBe('ADMIN');
  });

  it('returns nulls when there is no user in context', () => {
    const actor = auditActor(contextWith({ ip: '10.0.0.1', requestId: 'req-1' }));

    expect(actor).toEqual({
      userId: null,
      username: null,
      role: null,
      employeeNumber: null,
      ipAddress: '10.0.0.1',
      requestId: 'req-1',
    });
  });

  it('returns all nulls when the context is empty', () => {
    expect(auditActor(contextWith({}))).toEqual({
      userId: null,
      username: null,
      role: null,
      employeeNumber: null,
      ipAddress: null,
      requestId: null,
    });
  });
});
