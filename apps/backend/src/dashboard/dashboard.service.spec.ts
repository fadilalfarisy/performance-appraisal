import { AppraisalStatus } from '@appraisal/types';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let repository: {
    appraisalsByStatus: jest.Mock;
    employeeTotal: jest.Mock;
    employeesByDepartment: jest.Mock;
  };
  let getDepartmentScope: jest.Mock;

  beforeEach(() => {
    repository = {
      appraisalsByStatus: jest.fn().mockResolvedValue([
        { status: 'DRAFT', count: 2 },
        { status: 'COMPLETE', count: 1 },
      ]),
      employeeTotal: jest.fn().mockResolvedValue(10),
      employeesByDepartment: jest
        .fn()
        .mockResolvedValue([{ departmentId: 'd1', department: 'Production', total: 10 }]),
    };
    getDepartmentScope = jest.fn().mockResolvedValue('ALL');

    service = new DashboardService(
      repository as never,
      { getUser: () => ({ userId: 'u1', roles: ['ADMIN'] }) } as never,
      { getDepartmentScope } as never,
    );
  });

  it('zero-fills all five statuses', async () => {
    const result = await service.summary();
    expect(result.data.appraisalsByStatus).toHaveLength(5);
    const byStatus = Object.fromEntries(
      result.data.appraisalsByStatus.map((s) => [s.status, s.count]),
    );
    expect(byStatus[AppraisalStatus.DRAFT]).toBe(2);
    expect(byStatus[AppraisalStatus.COMPLETE]).toBe(1);
    expect(byStatus[AppraisalStatus.PENDING]).toBe(0);
    expect(result.data.employees.total).toBe(10);
  });

  it('passes department ids to the repository for scoped roles', async () => {
    getDepartmentScope.mockResolvedValue(['d1']);
    await service.summary();
    expect(repository.appraisalsByStatus).toHaveBeenCalledWith(['d1']);
    expect(repository.employeeTotal).toHaveBeenCalledWith(['d1']);
  });
});
