import type { PaginationQuery } from './common';
import type { DepartmentResponse } from './departments';
import type { PositionResponse } from './positions';
import type { ContractResponse } from './contracts';
import type {
  ColumnEmployee,
  EmployeeStatus,
  GenderEnum,
} from './enums';

export interface CreateEmployeeRequest {
  employeeNumber: string;
  fullName: string;
  gender: GenderEnum;
  birthDate: string;
  joinDate: string;
  address: string;
  departmentId: string;
  positionId: string;
  superiorId?: string | null;
  status?: EmployeeStatus;
}

export type UpdateEmployeeRequest = Partial<CreateEmployeeRequest>;

export interface EmployeeQuery extends PaginationQuery {
  sortBy?: ColumnEmployee;
  department?: string;
  position?: string;
  status?: EmployeeStatus;
}

export interface SuperiorResponse {
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
  superior: SuperiorResponse | null;
  position: Partial<PositionResponse> | null;
  department: Partial<DepartmentResponse> | null;
  status: EmployeeStatus;
  address: string;
  contract?: Partial<ContractResponse> | null;
}
