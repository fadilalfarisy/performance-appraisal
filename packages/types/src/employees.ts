import type { PaginationQuery } from './common';
import type { DepartmentResponse } from './departments';
import type { PositionResponse } from './positions';
import type {
  ColumnEmployee,
  ContractStatus,
  EmployeeStatus,
  GenderEnum,
} from './enums';

export interface CreateContractRequest {
  status: ContractStatus;
  startDate: string;
  endDate?: string;
}

export type UpdateContractRequest = Partial<CreateContractRequest>;

export interface CreateEmployeeRequest {
  nip: string;
  fullName: string;
  gender: GenderEnum;
  birthDate: string;
  departmentId: string;
  positionId: string;
  managerId: string;
  status?: EmployeeStatus;
  address: string;
  contracts: CreateContractRequest[];
}

export type UpdateEmployeeRequest = Partial<
  Omit<CreateEmployeeRequest, 'contracts'>
>;

export interface EmployeeQuery extends PaginationQuery {
  sortBy?: ColumnEmployee;
  department?: string;
  position?: string;
  status?: EmployeeStatus;
  startDate?: string[];
  endDate?: string[];
  contractStatus?: ContractStatus;
}

export interface ManagerResponse {
  id: string;
  fullName: string;
}

export interface ContractResponse {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string | null;
  status: ContractStatus;
}

export interface EmployeeResponse {
  id: string;
  nip: string;
  fullName: string;
  birthDate: string;
  gender: GenderEnum;
  manager: ManagerResponse | null;
  position: Partial<PositionResponse> | null;
  department: Partial<DepartmentResponse> | null;
  status: EmployeeStatus;
  address: string;
  contract?: Partial<ContractResponse> | null;
}
