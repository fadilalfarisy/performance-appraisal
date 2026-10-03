import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let repository: {
    findAllWithCount: jest.Mock;
    findById: jest.Mock;
    createAndSave: jest.Mock;
    updateAndSave: jest.Mock;
    softDelete: jest.Mock;
    isLinkedToEmployees: jest.Mock;
  };
  let audit: { record: jest.Mock };

  const department = {
    id: 'dep-1',
    code: 'ENG',
    name: 'Engineering',
    headEmployeeId: null,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  beforeEach(() => {
    repository = {
      findAllWithCount: jest.fn(),
      findById: jest.fn(),
      createAndSave: jest.fn(),
      updateAndSave: jest.fn(),
      softDelete: jest.fn(),
      isLinkedToEmployees: jest.fn(),
    };
    const dbService = {
      transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({})),
    };
    audit = { record: jest.fn() };
    const requestContext = {
      getUser: jest.fn(() => null),
      getIp: jest.fn(() => null),
      getRequestId: jest.fn(() => undefined),
    };

    service = new DepartmentsService(
      repository as never,
      dbService as never,
      audit as never,
      requestContext as never,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns paginated departments', async () => {
    const query = { page: 1, limit: 10, search: 'eng' } as never;
    repository.findAllWithCount.mockResolvedValue([[department], 1]);

    const result = await service.findAll(query);

    expect(repository.findAllWithCount).toHaveBeenCalledWith(query);
    expect(result).toEqual({
      data: [
        {
          id: 'dep-1',
          code: 'ENG',
          name: 'Engineering',
          headEmployeeId: null,
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it('findOne returns the department when it exists', async () => {
    repository.findById.mockResolvedValue(department);

    const result = await service.findOne('dep-1');

    expect(result).toEqual({
      data: {
        id: 'dep-1',
        code: 'ENG',
        name: 'Engineering',
        headEmployeeId: null,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    });
  });

  it('findOne throws when the department does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create saves, audits, and returns the department', async () => {
    const dto = { code: 'ENG', name: 'Engineering' };
    repository.createAndSave.mockResolvedValue(department);

    const result = await service.create(dto as never);

    expect(repository.createAndSave).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'DEPARTMENT_CREATED' }),
    );
    expect(result.data).toMatchObject({ id: 'dep-1', code: 'ENG' });
  });

  it('update returns the updated department and audits', async () => {
    repository.findById.mockResolvedValue(department);
    repository.updateAndSave.mockResolvedValue({ ...department, name: 'HR' });

    const result = await service.update('dep-1', { name: 'HR' } as never);

    expect(result.data).toMatchObject({ name: 'HR' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'DEPARTMENT_UPDATED' }),
    );
  });

  it('remove blocks deletion when employees are linked', async () => {
    repository.findById.mockResolvedValue(department);
    repository.isLinkedToEmployees.mockResolvedValue(true);

    await expect(service.remove('dep-1')).rejects.toThrow(BadRequestException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('remove soft-deletes when not linked', async () => {
    repository.findById.mockResolvedValue(department);
    repository.isLinkedToEmployees.mockResolvedValue(false);
    repository.softDelete.mockResolvedValue(department);

    await service.remove('dep-1');

    expect(repository.softDelete).toHaveBeenCalledWith('dep-1', expect.anything());
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'DEPARTMENT_DELETED' }),
    );
  });
});
