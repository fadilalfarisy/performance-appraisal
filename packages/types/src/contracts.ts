import type { PaginationQuery } from './common';
import type { ContractType } from './enums';

export interface CreateContractRequest {
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate?: string;
}

export type UpdateContractRequest = Partial<
  Omit<CreateContractRequest, 'employeeId'>
>;

export interface ContractQuery extends PaginationQuery {
  employeeId?: string;
  contractType?: ContractType;
}

export interface ContractResponse {
  id: string;
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  employee?: { id: string; fullName: string; employeeNumber: string } | null;
}
