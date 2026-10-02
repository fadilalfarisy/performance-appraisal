export interface CreateDailyNoteRequest {
  employeeId: string;
  recordDate: string;
  description: string;
}

export type UpdateDailyNoteRequest = Partial<CreateDailyNoteRequest>;

export interface DailyNoteResponse {
  id: string;
  employeeId: string;
  supervisorId: string;
  recordDate: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
