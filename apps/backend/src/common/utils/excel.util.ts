/**
 * Prefixes a cell that would be read as a spreadsheet formula with `'`, so
 * exported data cannot execute as a formula in Excel.
 */
export function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
