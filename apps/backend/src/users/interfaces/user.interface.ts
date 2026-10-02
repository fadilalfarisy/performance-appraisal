import { EmployeePayload } from "../../employees/interfaces/employee.interface";

export interface UserPayload {
    id: string;
    username: string;
    employee: Partial<EmployeePayload> | null;
    role: string | null;
}
