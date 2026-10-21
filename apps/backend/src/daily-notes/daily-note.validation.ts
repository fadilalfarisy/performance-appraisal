import type {
  CriterionFieldResponse,
  FieldOption,
  FieldRules,
  FieldValue,
} from '@appraisal/types';
import { BusinessLogicException } from '../common/exceptions/custom.exceptions';
import {
  isValueEmpty,
  validateFieldValue,
} from '../common/utils/field-validation';

export interface NoteValueEntry {
  fieldId: string;
  value: FieldValue;
}

/**
 * Validates a note's answers against the field definitions of the criteria set
 * the note is pinned to. Pure function so it can be unit tested.
 */
export function validateNoteValues(
  fields: CriterionFieldResponse[],
  values: NoteValueEntry[],
): void {
  const known = new Set(fields.map((field) => field.id));

  for (const entry of values) {
    if (!known.has(entry.fieldId)) {
      throw new BusinessLogicException(
        `Unknown field ${entry.fieldId}`,
        'DAILY_NOTE_UNKNOWN_FIELD',
      );
    }
  }

  for (const field of fields) {
    const entry = values.find((value) => value.fieldId === field.id);
    const value = entry?.value ?? null;

    if (field.required && isValueEmpty(value)) {
      throw new BusinessLogicException(
        `Field "${field.label}" is required`,
        'DAILY_NOTE_REQUIRED_FIELD',
      );
    }

    if (!isValueEmpty(value)) {
      const error = validateFieldValue(
        field.inputType,
        value,
        (field.rules as FieldRules | null) ?? null,
        (field.options as FieldOption[] | null) ?? null,
      );
      if (error) {
        throw new BusinessLogicException(
          `Field "${field.label}" ${error}`,
          'DAILY_NOTE_INVALID_VALUE',
        );
      }
    }
  }
}
