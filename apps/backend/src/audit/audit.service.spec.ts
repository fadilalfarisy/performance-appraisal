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
  findForExport: jest.fn(),
  insert: jest.fn(),
};

const db = {
  transaction: jest.fn((callback: (tx: string) => Promise<unknown>) =>
    callback('tx'),
  ),
};

const excel = { buildExport: jest.fn() };

const requestContext = {
  getUser: jest.fn(() => null),
  getIp: jest.fn(() => null),
  getRequestId: jest.fn(() => null),
};

const service = new AuditService(
  repository as unknown as AuditRepository,
  db as never,
  excel as never,
  requestContext as never,
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

  it('does not record an audit entry when reading the list', async () => {
    repository.findAllWithCount.mockResolvedValue([[row], 1]);
    const record = jest.spyOn(service, 'record').mockResolvedValue();

    await service.findAll({});

    expect(record).not.toHaveBeenCalled();
  });
});

describe('AuditService.export', () => {
  beforeEach(() => {
    repository.findForExport.mockReset();
    excel.buildExport.mockReset();
    jest.restoreAllMocks();
  });

  it('builds the file and records one export entry with its filters', async () => {
    repository.findForExport.mockResolvedValue([row]);
    excel.buildExport.mockResolvedValue(Buffer.from('xlsx'));
    const record = jest.spyOn(service, 'record').mockResolvedValue();

    const { buffer, filename } = await service.export({
      occurredFrom: '2026-11-01',
      actorType: 'USER',
      page: 2,
      limit: 10,
    });

    expect(buffer.toString()).toBe('xlsx');
    expect(filename).toMatch(/^audit-trail-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(excel.buildExport).toHaveBeenCalledWith([row]);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        action: 'AUDIT_LOG_EXPORTED',
        entity: 'audit_log',
        metadata: {
          file: filename,
          filters: { occurredFrom: '2026-11-01', actorType: 'USER' },
          rows: 1,
        },
      }),
    );
  });

  it('still records the export when the result is empty', async () => {
    repository.findForExport.mockResolvedValue([]);
    excel.buildExport.mockResolvedValue(Buffer.from('xlsx'));
    const record = jest.spyOn(service, 'record').mockResolvedValue();

    await service.export({});

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        metadata: { file: expect.any(String), filters: {}, rows: 0 },
      }),
    );
  });
});
