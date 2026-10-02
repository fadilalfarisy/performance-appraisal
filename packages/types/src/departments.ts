export interface CreateDepartmentRequest {
  name: string;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

export interface DepartmentResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
