import { ContractType } from '@appraisal/types';
import { PgDialect } from 'drizzle-orm/pg-core';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeesRepository: {
    createAndSave: jest.Mock;
    findOneWithRelations: jest.Mock;
    findAllWithRelationAndQuery: jest.Mock;
    countEmployees: jest.Mock;
  };
  let contractsRepository: { createAndSave: jest.Mock };
  let audit: { record: jest.Mock };

  const employeeRow = {
    id: 'emp-1',
    employeeNumber: 'EMP0001',
    fullName: 'John Doe',
    birthDate: '1990-01-01',
    joinDate: '2023-01-01',
    gender: 'MALE',
    supervisor: null,
    position: null,
    department: null,
    status: 'ACTIVE',
    address: 'Jakarta',
    contract: null,
  };

  const dto = {
    employeeNumber: 'EMP0001',
    fullName: 'John Doe',
    gender: 'MALE',
    birthDate: '1990-01-01',
    joinDate: '2023-01-01',
    departmentId: 'dep-1',
    positionId: 'pos-1',
    address: 'Jakarta',
  };

  beforeEach(() => {
    employeesRepository = {
      createAndSave: jest.fn(),
      findOneWithRelations: jest.fn(),
      findAllWithRelationAndQuery: jest.fn().mockResolvedValue([]),
      countEmployees: jest.fn().mockResolvedValue(0),
    };
    contractsRepository = { createAndSave: jest.fn() };
    audit = { record: jest.fn() };
    const dbService = {
      transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({})),
    };
    const requestContext = {
      getUser: jest.fn(() => null),
      getIp: jest.fn(() => null),
      getRequestId: jest.fn(() => undefined),
    };

    employeesRepository.createAndSave.mockResolvedValue({ id: 'emp-1' });
    employeesRepository.findOneWithRelations.mockResolvedValue(employeeRow);
    contractsRepository.createAndSave.mockImplementation(
      async (contract: {
        employeeId: string;
        contractType: string;
        startDate: string;
        endDate?: string | null;
      }) => ({
        id: `contract-${contract.startDate}`,
        employeeId: contract.employeeId,
        contractType: contract.contractType,
        startDate: contract.startDate,
        endDate: contract.endDate ?? null,
      }),
    );

    service = new EmployeesService(
      employeesRepository as never,
      contractsRepository as never,
      dbService as never,
      audit as never,
      requestContext as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('creates each nested contract in the employee transaction and audits it', async () => {
    await service.createEmployee({
      ...dto,
      contracts: [
        {
          contractType: ContractType.PROBATION,
          startDate: '2023-01-01',
          endDate: '2023-04-01',
        },
        {
          contractType: ContractType.PERMANENT,
          startDate: '2023-04-02',
        },
      ],
    } as never);

    const [employeeData] = employeesRepository.createAndSave.mock.calls[0];
    expect(employeeData).not.toHaveProperty('contracts');
    expect(contractsRepository.createAndSave).toHaveBeenCalledTimes(2);
    expect(contractsRepository.createAndSave).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        employeeId: 'emp-1',
        contractType: ContractType.PROBATION,
        startDate: '2023-01-01',
      }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'CONTRACT_CREATED',
        entityId: 'contract-2023-01-01',
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'EMPLOYEE_CREATED' }),
    );
  });

  it('applies department, position, status, and contract range filters', async () => {
    await service.findAllEmployees({
      page: 1,
      limit: 10,
      sortBy: 'employeeNumber',
      department: 'dep-1',
      position: 'pos-1',
      status: 'ACTIVE',
      contractStartFrom: '2024-01-01',
      contractStartTo: '2024-12-31',
      contractEndFrom: '2024-01-01',
      contractEndTo: '2024-12-31',
    } as never);

    const [where] = employeesRepository.findAllWithRelationAndQuery.mock.calls[0];
    const { sql: text, params } = new PgDialect().sqlToQuery(where as never);

    expect(text).toContain('e.department_id =');
    expect(text).toContain('e.position_id =');
    expect(text).toContain('e.status =');
    expect(text).toContain('SELECT MIN(fc.start_date)');
    expect(text).toContain('c.end_date >=');
    expect(text).toContain('c.end_date <=');
    expect(params).toEqual(
      expect.arrayContaining([
        'dep-1',
        'pos-1',
        'ACTIVE',
        '2024-01-01',
        '2024-12-31',
      ]),
    );
  });

  it('creates the employee without contracts when none are given', async () => {
    await service.createEmployee(dto as never);

    expect(contractsRepository.createAndSave).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'EMPLOYEE_CREATED' }),
    );
  });
});
