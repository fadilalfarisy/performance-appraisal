import { describe, expect, it } from "vitest";
import { formatDetail } from "./AuditLogDetails";

describe("formatDetail", () => {
  it("treats null and undefined as empty", () => {
    expect(formatDetail(null)).toBeUndefined();
    expect(formatDetail(undefined)).toBeUndefined();
  });

  it("treats empty objects and arrays as empty", () => {
    expect(formatDetail({})).toBeUndefined();
    expect(formatDetail([])).toBeUndefined();
  });

  it("pretty-prints objects and arrays", () => {
    expect(formatDetail({ score: 3 })).toBe('{\n  "score": 3\n}');
    expect(formatDetail([1, 2])).toBe("[\n  1,\n  2\n]");
  });

  it("keeps primitives, including masked values, as-is", () => {
    expect(formatDetail(42)).toBe("42");
    expect(formatDetail("***")).toBe("***");
  });
});
