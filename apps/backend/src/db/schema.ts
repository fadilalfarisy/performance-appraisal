import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  date,
  pgEnum,
  jsonb,
  primaryKey,
  uniqueIndex,
  check,
  numeric,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { uuid } from 'drizzle-orm/pg-core';
import { index } from 'drizzle-orm/pg-core';

// Base timestamps helper
const baseFields = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
};

// --- 1. User Management ---

export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'HR',
  'HEAD_DEPARTMENT',
  'SUPERVISOR',
  'MANAGER',
  'GENERAL_MANAGER',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    employeeId: uuid('employee_id').references(() => employees.id),
    role: userRoleEnum('role').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...baseFields,
  },
  (table) => [
    index('idx_users_username').on(table.username),
    index('idx_users_employee').on(table.employeeId),
    index('idx_users_role').on(table.role),
    index('idx_users_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(), // equals the JWT jti
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
  },
  (table) => [index('idx_refresh_tokens_user').on(table.userId)],
);

// Department scope for HEAD_DEPARTMENT and MANAGER users.
export const userDepartments = pgTable(
  'user_departments',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    departmentId: uuid('department_id')
      .references(() => departments.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.departmentId] }),
    index('idx_user_departments_department').on(table.departmentId),
  ],
);

// --- 2. Employee & Contract Structure ---

export const employeeStatusEnum = pgEnum('employee_status', [
  'ACTIVE',
  'INACTIVE',
]);
export const employeeGenderEnum = pgEnum('employee_gender', ['MALE', 'FEMALE']);

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    headEmployeeId: uuid('head_employee_id').references(
      (): AnyPgColumn => employees.id,
    ),
    isActive: boolean('is_active').default(true).notNull(),
    ...baseFields,
  },
  (table) => [
    index('idx_departments_name').on(table.name),
    index('idx_departments_code').on(table.code),
    index('idx_departments_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    level: integer('level').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...baseFields,
  },
  (table) => [
    index('idx_positions_name').on(table.name),
    index('idx_positions_code').on(table.code),
    index('idx_positions_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeNumber: varchar('employee_number', { length: 50 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    gender: employeeGenderEnum('gender').notNull(),
    birthDate: date('birth_date').notNull(),
    joinDate: date('join_date').notNull(),
    address: text('address'),
    departmentId: uuid('department_id').references(() => departments.id),
    positionId: uuid('position_id').references(() => positions.id),
    status: employeeStatusEnum('status').default('ACTIVE').notNull(),
    superiorId: uuid('superior_id'), // self-reference configured in relations
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_employees_number_active')
      .on(table.employeeNumber)
      .where(sql`deleted_at is null`),
    index('idx_employees_number').on(table.employeeNumber),
    index('idx_employees_fullname').on(table.fullName),
    index('idx_employees_status').on(table.status),
    index('idx_employees_department').on(table.departmentId),
    index('idx_employees_position').on(table.positionId),
    index('idx_employees_superior').on(table.superiorId),
    index('idx_employees_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    contractType: varchar('contract_type', { length: 50 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_contracts_employee_start')
      .on(table.employeeId, table.startDate)
      .where(sql`deleted_at is null`),
    index('idx_contracts_employee').on(table.employeeId),
    index('idx_contracts_start_date').on(table.startDate),
    index('idx_contracts_end_date').on(table.endDate),
    index('idx_contracts_created_at_desc').on(table.createdAt.desc()),
  ],
);

// --- 3. Criteria Versioning ---

export const criteriaSetStatusEnum = pgEnum('criteria_set_status', [
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
]);

export const criteriaSets = pgTable(
  'criteria_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: integer('version').notNull(),
    status: criteriaSetStatusEnum('status').default('DRAFT').notNull(),
    effectiveDate: date('effective_date'),
    note: text('note'),
    createdBy: uuid('created_by').references(() => users.id),
    activatedBy: uuid('activated_by').references(() => users.id),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_criteria_sets_version').on(table.version),
    uniqueIndex('uq_criteria_sets_active')
      .on(table.status)
      .where(sql`status = 'ACTIVE'`),
  ],
);

