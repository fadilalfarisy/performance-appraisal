import {
  FieldInputType,
  type CriterionFieldInput,
  type CriterionInput,
  type CriterionResponse,
} from '@appraisal/types';
import {
  validateActiveCriteriaUpdate,
  validateCriteriaSet,
  validateFields,
} from './criteria.validation';

function criterion(overrides: Partial<CriterionInput> = {}): CriterionInput {
  return {
    code: 'QUALITY',
    name: 'Quality',
    scaleMin: 1,
    scaleMax: 5,
    weight: 100,
    scaleDescriptions: [1, 2, 3, 4, 5].map((score) => ({
      score,
      description: `Level ${score}`,
    })),
    ...overrides,
  };
}

describe('validateCriteriaSet', () => {
  it('accepts a valid set that totals 100', () => {
    expect(() => validateCriteriaSet([criterion()])).not.toThrow();
  });

  it('rejects weights that do not total 100', () => {
    expect(() =>
      validateCriteriaSet([criterion({ weight: 90 })]),
    ).toThrow(/total 100/);
  });

  it('rejects a missing score description', () => {
    expect(() =>
      validateCriteriaSet([
        criterion({
          scaleDescriptions: [
            { score: 1, description: 'a' },
            { score: 2, description: 'b' },
          ],
        }),
      ]),
    ).toThrow(/missing a description/);
  });

  it('rejects scaleMin >= scaleMax', () => {
    expect(() =>
      validateCriteriaSet([criterion({ scaleMin: 5, scaleMax: 5 })]),
    ).toThrow(/scaleMin < scaleMax/);
  });

  it('rejects duplicate codes', () => {
    expect(() =>
      validateCriteriaSet([
        criterion({ weight: 50 }),
        criterion({ weight: 50 }),
      ]),
    ).toThrow(/Duplicate criterion code/);
  });
});

function field(overrides: Partial<CriterionFieldInput> = {}): CriterionFieldInput {
  return {
    fieldKey: 'tasks',
    label: 'Tasks completed',
    inputType: FieldInputType.TEXT,
    ...overrides,
  };
}

describe('validateFields', () => {
  it('accepts a valid field definition', () => {
    expect(() =>
      validateFields([
        field({
          inputType: FieldInputType.NUMBER,
          rules: { min: 0, max: 20 },
        }),
      ]),
    ).not.toThrow();
  });

  it('rejects duplicate field keys across the set', () => {
    expect(() =>
      validateFields([
        field({ fieldKey: 'x', label: 'X' }),
        field({ fieldKey: 'x', label: 'X2' }),
      ]),
    ).toThrow(/Duplicate field key/);
  });

  it('requires options for option fields', () => {
    expect(() =>
      validateFields([
        field({ fieldKey: 'pick', label: 'Pick', inputType: FieldInputType.OPTION }),
      ]),
    ).toThrow(/at least one option/);
  });

  it('rejects a default value that does not match the type', () => {
    expect(() =>
      validateFields([
        field({
          fieldKey: 'count',
          label: 'Count',
          inputType: FieldInputType.NUMBER,
          defaultValue: 'not a number',
        }),
      ]),
    ).toThrow(/default value/);
  });
});

function existingCriterion(
  overrides: Partial<CriterionResponse> = {},
): CriterionResponse {
  return {
    id: 'criterion-1',
    code: 'QUALITY',
    name: 'Quality',
    description: null,
    scaleMin: 1,
    scaleMax: 5,
    weight: 100,
    displayOrder: 0,
    scaleDescriptions: [1, 2, 3, 4, 5].map((score) => ({
      score,
      description: `Level ${score}`,
    })),
    ...overrides,
  };
}

describe('validateActiveCriteriaUpdate', () => {
  it('accepts content changes while keeping weight and structure', () => {
    expect(() =>
      validateActiveCriteriaUpdate([existingCriterion()], [
        criterion({
          id: 'criterion-1',
          code: 'QUALITY_V2',
          name: 'Quality v2',
          scaleMax: 6,
          scaleDescriptions: [1, 2, 3, 4, 5, 6].map((score) => ({
            score,
            description: `Level ${score}`,
          })),
        }),
      ]),
    ).not.toThrow();
  });

  it('rejects a weight change', () => {
    expect(() =>
      validateActiveCriteriaUpdate([existingCriterion()], [
        criterion({ id: 'criterion-1', weight: 90 }),
      ]),
    ).toThrow(/Weights cannot be changed/);
  });

  it('rejects adding or removing criteria', () => {
    expect(() =>
      validateActiveCriteriaUpdate([existingCriterion()], []),
    ).toThrow(/criterion list/);

    expect(() =>
      validateActiveCriteriaUpdate([existingCriterion()], [
        criterion({ id: 'criterion-1', weight: 50 }),
        criterion({ id: 'criterion-2', code: 'OTHER', weight: 50 }),
      ]),
    ).toThrow(/criterion list/);
  });

  it('rejects a criterion that does not belong to the set', () => {
    expect(() =>
      validateActiveCriteriaUpdate([existingCriterion()], [
        criterion({ id: 'criterion-other' }),
      ]),
    ).toThrow(/does not belong/);
  });
});
