import { describe, expect, it } from "vitest";
import { AppraisalStatus, UserRole } from "@appraisal/types";
import { canWriteMaster, getAvailableActions } from "./appraisalPermissions";

describe("getAvailableActions", () => {
  it("HR on DRAFT can edit employees, cancel, and move to PENDING", () => {
    const names = getAvailableActions(UserRole.HR, AppraisalStatus.DRAFT).map(
      (a) => a.action,
    );
    expect(names).toEqual(
      expect.arrayContaining(["editEmployeeList", "softDelete", "moveToPending"]),
    );
  });

  it("Head Department on PENDING can rate, submit, and send back to DRAFT", () => {
    const actions = getAvailableActions(
      UserRole.HEAD_DEPARTMENT,
      AppraisalStatus.PENDING,
    );
    expect(actions.map((a) => a.action)).toEqual(
      expect.arrayContaining(["editRatings", "submit", "sendBack"]),
    );
    const sendBack = actions.find((a) => a.action === "sendBack");
    expect(sendBack?.targets).toEqual([AppraisalStatus.DRAFT]);
    expect(sendBack?.commentRequired).toBe(true);
  });

  it("HR cannot send back from PENDING (PRD v0.4)", () => {
    expect(
      getAvailableActions(UserRole.HR, AppraisalStatus.PENDING),
    ).toHaveLength(0);
  });

  it("only Admin can reopen COMPLETE", () => {
    expect(
      getAvailableActions(UserRole.ADMIN, AppraisalStatus.COMPLETE).map(
        (a) => a.action,
      ),
    ).toContain("reopen");
    expect(
      getAvailableActions(UserRole.GENERAL_MANAGER, AppraisalStatus.COMPLETE),
    ).toHaveLength(0);
  });
});

describe("canWriteMaster", () => {
  it("Admin writes everything", () => {
    expect(canWriteMaster(UserRole.ADMIN, "department")).toBe(true);
  });
  it("HR writes employees/contracts/criteria but not departments", () => {
    expect(canWriteMaster(UserRole.HR, "employee")).toBe(true);
    expect(canWriteMaster(UserRole.HR, "department")).toBe(false);
  });
});
