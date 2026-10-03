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

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CriteriaType {
  BENEFIT = 'BENEFIT',
  COST = 'COST',
}

export enum ColumnEmployee {
  EMPLOYEE_NUMBER = 'employeeNumber',
  FULL_NAME = 'fullName',
  DEPARTMENT = 'department',
  POSITION = 'position',
  STATUS = 'status',
  CONTRACT_STATUS = 'contractStatus',
  CREATED_AT = 'createdAt',
}
