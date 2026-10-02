import type { UserRole } from './enums';

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  employeeId: string;
}

export type UpdateUserRequest = Partial<CreateUserRequest>;

export interface UserEmployeeSummary {
  id: string;
  fullName: string;
}

export interface UserResponse {
  id: string;
  username: string;
  employee: UserEmployeeSummary | null;
  role: string | null;
}
