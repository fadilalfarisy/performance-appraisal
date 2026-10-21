export enum UserRole {
  ADMIN = 'ADMIN',
  HR = 'HR',
  HEAD_DEPARTMENT = 'HEAD_DEPARTMENT',
  SUPERVISOR = 'SUPERVISOR',
  MANAGER = 'MANAGER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
}

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ContractType {
  PERMANENT = 'PERMANENT',
  FIXED_TERM = 'FIXED_TERM',
  PROBATION = 'PROBATION',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CriteriaType {
  BENEFIT = 'BENEFIT',
  COST = 'COST',
}

export enum CriteriaSetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
}

export enum FieldInputType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  OPTION = 'OPTION',
  MULTI_OPTION = 'MULTI_OPTION',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
}

export enum AppraisalStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  COMPLETE = 'COMPLETE',
}

export enum AppraisalSource {
  MANUAL = 'MANUAL',
  SCHEDULER = 'SCHEDULER',
}

export enum AppraisalAction {
  TRANSITION = 'TRANSITION',
  SEND_BACK = 'SEND_BACK',
  REOPEN = 'REOPEN',
}

export enum ColumnEmployee {
  EMPLOYEE_NUMBER = 'employeeNumber',
  FULL_NAME = 'fullName',
  DEPARTMENT = 'department',
  POSITION = 'position',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}
