import { UnprocessableEntityException } from '@nestjs/common';
import { ContractType } from '@appraisal/types';
import { ContractsService } from './contracts.service';

describe('ContractsService overlap guard', () => {
  let service: ContractsService;
  let repository: {
    findById: jest.Mock;
    findOverlapping: jest.Mock;
    findAllWithCount: jest.Mock;
    findForExport: jest.Mock;
    createAndSave: jest.Mock;
    updateAndSave: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let excel: { buildExport: jest.Mock; buildTemplate: jest.Mock };

  const existing = {
    id: 'contract-old',
    employeeId: 'emp-1',
    contractType: ContractType.FIXED_TERM,
    startDate: '2024-12-10',
    endDate: '2026-10-29',
  };

  const dto = {
    employeeId: 'emp-1',
    contractType: ContractType.FIXED_TERM,
    startDate: '2026-10-01',
    endDate: '2026-10-23',
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue(existing),
      findOverlapping: jest.fn().mockResolvedValue(null),
      findAllWithCount: jest.fn().mockResolvedValue([[], 0]),
      findForExport: jest.fn().mockResolvedValue([]),
      createAndSave: jest.fn().mockResolvedValue({
        ...dto,
        id: 'contract-new',
      }),
      updateAndSave: jest.fn().mockResolvedValue({
        ...existing,
        endDate: '2026-12-31',
      }),
    };
    const dbService = {
      transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({}),
      ),
    };
    audit = { record: jest.fn() };
    excel = {
      buildExport: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
      buildTemplate: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
    };
    const requestContext = {
      getUser: jest.fn(() => null),
      getIp: jest.fn(() => null),
      getRequestId: jest.fn(() => undefined),
    };

    service = new ContractsService(
      repository as never,
      dbService as never,
      audit as never,
      requestContext as never,
      {} as never,
      {} as never,
      excel as never,
    );
  });

  it('rejects a create that overlaps an existing contract', async () => {
    repository.findOverlapping.mockResolvedValue(existing);

    const error = await service.create(dto).catch((caught) => caught);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
      errorCode: 'CONTRACT_OVERLAP',
      message: expect.stringContaining('2024-12-10'),
    });
    expect(repository.findOverlapping).toHaveBeenCalledWith(
      'emp-1',
      '2026-10-01',
      '2026-10-23',
      undefined,
      {},
    );
    expect(repository.createAndSave).not.toHaveBeenCalled();
  });

  it('creates a contract when no overlap exists', async () => {
    const result = await service.create(dto);

    expect(result.data.id).toBe('contract-new');
    expect(repository.createAndSave).toHaveBeenCalledWith(dto, {});
  });

  it('checks update using effective dates and excludes the current contract', async () => {
    await service.update('contract-old', { endDate: '2026-12-31' });

    expect(repository.findOverlapping).toHaveBeenCalledWith(
      'emp-1',
      '2024-12-10',
      '2026-12-31',
      'contract-old',
      {},
    );
  });

  it('audits the contract export with filters and row count', async () => {
    repository.findForExport.mockResolvedValue([{}, {}, {}]);

    await service.exportContracts({
      employeeId: 'emp-1',
      page: 1,
      limit: 10,
    } as never);

    expect(audit.record).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        action: 'CONTRACTS_EXPORTED',
        entity: 'contract',
        metadata: {
          file: 'contracts.xlsx',
          filters: { employeeId: 'emp-1' },
          rows: 3,
        },
      }),
    );
  });

  it('audits the contracts template download', async () => {
    await service.buildTemplate();

    expect(audit.record).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        action: 'CONTRACTS_TEMPLATE_EXPORTED',
        metadata: { file: 'contracts-template.xlsx' },
      }),
    );
  });

  it('does not audit when the contract export fails', async () => {
    excel.buildExport.mockRejectedValueOnce(new Error('boom'));

    await expect(service.exportContracts({} as never)).rejects.toThrow('boom');
    expect(audit.record).not.toHaveBeenCalled();
  });
});
