import type { AppraisalStatus } from './enums';

export interface AppraisalStatusCount {
  status: AppraisalStatus;
  count: number;
}

export interface DepartmentEmployeeCount {
  departmentId: string;
  department: string;
  total: number;
}

export interface DashboardSummary {
  appraisalsByStatus: AppraisalStatusCount[];
  employees: {
    total: number;
    byDepartment: DepartmentEmployeeCount[];
  };
}
