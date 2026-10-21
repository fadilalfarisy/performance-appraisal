import type { PaginationQuery } from './common';
import type { FieldValue } from './criteria';

export interface DailyNoteValueInput {
  fieldId: string;
  value: FieldValue;
}

export interface DailyNoteValueResponse {
  fieldId: string;
  value: FieldValue;
}

export interface CreateDailyNoteRequest {
  employeeId: string;
  recordDate: string;
  values: DailyNoteValueInput[];
}

export interface UpdateDailyNoteRequest {
  values: DailyNoteValueInput[];
}

export interface DailyNoteQuery extends PaginationQuery {
  employeeId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DailyNoteResponse {
  id: string;
  employeeId: string;
  employeeNumber: string | null;
  employeeName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  criteriaSetId: string;
  criteriaSetVersion: number | null;
  period: string;
  recordDate: string;
  createdBy: string | null;
  values: DailyNoteValueResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessibleEmployeeResponse {
  id: string;
  employeeNumber: string;
  fullName: string;
  departmentId: string | null;
  departmentName: string | null;
}
