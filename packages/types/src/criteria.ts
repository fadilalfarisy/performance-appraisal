import type { CriteriaType } from './enums';

export interface CreateChildCriteriaRequest {
  name: string;
  description: string;
  weight: number;
  type: CriteriaType;
}

export interface CreateCriteriaRequest {
  version: string;
  description: string;
  criterias: CreateChildCriteriaRequest[];
}

export interface CriteriaVersionResponse {
  id: string;
  major: number;
  minor: number;
  patch: number;
  description: string;
}

export interface CriterionResponse {
  id: string;
  name: string;
  weight: number;
  type: string;
  description: string;
  version: number;
}
