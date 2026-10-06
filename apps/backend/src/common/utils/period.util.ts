/** Period helpers. A period is the first day of a month, stored as `YYYY-MM-01`. */

export function toPeriod(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function currentPeriod(): string {
  return toPeriod(new Date());
}

export function addMonths(period: string, months: number): string {
  const date = new Date(period);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  )
    .toISOString()
    .slice(0, 10);
}

export function periodStart(period: string): string {
  return toPeriod(new Date(period));
}

export function periodEnd(period: string): string {
  const date = new Date(period);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  );
  return last.toISOString().slice(0, 10);
}
