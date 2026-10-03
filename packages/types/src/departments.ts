export interface CreateDepartmentRequest {
  code: string;
  name: string;
  headEmployeeId?: string | null;
  isActive?: boolean;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

export interface DepartmentResponse {
  id: string;
  code: string;
  name: string;
  headEmployeeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
