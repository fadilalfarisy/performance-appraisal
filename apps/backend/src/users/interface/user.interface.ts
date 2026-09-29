import { EmployeePayload } from "../../employees/interfaces/employee.interface";
import { RolePayload } from "../../roles/interfaces/role.interface";

export interface UserPayload {
    id: string;
    username: string;
    employee: Partial<EmployeePayload> | null;
    role: Partial<RolePayload> | null;
}
