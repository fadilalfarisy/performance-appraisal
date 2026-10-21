import { FieldInputType, type CriterionInput } from '@appraisal/types';
import { validateCriteriaSet } from './criteria.validation';

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

  describe('form fields', () => {
    it('accepts a valid field definition', () => {
      expect(() =>
        validateCriteriaSet([
          criterion({
            fields: [
              {
                fieldKey: 'tasks',
                label: 'Tasks completed',
                inputType: FieldInputType.NUMBER,
                rules: { min: 0, max: 20 },
              },
            ],
          }),
        ]),
      ).not.toThrow();
    });

    it('rejects duplicate field keys', () => {
      expect(() =>
        validateCriteriaSet([
          criterion({
            fields: [
              { fieldKey: 'x', label: 'X', inputType: FieldInputType.TEXT },
              { fieldKey: 'x', label: 'X2', inputType: FieldInputType.TEXT },
            ],
          }),
        ]),
      ).toThrow(/Duplicate field key/);
    });

    it('requires options for option fields', () => {
      expect(() =>
        validateCriteriaSet([
          criterion({
            fields: [
              { fieldKey: 'pick', label: 'Pick', inputType: FieldInputType.OPTION },
            ],
          }),
        ]),
      ).toThrow(/at least one option/);
    });

    it('rejects a default value that does not match the type', () => {
      expect(() =>
        validateCriteriaSet([
          criterion({
            fields: [
              {
                fieldKey: 'count',
                label: 'Count',
                inputType: FieldInputType.NUMBER,
                defaultValue: 'not a number',
              },
            ],
          }),
        ]),
      ).toThrow(/default value/);
    });
  });
});
