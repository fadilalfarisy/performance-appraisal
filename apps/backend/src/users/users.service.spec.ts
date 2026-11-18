import { UsersService } from './users.service';

const userRow = {
  id: 'user-1',
  username: 'budi',
  role: 'HR',
  isActive: true,
  employee: { id: 'emp-1', fullName: 'Budi' },
};

const departments = [{ id: 'dep-1', name: 'Engineering' }];

const setup = () => {
  const usersRepository = {
    findById: jest.fn().mockResolvedValue(userRow),
    departmentsByUserId: jest.fn().mockResolvedValue(departments),
    updateAndSave: jest.fn(),
    setDepartments: jest.fn(),
    softDelete: jest.fn(),
  };
  const dbService = {
    transaction: jest.fn((callback: (tx: string) => Promise<unknown>) =>
      callback('tx'),
    ),
  };
  const audit = { record: jest.fn() };
  const requestContext = {
    getUser: jest.fn(() => null),
    getIp: jest.fn(() => null),
    getRequestId: jest.fn(() => null),
  };

  const service = new UsersService(
    usersRepository as never,
    dbService as never,
    audit as never,
    requestContext as never,
  );

  jest.spyOn(service, 'findOne').mockResolvedValue({ data: {} } as never);

  return { service, usersRepository, audit };
};

describe('UsersService audit state', () => {
  it('records only the fields that changed on update', async () => {
    const { service, audit } = setup();

    await service.update('user-1', { role: 'ADMIN' } as never);

    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        action: 'USER_UPDATED',
        entity: 'user',
        entityId: 'user-1',
        before: { role: 'HR' },
        after: { role: 'ADMIN' },
      }),
    );
  });

  it('records an empty diff when nothing changed', async () => {
    const { service, audit } = setup();

    await service.update('user-1', { role: 'HR' } as never);

    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({ before: {}, after: {} }),
    );
  });

  it('records departments when they change', async () => {
    const { service, audit } = setup();

    await service.update('user-1', { departmentIds: ['dep-2'] } as never);

    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        before: { departmentIds: ['dep-1'] },
        after: { departmentIds: ['dep-2'] },
      }),
    );
  });

  it('ignores a reordered department list', async () => {
    const { service, usersRepository, audit } = setup();
    usersRepository.departmentsByUserId.mockResolvedValue([
      { id: 'dep-b', name: 'B' },
      { id: 'dep-a', name: 'A' },
    ]);

    await service.update('user-1', {
      departmentIds: ['dep-a', 'dep-b'],
    } as never);

    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({ before: {}, after: {} }),
    );
  });

  it('records the full previous state on delete', async () => {
    const { service, audit } = setup();

    await service.remove('user-1');

    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        action: 'USER_DELETED',
        entityId: 'user-1',
        before: {
          username: 'budi',
          role: 'HR',
          employeeId: 'emp-1',
          isActive: true,
          departmentIds: ['dep-1'],
        },
      }),
    );
  });

  it('never stores password material', async () => {
    const { service, audit } = setup();

    await service.update('user-1', { role: 'ADMIN' } as never);
    await service.remove('user-1');

    for (const [, entry] of audit.record.mock.calls) {
      expect(JSON.stringify(entry)).not.toContain('password');
    }
  });
});
