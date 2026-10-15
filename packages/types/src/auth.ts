import type { UserRole } from './enums';

export interface SignInRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  role: UserRole | null;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