export const criteria = pgTable(
  'criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    criteriaSetId: uuid('criteria_set_id')
      .references(() => criteriaSets.id, { onDelete: 'cascade' })
      .notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    scaleMin: integer('scale_min').notNull(),
    scaleMax: integer('scale_max').notNull(),
    weight: numeric('weight', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_criteria_set_code').on(table.criteriaSetId, table.code),
    check('criteria_scale_check', sql`${table.scaleMin} < ${table.scaleMax}`),
    check('criteria_weight_check', sql`${table.weight} > 0`),
  ],
);

export const criteriaScaleDescriptions = pgTable(
  'criteria_scale_descriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    criterionId: uuid('criterion_id')
      .references(() => criteria.id, { onDelete: 'cascade' })
      .notNull(),
    score: integer('score').notNull(),
    description: text('description').notNull(),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_criteria_scale').on(table.criterionId, table.score),
  ],
);

// --- 4. Dynamic Input Metadata ---

export const dynamicInputs = pgTable(
  'dynamic_inputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formId: varchar('form_id', { length: 255 }).notNull(),
    field: varchar('field', { length: 255 }).notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    required: boolean('required').default(false).notNull(),
    defaultValue: jsonb('default_value'),
    rules: jsonb('rules'),
    ...baseFields,
  },
  (table) => [
    index('idx_dynamic_inputs_form_id').on(table.formId),
    index('idx_dynamic_inputs_created_at_desc').on(table.createdAt.desc()),
  ],
);

// --- 5. Input Sources (Daily Notes) ---

export const dailyNotes = pgTable('daily_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  supervisorId: uuid('supervisor_id')
    .references(() => employees.id)
    .notNull(),
  recordDate: date('record_date').notNull(),
  score: jsonb('score'),
  note: text('note'),
  description: text('description').notNull(),
  ...baseFields,
});

// --- 6. Appraisals ---

export const appraisalStatusEnum = pgEnum('appraisal_status', [
  'DRAFT',
  'PENDING',
  'SUBMITTED',
  'APPROVED',
  'COMPLETE',
]);

export const appraisalSourceEnum = pgEnum('appraisal_source', [
  'MANUAL',
  'SCHEDULER',
]);

export const appraisals = pgTable(
  'appraisals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    departmentId: uuid('department_id')
      .references(() => departments.id)
      .notNull(),
    period: date('period').notNull(),
    criteriaSetId: uuid('criteria_set_id')
      .references(() => criteriaSets.id)
      .notNull(),
    status: appraisalStatusEnum('status').default('DRAFT').notNull(),
    source: appraisalSourceEnum('source').default('MANUAL').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    deletedBy: uuid('deleted_by'),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_appraisals_department_period')
      .on(table.departmentId, table.period)
      .where(sql`deleted_at is null`),
    index('idx_appraisals_status').on(table.status),
    index('idx_appraisals_department_status').on(
      table.departmentId,
      table.status,
    ),
  ],
);

export const appraisalEmployees = pgTable(
  'appraisal_employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appraisalId: uuid('appraisal_id')
      .references(() => appraisals.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id)
      .notNull(),
    employeeNumber: varchar('employee_number', { length: 50 }).notNull(),
    employeeName: varchar('employee_name', { length: 255 }).notNull(),
    departmentId: uuid('department_id'),
    departmentName: varchar('department_name', { length: 255 }),
    positionId: uuid('position_id'),
    positionName: varchar('position_name', { length: 255 }),
    contractId: uuid('contract_id'),
    contractType: varchar('contract_type', { length: 50 }),
    contractEndDate: date('contract_end_date'),
    comment: text('comment'),
    totalScore: numeric('total_score', { precision: 5, scale: 2, mode: 'number' }),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_appraisal_employee').on(
      table.appraisalId,
      table.employeeId,
    ),
  ],
);

