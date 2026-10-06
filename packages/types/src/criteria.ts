import type { CriteriaSetStatus } from './enums';

export interface CriteriaScaleDescriptionInput {
  score: number;
  description: string;
}

export interface CriterionInput {
  code: string;
  name: string;
  description?: string;
  scaleMin: number;
  scaleMax: number;
  weight: number;
  displayOrder?: number;
  scaleDescriptions: CriteriaScaleDescriptionInput[];
}

export interface CreateCriteriaSetRequest {
  note?: string;
  criteria?: CriterionInput[];
}

export interface UpdateCriteriaSetRequest {
  note?: string;
  criteria?: CriterionInput[];
}

export interface CriteriaScaleDescriptionResponse {
  score: number;
  description: string;
}

export interface CriterionResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scaleMin: number;
  scaleMax: number;
  weight: number;
  displayOrder: number;
  scaleDescriptions: CriteriaScaleDescriptionResponse[];
}

export interface CriteriaSetResponse {
  id: string;
  version: number;
  status: CriteriaSetStatus;
  effectiveDate: string | null;
  note: string | null;
  createdBy: string | null;
  activatedBy: string | null;
  activatedAt: string | null;
  criteria: CriterionResponse[];
}
