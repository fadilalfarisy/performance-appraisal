import type { UserRole } from './enums';

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  role: UserRole;
  employeeId: string;
}

export interface LoginResponse {
  username: string;
  role: UserRole | null;
  accessToken: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
}
