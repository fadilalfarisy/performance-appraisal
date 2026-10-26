import type { CriteriaSetStatus, FieldInputType } from './enums';

export interface CriteriaScaleDescriptionInput {
  score: number;
  description: string;
}

export type FieldValue = string | number | boolean | string[] | null;

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface CriterionFieldInput {
  id?: string;
  fieldKey: string;
  label: string;
  description?: string;
  inputType: FieldInputType;
  required?: boolean;
  defaultValue?: FieldValue;
  rules?: FieldRules;
  options?: FieldOption[];
  displayOrder?: number;
}

export interface CriterionInput {
  id?: string;
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
  departmentId?: string | null;
  note?: string;
  criteria?: CriterionInput[];
  fields?: CriterionFieldInput[];
}

export interface UpdateCriteriaSetRequest {
  note?: string;
  criteria?: CriterionInput[];
  fields?: CriterionFieldInput[];
}

export interface CriteriaScaleDescriptionResponse {
  score: number;
  description: string;
}

export interface CriterionFieldResponse extends CriterionFieldInput {
  id: string;
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
  departmentId: string | null;
  departmentName: string | null;
  version: number;
  status: CriteriaSetStatus;
  note: string | null;
  createdBy: string | null;
  activatedBy: string | null;
  activatedAt: string | null;
  criteria: CriterionResponse[];
  fields: CriterionFieldResponse[];
}

export interface CriteriaSetSummary {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  version: number;
  status: CriteriaSetStatus;
  note: string | null;
  activatedAt: string | null;
  criteriaCount: number;
}
