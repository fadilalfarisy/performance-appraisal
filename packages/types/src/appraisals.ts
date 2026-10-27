import type { PaginationQuery } from './common';
import type { CriterionResponse } from './criteria';
import type {
  AppraisalAction,
  AppraisalSource,
  AppraisalStatus,
  CriteriaSetStatus,
} from './enums';

export interface EligibleEmployeeResponse {
  id: string;
  employeeNumber: string;
  fullName: string;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  contractId: string | null;
  contractType: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
}

export interface PreviewAppraisalRequest {
  departmentId: string;
  period: string;
  criteriaSetId: string;
}

export interface PreviewAppraisalResponse {
  departmentId: string;
  period: string;
  criteriaSetId: string;
  criteriaSetVersion: number;
  criteriaSetStatus: CriteriaSetStatus;
  employees: EligibleEmployeeResponse[];
}

export interface CreateAppraisalRequest {
  departmentId: string;
  period: string;
  criteriaSetId: string;
  employeeIds: string[];
}

export interface UpdateAppraisalEmployeesRequest {
  addEmployeeIds?: string[];
  removeEmployeeIds?: string[];
}

export interface AppraisalRatingResponse {
  criterionId: string;
  rating: number;
}

export interface AppraisalEmployeeResponse {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionName: string | null;
  contractId: string | null;
  contractType: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  comment: string | null;
  totalScore: number | null;
  ratings: AppraisalRatingResponse[];
}

export interface AppraisalEmployeeDetailResponse {
  appraisal: {
    id: string;
    departmentId: string;
    departmentName: string | null;
    period: string;
    status: AppraisalStatus;
    criteriaSetId: string;
    criteriaSetVersion: number;
    criteriaSetStatus: CriteriaSetStatus;
  };
  employee: AppraisalEmployeeResponse & {
    dailyNoteSum: number | null;
  };
  criteria: CriterionResponse[];
}

export interface SaveRatingsRequest {
  ratings: {
    appraisalEmployeeId: string;
    criterionId: string;
    rating: number;
  }[];
  comments?: {
    appraisalEmployeeId: string;
    comment: string;
  }[];
}

export interface AppraisalTransitionRequest {
  to: AppraisalStatus;
  comment?: string;
}

export interface AppraisalStatusHistoryResponse {
  id: number;
  fromStatus: AppraisalStatus | null;
  toStatus: AppraisalStatus;
  action: AppraisalAction;
  comment: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface AppraisalResponse {
  id: string;
  departmentId: string;
  departmentName: string | null;
  period: string;
  criteriaSetId: string;
  criteriaSetVersion: number;
  criteriaSetStatus: CriteriaSetStatus;
  status: AppraisalStatus;
  source: AppraisalSource;
  createdBy: string | null;
  createdAt: string;
  criteria: CriterionResponse[];
  employees: AppraisalEmployeeResponse[];
}

export interface AppraisalQuery extends PaginationQuery {
  status?: AppraisalStatus;
  department?: string;
  periodFrom?: string;
  periodTo?: string;
}
