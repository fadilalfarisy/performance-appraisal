import type {
  CriterionFieldInput,
  CriterionInput,
  CriterionResponse,
} from '@appraisal/types';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';
import {
  isValueEmpty,
  requiresOptions,
  validateFieldValue,
} from '../common/utils/field-validation';

/**
 * Validates a whole criteria set. Extracted as a pure function so it can be
 * unit tested and reused by the seed and importer code.
 */
export function validateCriteriaSet(list: CriterionInput[]): void {
  const codes = new Set<string>();
  let total = 0;

  for (const criterion of list) {
    if (codes.has(criterion.code)) {
      throw new BusinessLogicException(
        `Duplicate criterion code: ${criterion.code}`,
        'CRITERIA_DUPLICATE_CODE',
      );
    }
    codes.add(criterion.code);

    if (criterion.scaleMin >= criterion.scaleMax) {
      throw new BusinessLogicException(
        `Criterion ${criterion.code} must have scaleMin < scaleMax`,
        'CRITERIA_INVALID_SCALE',
      );
    }

    const described = new Set(
      (criterion.scaleDescriptions ?? []).map((d) => d.score),
    );
    for (let score = criterion.scaleMin; score <= criterion.scaleMax; score++) {
      if (!described.has(score)) {
        throw new BusinessLogicException(
          `Criterion ${criterion.code} is missing a description for score ${score}`,
          'CRITERIA_SCALE_DESCRIPTION_MISSING',
        );
      }
    }

    total += criterion.weight;
  }

  if (Math.abs(total - 100) > 0.01) {
    throw new BusinessLogicException(
      `Criteria weights must total 100 (currently ${total})`,
      'CRITERIA_WEIGHTS_NOT_100',
    );
  }
}

/**
 * An ACTIVE set keeps its weights and its criterion list. Only content that
 * cannot change the score structure may be updated.
 */
export function validateActiveCriteriaUpdate(
  existing: CriterionResponse[],
  incoming: CriterionInput[],
): void {
  if (incoming.length !== existing.length) {
    throw new BusinessLogicException(
      'The criterion list of an ACTIVE set is locked',
      'CRITERIA_SET_STRUCTURE_LOCKED',
    );
  }

  const existingById = new Map(existing.map((criterion) => [criterion.id, criterion]));
  const seen = new Set<string>();

  for (const criterion of incoming) {
    if (!criterion.id || seen.has(criterion.id)) {
      throw new BusinessLogicException(
        'The criterion list of an ACTIVE set is locked',
        'CRITERIA_SET_STRUCTURE_LOCKED',
      );
    }
    const current = existingById.get(criterion.id);
    if (!current) {
      throw new BusinessLogicException(
        `Criterion ${criterion.id} does not belong to this set`,
        'CRITERIA_SET_STRUCTURE_LOCKED',
      );
    }
    seen.add(criterion.id);

    if (Math.abs(Number(criterion.weight) - Number(current.weight)) > 0.001) {
      throw new BusinessLogicException(
        'Weights cannot be changed on an ACTIVE criteria set',
        'CRITERIA_WEIGHT_LOCKED',
      );
    }
  }

  validateCriteriaSet(incoming);
}

/** Validates the dynamic note form fields owned by a criteria set. */
export function validateFields(fields: CriterionFieldInput[]): void {
  const keys = new Set<string>();
  const labels = new Set<string>();
  for (const field of fields) {
    if (keys.has(field.fieldKey)) {
      throw new BusinessLogicException(
        `Duplicate field key ${field.fieldKey} in this criteria set`,
        'CRITERIA_FIELD_DUPLICATE_KEY',
      );
    }
    keys.add(field.fieldKey);

    const label = field.label.trim().toLowerCase();
    if (labels.has(label)) {
      throw new BusinessLogicException(
        `Duplicate field label "${field.label}" in this criteria set`,
        'CRITERIA_FIELD_DUPLICATE_LABEL',
      );
    }
    labels.add(label);

    if (requiresOptions(field.inputType) && (field.options ?? []).length === 0) {
      throw new BusinessLogicException(
        `Field ${field.fieldKey} needs at least one option`,
        'CRITERIA_FIELD_OPTIONS_REQUIRED',
      );
    }

    if (!isValueEmpty(field.defaultValue)) {
      const error = validateFieldValue(
        field.inputType,
        field.defaultValue ?? null,
        field.rules,
        field.options,
      );
      if (error) {
        throw new BusinessLogicException(
          `Field ${field.fieldKey} default value ${error}`,
          'CRITERIA_FIELD_INVALID_DEFAULT',
        );
      }
    }
  }
}
