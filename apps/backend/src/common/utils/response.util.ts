import type { ApiResponse, PaginationMeta } from '@appraisal/types';

export type { ApiResponse, PaginationMeta };

export interface CustomResponse<T> extends ApiResponse<T> {
  status: number;
  message: string;
  errors?: unknown;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { data };
}

export function paginated<T>(
  data: T[],
  meta: { total?: number; page?: number; limit?: number },
): ApiResponse<T[]> {
  const total = meta.total ?? 0;
  const page = meta.page ?? 0;
  const limit = meta.limit ?? 0;
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
