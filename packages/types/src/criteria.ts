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
  fieldKey: string;
  label: string;
  inputType: FieldInputType;
  required?: boolean;
  defaultValue?: FieldValue;
  rules?: FieldRules;
  options?: FieldOption[];
  displayOrder?: number;
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
  fields?: CriterionFieldInput[];
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

export interface CriterionFieldResponse extends CriterionFieldInput {
  id: string;
  criterionId: string;
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
  fields: CriterionFieldResponse[];
}

export interface CriteriaSetResponse {
  id: string;
  version: number;
  status: CriteriaSetStatus;
  note: string | null;
  createdBy: string | null;
  activatedBy: string | null;
  activatedAt: string | null;
  criteria: CriterionResponse[];
}
