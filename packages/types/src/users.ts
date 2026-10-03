import type { UserRole } from './enums';

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  employeeId?: string | null;
  departmentIds?: string[];
}

export interface UpdateUserRequest {
  fullName?: string;
  role?: UserRole;
  employeeId?: string | null;
  departmentIds?: string[];
  isActive?: boolean;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface SetUserStatusRequest {
  isActive: boolean;
}

export interface UserEmployeeSummary {
  id: string;
  fullName: string;
}

export interface UserDepartmentSummary {
  id: string;
  name: string;
}

export interface UserResponse {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  employee: UserEmployeeSummary | null;
  departments: UserDepartmentSummary[];
}
