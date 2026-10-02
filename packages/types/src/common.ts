export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  code?: string;
  message: string;
  details?: unknown;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  orderBy?: 'asc' | 'desc';
  search?: string;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
  employeeId: string | null;
  roles: string[];
}
