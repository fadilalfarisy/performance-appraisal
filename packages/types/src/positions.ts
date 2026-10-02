export interface CreatePositionRequest {
  name: string;
}

export type UpdatePositionRequest = Partial<CreatePositionRequest>;

export interface PositionResponse {
  id: string;
  name: string;
}