export const appraisalRatings = pgTable(
  'appraisal_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    appraisalEmployeeId: uuid('appraisal_employee_id')
      .references(() => appraisalEmployees.id, { onDelete: 'cascade' })
      .notNull(),
    criterionId: uuid('criterion_id')
      .references(() => criteria.id)
      .notNull(),
    rating: integer('rating').notNull(),
    updatedBy: uuid('updated_by'),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_appraisal_rating').on(
      table.appraisalEmployeeId,
      table.criterionId,
    ),
  ],
);

export const appraisalStatusHistory = pgTable('appraisal_status_history', {
  id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  appraisalId: uuid('appraisal_id')
    .references(() => appraisals.id, { onDelete: 'cascade' })
    .notNull(),
  fromStatus: appraisalStatusEnum('from_status'),
  toStatus: appraisalStatusEnum('to_status').notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  comment: text('comment'),
  actorUserId: uuid('actor_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- RELATIONSHIPS ---

export const usersRelations = relations(users, ({ one, many }) => ({
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
  refreshTokens: many(refreshTokens),
  departments: many(userDepartments),
}));

export const userDepartmentsRelations = relations(
  userDepartments,
  ({ one }) => ({
    user: one(users, {
      fields: [userDepartments.userId],
      references: [users.id],
    }),
    department: one(departments, {
      fields: [userDepartments.departmentId],
      references: [departments.id],
    }),
  }),
);

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const positionsRelations = relations(positions, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  superior: one(employees, {
    fields: [employees.superiorId],
    references: [employees.id],
    relationName: 'superiorRelation',
  }),
  subordinates: many(employees, { relationName: 'superiorRelation' }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),
  contracts: many(contracts),
  dailyNotes: many(dailyNotes),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  employee: one(employees, {
    fields: [contracts.employeeId],
    references: [employees.id],
  }),
}));

export const criteriaSetsRelations = relations(criteriaSets, ({ many }) => ({
  criteria: many(criteria),
}));

export const criteriaRelations = relations(criteria, ({ one, many }) => ({
  criteriaSet: one(criteriaSets, {
    fields: [criteria.criteriaSetId],
    references: [criteriaSets.id],
  }),
  scaleDescriptions: many(criteriaScaleDescriptions),
}));

export const criteriaScaleDescriptionsRelations = relations(
  criteriaScaleDescriptions,
  ({ one }) => ({
    criterion: one(criteria, {
      fields: [criteriaScaleDescriptions.criterionId],
      references: [criteria.id],
    }),
  }),
);

export const dailyNotesRelations = relations(dailyNotes, ({ one }) => ({
  employee: one(employees, {
    fields: [dailyNotes.employeeId],
    references: [employees.id],
  }),
  supervisor: one(employees, {
    fields: [dailyNotes.supervisorId],
    references: [employees.id],
  }),
}));

export const appraisalsRelations = relations(appraisals, ({ one, many }) => ({
  department: one(departments, {
    fields: [appraisals.departmentId],
    references: [departments.id],
  }),
  criteriaSet: one(criteriaSets, {
    fields: [appraisals.criteriaSetId],
    references: [criteriaSets.id],
  }),
  employees: many(appraisalEmployees),
  history: many(appraisalStatusHistory),
}));

export const appraisalEmployeesRelations = relations(
  appraisalEmployees,
  ({ one, many }) => ({
    appraisal: one(appraisals, {
      fields: [appraisalEmployees.appraisalId],
      references: [appraisals.id],
    }),
    ratings: many(appraisalRatings),
  }),
);

export const appraisalRatingsRelations = relations(
  appraisalRatings,
  ({ one }) => ({
    appraisalEmployee: one(appraisalEmployees, {
      fields: [appraisalRatings.appraisalEmployeeId],
      references: [appraisalEmployees.id],
    }),
    criterion: one(criteria, {
      fields: [appraisalRatings.criterionId],
      references: [criteria.id],
    }),
  }),
);

export const appraisalStatusHistoryRelations = relations(
  appraisalStatusHistory,
  ({ one }) => ({
    appraisal: one(appraisals, {
      fields: [appraisalStatusHistory.appraisalId],
      references: [appraisals.id],
    }),
  }),
);
