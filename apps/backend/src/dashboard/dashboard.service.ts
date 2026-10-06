import { Injectable } from '@nestjs/common';
import { AppraisalStatus, type DashboardSummary } from '@appraisal/types';
import { ApiResponse, ok } from '../common/utils/response.util';
import { RequestContextService } from '../common/context/request-context.service';
import { ScopeService } from '../common/scope/scope.service';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly requestContext: RequestContextService,
    private readonly scopeService: ScopeService,
  ) {}

  async summary(): Promise<ApiResponse<DashboardSummary>> {
    const user = this.requestContext.getUser();
    let departmentIds: string[] | undefined;
    if (user) {
      const scope = await this.scopeService.getDepartmentScope(user);
      if (scope !== 'ALL') departmentIds = scope;
    }

    const [statusCounts, total, byDepartment] = await Promise.all([
      this.repository.appraisalsByStatus(departmentIds),
      this.repository.employeeTotal(departmentIds),
      this.repository.employeesByDepartment(departmentIds),
    ]);

    const countByStatus = new Map(
      statusCounts.map((row) => [row.status, row.count]),
    );
    const appraisalsByStatus = Object.values(AppraisalStatus).map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }));

    return ok({
      appraisalsByStatus,
      employees: { total, byDepartment },
    });
  }
}
