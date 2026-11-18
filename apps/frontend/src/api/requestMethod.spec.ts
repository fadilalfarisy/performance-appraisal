import { describe, expect, it } from "vitest";
import {
  isWriteRequest,
  shouldInvalidateAuditLogs,
} from "./requestMethod";

describe("isWriteRequest", () => {
  it("treats a bare URL as a read", () => {
    expect(isWriteRequest("/audit-logs")).toBe(false);
  });

  it("treats a missing method as GET", () => {
    expect(isWriteRequest({ url: "/audit-logs" })).toBe(false);
  });

  it("treats HEAD as a read", () => {
    expect(isWriteRequest({ url: "/audit-logs", method: "HEAD" })).toBe(false);
  });

  it("recognises writes regardless of case", () => {
    for (const method of ["POST", "put", "PATCH", "delete"]) {
      expect(isWriteRequest({ url: "/users", method })).toBe(true);
    }
  });
});

describe("shouldInvalidateAuditLogs", () => {
  it("never invalidates for reads", () => {
    expect(shouldInvalidateAuditLogs({ url: "/audit-logs" }, undefined)).toBe(
      false,
    );
  });

  it("invalidates a successful write", () => {
    expect(
      shouldInvalidateAuditLogs({ url: "/users", method: "POST" }, undefined),
    ).toBe(true);
  });

  it("invalidates a write the server rejected", () => {
    expect(
      shouldInvalidateAuditLogs({ url: "/auth/signin", method: "POST" }, 401),
    ).toBe(true);
  });

  it("ignores network errors that cannot have produced a row", () => {
    expect(
      shouldInvalidateAuditLogs(
        { url: "/users", method: "POST" },
        "FETCH_ERROR",
      ),
    ).toBe(false);
  });

  it("never invalidates for the refresh call", () => {
    expect(
      shouldInvalidateAuditLogs(
        { url: "/auth/refresh", method: "POST" },
        undefined,
      ),
    ).toBe(false);
  });
});
