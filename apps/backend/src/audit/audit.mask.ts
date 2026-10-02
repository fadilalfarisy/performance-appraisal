export const MASKED = '***';

const DENY_LIST = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
];

/**
 * Removes sensitive values from audit payloads. Applied centrally by
 * AuditService so no caller can forget it.
 */
export function maskSensitive<T>(value: T): T {
  return mask(value) as T;
}

function mask(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => mask(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = DENY_LIST.some((pattern) => pattern.test(key))
        ? MASKED
        : mask(val);
    }
    return result;
  }

  return value;
}
