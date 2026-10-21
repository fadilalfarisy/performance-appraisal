import { describe, expect, it } from "vitest";
import { AppraisalStatus, UserRole } from "@appraisal/types";
import {
  APPRAISAL_STATUS_COLOR,
  APPRAISAL_STATUS_ORDER,
  resolveStatusTab,
} from "./appraisalStatus";

describe("APPRAISAL_STATUS_ORDER", () => {
  it("lists every status exactly once, in workflow order", () => {
    expect(APPRAISAL_STATUS_ORDER).toEqual([
      AppraisalStatus.DRAFT,
      AppraisalStatus.PENDING,
      AppraisalStatus.SUBMITTED,
      AppraisalStatus.APPROVED,
      AppraisalStatus.COMPLETE,
    ]);
    expect(new Set(APPRAISAL_STATUS_ORDER).size).toBe(
      Object.values(AppraisalStatus).length,
    );
  });
});

describe("APPRAISAL_STATUS_COLOR", () => {
  it("has a color for every status", () => {
    for (const status of Object.values(AppraisalStatus)) {
      expect(APPRAISAL_STATUS_COLOR[status]).toBeTruthy();
    }
  });
});

describe("resolveStatusTab", () => {
  it("keeps a valid status param", () => {
    expect(resolveStatusTab(AppraisalStatus.APPROVED, UserRole.HR)).toBe(
      AppraisalStatus.APPROVED,
    );
  });

  it("falls back to the role default for a missing or invalid param", () => {
    expect(resolveStatusTab(null, UserRole.HEAD_DEPARTMENT)).toBe(
      AppraisalStatus.PENDING,
    );
    expect(resolveStatusTab("NOPE", UserRole.MANAGER)).toBe(
      AppraisalStatus.SUBMITTED,
    );
  });

  it("falls back to DRAFT when the role is unknown", () => {
    expect(resolveStatusTab(undefined, "")).toBe(AppraisalStatus.DRAFT);
    expect(resolveStatusTab("NOPE", UserRole.SUPERVISOR)).toBe(
      AppraisalStatus.DRAFT,
    );
  });
});
