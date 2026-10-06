import type { CriterionInput } from '@appraisal/types';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';

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
