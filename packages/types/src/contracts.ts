import type { PaginationQuery } from './common';
import type { ContractStatus, ContractType } from './enums';

export interface CreateContractRequest {
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
  status?: ContractStatus;
}

export type UpdateContractRequest = Partial<
  Omit<CreateContractRequest, 'employeeId'>
>;

export interface ContractQuery extends PaginationQuery {
  employeeId?: string;
  contractType?: ContractType;
  status?: ContractStatus;
}

export interface ContractResponse {
  id: string;
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  status: ContractStatus;
  employee?: { id: string; fullName: string } | null;
}
