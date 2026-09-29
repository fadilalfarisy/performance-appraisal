import { ContractStatus } from '../enum/contract.enum';

export interface ContractPayload {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
}
