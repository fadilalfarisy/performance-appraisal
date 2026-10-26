import { UserRole } from "@appraisal/types";

/** Grup akses tingkat halaman. ADMIN selalu ikut, sesuai PRD 5.8. */
export const roles = {
  administrator: [UserRole.ADMIN],
  generalManager: [UserRole.ADMIN, UserRole.GENERAL_MANAGER],
  manager: [UserRole.ADMIN, UserRole.MANAGER],
  humanResource: [UserRole.ADMIN, UserRole.HR],
  headDepartment: [UserRole.ADMIN, UserRole.HEAD_DEPARTMENT],
  supervisor: [UserRole.ADMIN, UserRole.SUPERVISOR],
  noteManagers: [UserRole.HEAD_DEPARTMENT, UserRole.SUPERVISOR],
} as const satisfies Record<string, readonly UserRole[]>;

export type RoleGroup = keyof typeof roles;

export const ALL_ROLES: readonly UserRole[] = Object.values(UserRole);

/** Satu-satunya cara memeriksa grup akses. `""` berarti belum login. */
export const hasAccess = (
  group: readonly UserRole[],
  userRole: UserRole | "",
): boolean =>
  userRole === UserRole.ADMIN ||
  (userRole !== "" && group.includes(userRole));

/** Memvalidasi role yang datang dari API (data tidak tepercaya). */
export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" && Object.values(UserRole).some((r) => r === value);
