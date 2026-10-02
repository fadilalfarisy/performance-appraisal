// employees/interfaces/employee.interface.ts

import { DepartmentPayload } from '../../departments/interfaces/department.interface';
import { PositionPayload } from '../../positions/interfaces/position.interface';
import { ContractPayload } from '../../employees/interfaces/contract.interface';
import { GenderEnum } from '../enums/gender.enum';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface ManagerPayload {
  id: string;
  fullName: string;
}

export interface EmployeePayload {
  id: string;
  nip: string;
  fullName: string;
  birthDate: string;
  gender: GenderEnum;
  manager: ManagerPayload | null;
  position: Partial<PositionPayload> | null;
  department: Partial<DepartmentPayload> | null;
  status: EmployeeStatus;
  address: string;
  contract?: Partial<ContractPayload> | null;
}
