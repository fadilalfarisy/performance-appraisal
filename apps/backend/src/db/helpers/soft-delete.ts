import { isNull, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Every query on a soft-deletable table must include this filter so deleted
 * rows never leak into results. Repositories should never hand-write
 * `deleted_at IS NULL`.
 */
export function notDeleted(table: { deletedAt: PgColumn }): SQL {
  return isNull(table.deletedAt);
}
