import type { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

const row = {
  id: 7,
  occurredAt: new Date('2026-11-18T03:04:05.000Z'),
  actorType: 'USER',
  userId: 'user-1',
  username: 'budi',
  role: 'ADMIN',
  employeeNumber: 'E-1',
  action: 'USER_CREATED',
  entity: 'user',
  entityId: 'user-1',
  beforeData: null,
  afterData: { username: 'budi' },
  metadata: null,
  ipAddress: '10.0.0.1',
  requestId: 'req-1',
};

const repository = {
  findAllWithCount: jest.fn(),
};

const service = new AuditService(
  repository as unknown as AuditRepository,
);

describe('AuditService.findAll', () => {
  beforeEach(() => repository.findAllWithCount.mockReset());

  it('maps rows to the response shape and returns pagination meta', async () => {
    repository.findAllWithCount.mockResolvedValue([[row], 42]);

    const result = await service.findAll({ page: 2, limit: 20 });

    expect(repository.findAllWithCount).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
    });
    expect(result.meta).toEqual({
      total: 42,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
    expect(result.data).toEqual([
      {
        id: 7,
        occurredAt: '2026-11-18T03:04:05.000Z',
        actorType: 'USER',
        userId: 'user-1',
        username: 'budi',
        role: 'ADMIN',
        employeeNumber: 'E-1',
        action: 'USER_CREATED',
        entity: 'user',
        entityId: 'user-1',
        before: null,
        after: { username: 'budi' },
        metadata: null,
        ipAddress: '10.0.0.1',
        requestId: 'req-1',
      },
    ]);
  });

  it('returns an empty page when there are no rows', async () => {
    repository.findAllWithCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({});

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  });
});
