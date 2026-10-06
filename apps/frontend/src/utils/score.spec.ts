import { describe, expect, it } from "vitest";
import { calculateScore } from "./score";

// Same cases as the backend `appraisal-score.spec.ts` — keep them in sync.
describe("calculateScore (parity with backend)", () => {
  const criteria = [
    { id: "a", scaleMax: 5, weight: 50 },
    { id: "b", scaleMax: 10, weight: 50 },
  ];

  it("normalizes mixed scales", () => {
    expect(
      calculateScore(
        [
          { criterionId: "a", rating: 4 },
          { criterionId: "b", rating: 8 },
        ],
        criteria,
      ),
    ).toBe(80);
  });

  it("returns null when a rating is missing", () => {
    expect(calculateScore([{ criterionId: "a", rating: 4 }], criteria)).toBeNull();
  });

  it("rounds to 2 decimals", () => {
    expect(
      calculateScore(
        [
          { criterionId: "a", rating: 3 },
          { criterionId: "b", rating: 7 },
        ],
        [
          { id: "a", scaleMax: 5, weight: 33.33 },
          { id: "b", scaleMax: 10, weight: 66.67 },
        ],
      ),
    ).toBe(66.67);
  });

  it("returns null with no criteria", () => {
    expect(calculateScore([], [])).toBeNull();
  });
});
