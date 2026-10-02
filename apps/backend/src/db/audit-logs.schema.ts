import {
  bigint,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * `audit_logs` is created by the custom SQL migration (partitioned by month on
 * occurred_at, with restricted grants). It is intentionally NOT part of
 * `src/db/schema.ts`, so `drizzle-kit generate` never tries to recreate it.
 */
export const auditLogs = pgTable('audit_logs', {
  id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity(),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  userId: uuid('user_id'),
  username: varchar('username', { length: 255 }),
  role: varchar('role', { length: 50 }),
  employeeNumber: varchar('employee_number', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }),
  entityId: varchar('entity_id', { length: 100 }),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  metadata: jsonb('metadata'),
  ipAddress: varchar('ip_address', { length: 64 }),
  requestId: varchar('request_id', { length: 100 }),
});

export type AuditLogInsert = typeof auditLogs.$inferInsert;
