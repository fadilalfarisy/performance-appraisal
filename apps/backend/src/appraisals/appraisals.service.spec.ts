import { AppraisalStatus } from '@appraisal/types';
import { AppraisalsService } from './appraisals.service';

describe('AppraisalsService employee detail and contract window', () => {
  let service: AppraisalsService;
  let repository: {
    findAppraisal: jest.Mock;
    findEligible: jest.Mock;
    createAppraisal: jest.Mock;
    insertEmployees: jest.Mock;
    findEmployees: jest.Mock;
    findEmployeeById: jest.Mock;
    ratingsForAppraisal: jest.Mock;
    dailyNoteSums: jest.Mock;
    departmentName: jest.Mock;
  };
  let criteriaService: { findOne: jest.Mock };
  let scopeService: { assertDepartmentAccess: jest.Mock };
  let excel: { buildResult: jest.Mock };

  const criterion = {
    id: 'crit-1',
    code: 'QUALITY',
    name: 'Quality',
    weight: 50,
    scaleMin: 1,
    scaleMax: 5,
    scaleDescriptions: [
      { score: 1, description: 'Poor' },
      { score: 5, description: 'Excellent' },
    ],
  };

  const criteriaSet = {
    id: 'set-1',
    version: 3,
    status: 'ACTIVE',
    departmentId: 'dep-1',
    criteria: [criterion],
  };

  const appraisal = {
    id: 'appr-1',
    departmentId: 'dep-1',
    period: '2026-01-01',
    criteriaSetId: 'set-1',
    criteriaSetVersion: 3,
    criteriaSetStatus: 'ACTIVE',
    status: AppraisalStatus.PENDING,
    source: 'MANUAL',
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const employeeRow = {
    id: 'ae-1',
    appraisalId: 'appr-1',
    employeeId: 'emp-1',
    employeeNumber: 'EMP0001',
    employeeName: 'Budi',
    departmentId: 'dep-1',
    departmentName: 'Engineering',
    positionId: null,
    positionName: null,
    contractId: 'contract-1',
    contractType: 'FIXED_TERM',
    contractStartDate: '2026-10-01',
    contractEndDate: '2027-01-31',
    comment: 'Good work',
    totalScore: 80,
  };

  const eligible = {
    id: 'emp-1',
    employeeNumber: 'EMP0001',
    fullName: 'Budi',
    departmentId: 'dep-1',
    departmentName: 'Engineering',
    positionId: null,
    positionName: null,
    contractId: 'contract-1',
    contractType: 'FIXED_TERM',
    contractStartDate: '2026-10-01',
    contractEndDate: '2027-01-31',
  };

  beforeEach(() => {
    repository = {
      findAppraisal: jest.fn().mockResolvedValue(appraisal),
      findEligible: jest.fn().mockResolvedValue([eligible]),
      createAppraisal: jest.fn().mockResolvedValue(appraisal),
      insertEmployees: jest.fn().mockResolvedValue(undefined),
      findEmployees: jest.fn().mockResolvedValue([employeeRow]),
      findEmployeeById: jest.fn().mockResolvedValue(employeeRow),
      ratingsForAppraisal: jest.fn().mockResolvedValue([]),
      dailyNoteSums: jest.fn().mockResolvedValue([]),
      departmentName: jest.fn().mockResolvedValue('Engineering'),
    };
    criteriaService = {
      findOne: jest.fn().mockResolvedValue({ data: criteriaSet }),
    };
    scopeService = {
      assertDepartmentAccess: jest.fn().mockResolvedValue(undefined),
    };
    excel = {
      buildResult: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
    };

    const dbService = {
      transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback({})),
    };
    const audit = { record: jest.fn() };
    const requestContext = {
      getUser: jest.fn(() => null),
      getIp: jest.fn(() => null),
      getRequestId: jest.fn(() => undefined),
    };

    service = new AppraisalsService(
      repository as never,
      criteriaService as never,
      dbService as never,
      audit as never,
      requestContext as never,
      scopeService as never,
      excel as never,
    );
  });

  it('deduplicates multiple contracts ending in the same period', async () => {
    repository.findEligible.mockResolvedValue([
      { ...eligible, contractEndDate: '2026-01-15', contractStartDate: '2025-01-01' },
      { ...eligible, contractEndDate: '2026-01-31', contractStartDate: '2025-07-01' },
    ]);

    const result = await service.preview({
      departmentId: 'dep-1',
      period: '2026-01-01',
      criteriaSetId: 'set-1',
    });

    expect(result.data.employees).toHaveLength(1);
    expect(result.data.employees[0].contractStartDate).toBe('2025-07-01');
    expect(result.data.employees[0].contractEndDate).toBe('2026-01-31');
  });

  it('stores the contract start date in the employee snapshot', async () => {
    await service.create({
      departmentId: 'dep-1',
      period: '2026-01-01',
      criteriaSetId: 'set-1',
      employeeIds: ['emp-1'],
    });

    expect(repository.insertEmployees).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          employeeId: 'emp-1',
          contractStartDate: '2026-10-01',
          contractEndDate: '2027-01-31',
        }),
      ],
      {},
    );
  });

  it('returns the daily note sum and contract window in the employee detail', async () => {
    repository.ratingsForAppraisal.mockResolvedValue([
      { appraisalEmployeeId: 'ae-1', criterionId: 'crit-1', rating: 4 },
    ]);
    repository.dailyNoteSums.mockResolvedValue([{ appraisalEmployeeId: 'ae-1', total: 12.5 }]);

    const result = await service.findEmployeeDetail('appr-1', 'ae-1');

    expect(result.data.employee.contractStartDate).toBe('2026-10-01');
    expect(result.data.employee.contractEndDate).toBe('2027-01-31');
    expect(result.data.employee.dailyNoteSum).toBe(12.5);
    expect(result.data.employee.ratings).toEqual([{ criterionId: 'crit-1', rating: 4 }]);
    expect(result.data.criteria).toEqual([criterion]);
  });

  it('returns 0 when the window exists but there are no numeric notes', async () => {
    const result = await service.findEmployeeDetail('appr-1', 'ae-1');

    expect(result.data.employee.dailyNoteSum).toBe(0);
  });

  it('returns null when the contract window is unavailable', async () => {
    repository.findEmployeeById.mockResolvedValue({
      ...employeeRow,
      contractStartDate: null,
    });

    const result = await service.findEmployeeDetail('appr-1', 'ae-1');

    expect(result.data.employee.dailyNoteSum).toBeNull();
  });

  it('refuses to export the result before the appraisal is COMPLETE', async () => {
    repository.findAppraisal.mockResolvedValue({
      ...appraisal,
      status: AppraisalStatus.PENDING,
    });

    await expect(service.exportResult('appr-1')).rejects.toThrow('only be exported when COMPLETE');
    expect(excel.buildResult).not.toHaveBeenCalled();
  });

  it('builds the result export when the appraisal is COMPLETE', async () => {
    repository.findAppraisal.mockResolvedValue({
      ...appraisal,
      status: AppraisalStatus.COMPLETE,
    });
    repository.ratingsForAppraisal.mockResolvedValue([
      { appraisalEmployeeId: 'ae-1', criterionId: 'crit-1', rating: 4 },
    ]);

    const result = await service.exportResult('appr-1');

    expect(result).toEqual(Buffer.from('xlsx'));
    expect(excel.buildResult).toHaveBeenCalledWith({
      appraisal: {
        period: '2026-01-01',
        status: AppraisalStatus.COMPLETE,
        criteriaSetVersion: 3,
      },
      departmentName: 'Engineering',
      criteria: [criterion],
      employees: [employeeRow],
      ratings: [{ appraisalEmployeeId: 'ae-1', criterionId: 'crit-1', rating: 4 }],
    });
  });
});
