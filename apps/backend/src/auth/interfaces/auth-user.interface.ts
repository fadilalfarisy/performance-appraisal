export interface AuthUser {
  id: string;
  username: string;
  role: string | null;
  employee?: { employeeNumber: string | null } | null;
}
