import { EmployeeStatus } from "../enum/employee.enum";

export const employeeStatusOption = [
  {
    label: EmployeeStatus.ACTIVE,
    value: EmployeeStatus.ACTIVE,
  },
  {
    label: EmployeeStatus.INACTIVE,
    value: EmployeeStatus.INACTIVE,
  },
];

export const employeeStatusColor: Record<string, string> = {
  ACTIVE: "blue", // green
  INACTIVE: "red", // gold
};