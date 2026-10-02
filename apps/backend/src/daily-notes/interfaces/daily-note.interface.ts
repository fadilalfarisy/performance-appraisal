export interface DailyNotePayload {
  id: string;
  employeeId: string;
  supervisorId: string;
  recordDate: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
