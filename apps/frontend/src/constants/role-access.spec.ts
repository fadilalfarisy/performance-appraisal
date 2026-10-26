import { describe, expect, it } from "vitest";
import { UserRole } from "@appraisal/types";
import { ALL_ROLES, hasAccess, isUserRole, roles } from "./role-access";
import { filteredMenuByRole } from "./dashboard-link";

const sorted = (values: readonly UserRole[]) => [...values].sort();

const EXPECTED_GROUPS: Record<keyof typeof roles, UserRole[]> = {
  administrator: [UserRole.ADMIN],
  generalManager: [UserRole.ADMIN, UserRole.GENERAL_MANAGER],
  manager: [UserRole.ADMIN, UserRole.MANAGER],
  humanResource: [UserRole.ADMIN, UserRole.HR],
  headDepartment: [UserRole.ADMIN, UserRole.HEAD_DEPARTMENT],
  supervisor: [UserRole.ADMIN, UserRole.SUPERVISOR],
  noteManagers: [UserRole.HEAD_DEPARTMENT, UserRole.SUPERVISOR],
};

const menuKeys = (userRole: UserRole | "") => {
  const items: { key: string }[] = filteredMenuByRole(userRole);
  return items.map((item) => item.key);
};

describe("role groups", () => {
  for (const group of Object.keys(EXPECTED_GROUPS) as Array<
    keyof typeof roles
  >) {
    it(`${group} holds exactly the expected roles`, () => {
      expect(sorted(roles[group])).toEqual(sorted(EXPECTED_GROUPS[group]));
    });
  }

  it("gives ADMIN access to every group", () => {
    for (const group of Object.values(EXPECTED_GROUPS)) {
      expect(hasAccess(group, UserRole.ADMIN)).toBe(true);
    }
  });
});

describe("ALL_ROLES", () => {
  it("covers every UserRole", () => {
    expect(sorted(ALL_ROLES)).toEqual(sorted(Object.values(UserRole)));
  });
});

describe("hasAccess", () => {
  it("denies before a role is known", () => {
    expect(hasAccess(roles.humanResource, "")).toBe(false);
  });

  it("allows a member and denies a non-member", () => {
    expect(hasAccess(roles.humanResource, UserRole.HR)).toBe(true);
    expect(hasAccess(roles.humanResource, UserRole.MANAGER)).toBe(false);
  });

  it("always allows ADMIN", () => {
    expect(hasAccess(roles.noteManagers, UserRole.ADMIN)).toBe(true);
    expect(hasAccess([], UserRole.ADMIN)).toBe(true);
  });
});

describe("isUserRole", () => {
  it("accepts every enum value", () => {
    for (const role of Object.values(UserRole)) {
      expect(isUserRole(role)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const value of ["admin", "ADMIN ", "", null, undefined, 123, {}]) {
      expect(isUserRole(value)).toBe(false);
    }
  });
});

describe("filteredMenuByRole", () => {
  const EVERYONE = 5;
  const NOTE_MANAGERS = [UserRole.HEAD_DEPARTMENT, UserRole.SUPERVISOR];

  it("shows ADMIN every section", () => {
    const keys = menuKeys(UserRole.ADMIN);
    expect(keys).toHaveLength(EVERYONE + 3);
    expect(keys).toEqual(
      expect.arrayContaining(["/dashboard/master-data", "/dashboard/user"]),
    );
    expect(keys).toContain("/dashboard/daily-notes");
  });

  it("shows Daily Notes only to note managers", () => {
    for (const userRole of Object.values(UserRole)) {
      if (userRole === UserRole.ADMIN) continue;
      const keys = menuKeys(userRole);
      const expected = NOTE_MANAGERS.includes(userRole)
        ? EVERYONE + 1
        : EVERYONE;
      expect(keys).toHaveLength(expected);
      expect(keys.includes("/dashboard/daily-notes")).toBe(
        NOTE_MANAGERS.includes(userRole),
      );
    }
  });

  it("hides Master Data and Manage User from the other roles", () => {
    const others = Object.values(UserRole).filter((r) => r !== UserRole.ADMIN);
    for (const userRole of others) {
      const keys = menuKeys(userRole);
      expect(keys).not.toContain("/dashboard/master-data");
      expect(keys).not.toContain("/dashboard/user");
    }
  });

  it("shows nothing before a role is known", () => {
    expect(menuKeys("")).toHaveLength(0);
  });
});
