import { ContractStatus } from '../enums/contract.enum';

export interface ContractPayload {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
}
