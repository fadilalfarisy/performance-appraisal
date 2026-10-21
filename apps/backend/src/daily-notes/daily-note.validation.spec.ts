import { FieldInputType, type CriterionFieldResponse } from '@appraisal/types';
import { validateNoteValues } from './daily-note.validation';

const field = (
  overrides: Partial<CriterionFieldResponse> = {},
): CriterionFieldResponse => ({
  id: 'f1',
  criterionId: 'c1',
  fieldKey: 'field',
  label: 'Field',
  inputType: FieldInputType.TEXT,
  required: false,
  displayOrder: 0,
  ...overrides,
});

describe('validateNoteValues', () => {
  it('accepts values that match the field definitions', () => {
    expect(() =>
      validateNoteValues(
        [field({ inputType: FieldInputType.NUMBER, rules: { min: 0, max: 10 } })],
        [{ fieldId: 'f1', value: 5 }],
      ),
    ).not.toThrow();
  });

  it('rejects an unknown field', () => {
    expect(() =>
      validateNoteValues([field()], [{ fieldId: 'nope', value: 'x' }]),
    ).toThrow(/Unknown field/);
  });

  it('enforces required fields', () => {
    expect(() =>
      validateNoteValues([field({ required: true })], []),
    ).toThrow(/required/);
  });

  it('rejects a value of the wrong type', () => {
    expect(() =>
      validateNoteValues(
        [field({ inputType: FieldInputType.NUMBER })],
        [{ fieldId: 'f1', value: 'abc' }],
      ),
    ).toThrow(/must be a number/);
  });

  it('rejects a value outside the rules', () => {
    expect(() =>
      validateNoteValues(
        [field({ inputType: FieldInputType.NUMBER, rules: { max: 3 } })],
        [{ fieldId: 'f1', value: 5 }],
      ),
    ).toThrow(/at most 3/);
  });

  it('rejects an option that is not offered', () => {
    expect(() =>
      validateNoteValues(
        [
          field({
            inputType: FieldInputType.OPTION,
            options: [{ value: 'A', label: 'A' }],
          }),
        ],
        [{ fieldId: 'f1', value: 'B' }],
      ),
    ).toThrow(/option/);
  });

  it('accepts a list of allowed options for a multi option field', () => {
    expect(() =>
      validateNoteValues(
        [
          field({
            inputType: FieldInputType.MULTI_OPTION,
            options: [
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
            ],
          }),
        ],
        [{ fieldId: 'f1', value: ['A', 'B'] }],
      ),
    ).not.toThrow();
  });
});
