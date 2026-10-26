import type { PaginationQuery } from './common';
import type { DepartmentResponse } from './departments';
import type { PositionResponse } from './positions';
import type { ContractResponse } from './contracts';
import type {
  ColumnEmployee,
  ContractType,
  EmployeeStatus,
  GenderEnum,
} from './enums';

export interface CreateEmployeeContractRequest {
  contractType: ContractType;
  startDate: string;
  endDate?: string;
}

export interface CreateEmployeeRequest {
  employeeNumber: string;
  fullName: string;
  gender: GenderEnum;
  birthDate: string;
  joinDate: string;
  address: string;
  departmentId: string;
  positionId: string;
  supervisorId?: string | null;
  status?: EmployeeStatus;
  contracts?: CreateEmployeeContractRequest[];
}

export type UpdateEmployeeRequest = Partial<
  Omit<CreateEmployeeRequest, 'contracts'>
>;

export interface EmployeeQuery extends PaginationQuery {
  sortBy?: ColumnEmployee;
  department?: string;
  position?: string;
  status?: EmployeeStatus;
}

export interface SupervisorResponse {
  id: string;
  fullName: string;
}

export interface EmployeeResponse {
  id: string;
  employeeNumber: string;
  fullName: string;
  birthDate: string;
  joinDate: string;
  gender: GenderEnum;
  supervisor: SupervisorResponse | null;
  position: Partial<PositionResponse> | null;
  department: Partial<DepartmentResponse> | null;
  status: EmployeeStatus;
  address: string;
  contract?: Partial<ContractResponse> | null;
  contractStartDate?: string | null;
}
