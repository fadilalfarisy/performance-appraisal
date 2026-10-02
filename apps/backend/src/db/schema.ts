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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
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
    employeeId: uuid('employee_id')
      .references(() => employees.id)
      .notNull(),
    role: userRoleEnum('role').notNull(),
    ...baseFields,
  },
  (table) => [
    index('idx_users_username').on(table.username),
    index('idx_users_employee').on(table.employeeId),
    index('idx_users_role').on(table.role),
    index('idx_users_created_at_desc').on(table.createdAt.desc()),
  ],
);

// --- 2. Employee & Contract Structure ---

export const contractStatusEnum = pgEnum('contract_status', [
  'CONTRACT',
  'PERMANENT',
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
    name: varchar('name', { length: 255 }).notNull(),
    ...baseFields,
  },
  (table) => [
    index('idx_departments_name').on(table.name),
    index('idx_departments_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const positions = pgTable(
  'positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    departmentId: uuid('department_id').references(() => departments.id),
    ...baseFields,
  },
  (table) => [
    index('idx_positions_name').on(table.name),
    index('idx_positions_department').on(table.departmentId),
    index('idx_positions_created_at_desc').on(table.createdAt.desc()),
  ],
);

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nip: varchar('nip', { length: 6 }).notNull().unique(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    birthDate: date('birth_date').notNull(),
    gender: employeeGenderEnum('gender').notNull(),
    positionId: uuid('position_id').references(() => positions.id),
    departmentId: uuid('department_id').references(() => departments.id),
    managerId: uuid('manager_id'), // Self-reference configured in relations
    status: employeeStatusEnum('status').default('ACTIVE').notNull(),
    address: text('address'),
    ...baseFields,
  },
  (table) => [
    index('idx_employees_nip').on(table.nip),
    index('idx_employees_fullname').on(table.fullName),
    index('idx_employees_gender').on(table.gender),
    index('idx_employees_status').on(table.status),
    index('idx_employees_department').on(table.departmentId),
    index('idx_employees_position').on(table.positionId),
    index('idx_employees_manager').on(table.managerId),
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
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    status: contractStatusEnum('status').default('CONTRACT').notNull(),
    ...baseFields,
  },
  (table) => [
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

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  employees: many(employees),
  department: one(departments, {
    fields: [positions.departmentId],
    references: [departments.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: 'managerRelation',
  }),
  subordinates: many(employees, { relationName: 'managerRelation' }),
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
