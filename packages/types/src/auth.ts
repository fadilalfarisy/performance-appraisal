import type { UserRole } from './enums';

export interface SignInRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  role: UserRole | null;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}
