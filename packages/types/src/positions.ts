export interface CreatePositionRequest {
  code: string;
  name: string;
  level: number;
  isActive?: boolean;
}

export type UpdatePositionRequest = Partial<CreatePositionRequest>;

export interface PositionResponse {
  id: string;
  code: string;
  name: string;
  level: number;
  isActive: boolean;
}
