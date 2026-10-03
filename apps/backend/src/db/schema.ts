import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  decimal,
  jsonb,
  primaryKey,
  uniqueIndex,
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
    fullName: varchar('full_name', { length: 255 }).notNull(),
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

export const contractStatusEnum = pgEnum('contract_status', [
  'ACTIVE',
  'INACTIVE',
]);
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
    status: contractStatusEnum('status').default('ACTIVE').notNull(),
    ...baseFields,
  },
  (table) => [
    uniqueIndex('uq_contracts_employee_start')
      .on(table.employeeId, table.startDate)
      .where(sql`deleted_at is null`),
    index('idx_contracts_employee').on(table.employeeId),
    index('idx_contracts_start_date').on(table.startDate),
    index('idx_contracts_end_date').on(table.endDate),
    index('idx_contracts_status').on(table.status),
    index('idx_contracts_created_at_desc').on(table.createdAt.desc()),
  ],
);

// --- 3. Criteria (Parent & Child) ---

export const criteriaTypeEnum = pgEnum('criteria_type', ['BENEFIT', 'COST']);

export const parentCriteria = pgTable(
  'parent_criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    description: text('description').notNull(),
    major: integer('major').notNull(),
    minor: integer('minor').notNull(),
    patch: integer('patch').notNull(),
    ...baseFields,
  },
  (table) => [
    index('idx_parent_criteria_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const childCriteria = pgTable(
  'child_criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .references(() => parentCriteria.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    weight: decimal('weight', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }).notNull(),
    ...baseFields,
  },
  (table) => [
    index('idx_child_criteria_parent').on(table.parentId),
    index('idx_child_criteria_created_at_desc').on(table.createdAt.desc()),
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

export const parentCriteriaRelations = relations(
  parentCriteria,
  ({ many }) => ({
    childrenCriteria: many(childCriteria),
  }),
);

export const childCriteriRelations = relations(childCriteria, ({ one }) => ({
  parent: one(parentCriteria, {
    fields: [childCriteria.parentId],
    references: [parentCriteria.id],
  }),
}));

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
