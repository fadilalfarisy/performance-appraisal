export interface DailyRecordPayload {
  id: string;
  employeeId: string;
  supervisorId: string;
  recordDate: string;
  category: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
