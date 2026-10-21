import type { CriterionInput } from '@appraisal/types';
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

    validateCriterionFields(criterion);

    total += criterion.weight;
  }

  if (Math.abs(total - 100) > 0.01) {
    throw new BusinessLogicException(
      `Criteria weights must total 100 (currently ${total})`,
      'CRITERIA_WEIGHTS_NOT_100',
    );
  }
}

function validateCriterionFields(criterion: CriterionInput): void {
  const keys = new Set<string>();
  for (const field of criterion.fields ?? []) {
    if (keys.has(field.fieldKey)) {
      throw new BusinessLogicException(
        `Duplicate field key ${field.fieldKey} in criterion ${criterion.code}`,
        'CRITERIA_FIELD_DUPLICATE_KEY',
      );
    }
    keys.add(field.fieldKey);

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
