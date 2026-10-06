import type { PaginationQuery } from './common';
import type { CriterionResponse } from './criteria';
import type {
  AppraisalAction,
  AppraisalSource,
  AppraisalStatus,
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
  contractEndDate: string | null;
}

export interface PreviewAppraisalRequest {
  departmentId: string;
  period: string;
}

export interface PreviewAppraisalResponse {
  departmentId: string;
  period: string;
  criteriaSetId: string;
  criteriaSetVersion: number;
  employees: EligibleEmployeeResponse[];
}

export interface CreateAppraisalRequest {
  departmentId: string;
  period: string;
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
  contractEndDate: string | null;
  comment: string | null;
  totalScore: number | null;
  ratings: AppraisalRatingResponse[];
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
