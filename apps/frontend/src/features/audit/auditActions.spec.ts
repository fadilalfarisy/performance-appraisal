import { describe, expect, it } from "vitest";
import { AUDIT_ACTIONS, actionLabel } from "./auditActions";

describe("actionLabel", () => {
  it("returns the human label for a known action", () => {
    expect(actionLabel("USER_CREATED")).toBe("User created");
    expect(actionLabel("APPRAISAL_STATUS_CHANGED")).toBe(
      "Appraisal status changed",
    );
  });

  it("falls back to the raw code for an unknown action", () => {
    expect(actionLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  it("labels every action in the filter list", () => {
    for (const action of AUDIT_ACTIONS) {
      expect(actionLabel(action)).not.toBe(action);
    }
  });
});
