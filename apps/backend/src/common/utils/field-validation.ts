import {
  FieldInputType,
  type FieldOption,
  type FieldRules,
  type FieldValue,
} from '@appraisal/types';

/** A value counts as missing when it is null, undefined, empty string, or an empty list. */
export function isValueEmpty(value: FieldValue | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Checks a single value against a field's input type and rules.
 * Returns an error message, or null when the value is valid. An empty value is
 * treated as "absent" and returns null — required-ness is enforced by callers.
 */
export function validateFieldValue(
  inputType: FieldInputType,
  value: FieldValue,
  rules?: FieldRules | null,
  options?: FieldOption[] | null,
): string | null {
  if (isValueEmpty(value)) return null;

  switch (inputType) {
    case FieldInputType.NUMBER: {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'must be a number';
      }
      if (rules?.min !== undefined && value < rules.min) {
        return `must be at least ${rules.min}`;
      }
      if (rules?.max !== undefined && value > rules.max) {
        return `must be at most ${rules.max}`;
      }
      return null;
    }
    case FieldInputType.BOOLEAN:
      return typeof value === 'boolean' ? null : 'must be true or false';
    case FieldInputType.OPTION: {
      if (typeof value !== 'string') return 'must be a single option';
      const allowed = new Set((options ?? []).map((option) => option.value));
      return allowed.has(value) ? null : 'is not one of the allowed options';
    }
    case FieldInputType.MULTI_OPTION: {
      if (!Array.isArray(value)) return 'must be a list of options';
      const allowed = new Set((options ?? []).map((option) => option.value));
      const valid = value.every(
        (item) => typeof item === 'string' && allowed.has(item),
      );
      return valid ? null : 'contains an option that is not allowed';
    }
    case FieldInputType.DATE:
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? null
        : 'must be a YYYY-MM-DD date';
    case FieldInputType.TEXT: {
      if (typeof value !== 'string') return 'must be text';
      if (rules?.minLength !== undefined && value.length < rules.minLength) {
        return `must be at least ${rules.minLength} characters`;
      }
      if (rules?.maxLength !== undefined && value.length > rules.maxLength) {
        return `must be at most ${rules.maxLength} characters`;
      }
      if (rules?.pattern) {
        try {
          if (!new RegExp(rules.pattern).test(value)) return 'has an invalid format';
        } catch {
          return 'has an invalid format';
        }
      }
      return null;
    }
    default:
      return null;
  }
}

/** Option-bearing input types must carry at least one option. */
export function requiresOptions(inputType: FieldInputType): boolean {
  return (
    inputType === FieldInputType.OPTION ||
    inputType === FieldInputType.MULTI_OPTION
  );
}
