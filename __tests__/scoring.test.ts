import { describe, it, expect } from "vitest";
import { computeScore } from "@/lib/scoring";

describe("computeScore — log-curve formula from PROJECT.md §4", () => {
  it("returns 100 when there are no issues", () => {
    expect(computeScore(0, 0, 0)).toBe(100);
  });

  it("returns 88 for a single P1", () => {
    expect(computeScore(1, 0, 0)).toBe(88);
  });

  it("returns 66 for 6 P1 alone (SoloDesk P1-only level)", () => {
    expect(computeScore(6, 0, 0)).toBe(66);
  });

  it("returns 51 for the full SoloDesk sample (6 P1, 4 P2, 3 P3)", () => {
    expect(computeScore(6, 4, 3)).toBe(51);
  });

  it("preserves discrimination at the bad end — 40 P1 is not zero", () => {
    const score = computeScore(40, 0, 0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(50);
  });

  it("still non-zero at 100 P1", () => {
    expect(computeScore(100, 0, 0)).toBeGreaterThan(0);
  });

  it("floors at 0 for extreme P2 counts", () => {
    expect(computeScore(0, 100, 0)).toBe(0);
  });

  it("P2 and P3 accumulate linearly", () => {
    // (0, 4, 3) → 100 - 0 - 12 - 3 = 85
    expect(computeScore(0, 4, 3)).toBe(85);
  });

  it("throws on negative counts", () => {
    expect(() => computeScore(-1, 0, 0)).toThrow(/non-negative/);
    expect(() => computeScore(0, -1, 0)).toThrow(/non-negative/);
    expect(() => computeScore(0, 0, -1)).toThrow(/non-negative/);
  });

  it("throws on non-integer counts", () => {
    expect(() => computeScore(1.5, 0, 0)).toThrow(/integers/);
  });

  it("is monotonically non-increasing in P1", () => {
    // Adding more P1s should never raise the score.
    let previous = 101;
    for (let n = 0; n <= 50; n++) {
      const current = computeScore(n, 0, 0);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });
});
