/**
 * Compute the MX score from annotation counts.
 *
 * Formula (per PROJECT.md §4):
 *   score = max(0, 100 - ceil(log2(p1 + 1) * 12) - (p2 * 3) - (p3 * 1))
 *
 * The log curve on P1 preserves discrimination across the full range —
 * a severely broken file doesn't flatten to 0 the way a linear penalty would.
 *
 * Sanity checks (used as tests):
 *   (0, 0, 0)   → 100   clean
 *   (1, 0, 0)   →  88   one critical issue
 *   (6, 0, 0)   →  66   SoloDesk P1-only level
 *   (6, 4, 3)   →  51   full SoloDesk validation run
 *   (10, 0, 0)  →  58
 *   (20, 0, 0)  →  47
 *   (40, 0, 0)  →  35
 *   (100, 0, 0) →  20   still differentiated from catastrophic
 *
 * Server re-runs this against the counts returned by the LLM. If the LLM's
 * reported overall_score diverges by more than 2 points, log a warning and
 * trust the server computation (see §4 of PROJECT.md).
 */
export function computeScore(p1: number, p2: number, p3: number): number {
  if (p1 < 0 || p2 < 0 || p3 < 0) {
    throw new Error("Counts must be non-negative");
  }
  if (!Number.isInteger(p1) || !Number.isInteger(p2) || !Number.isInteger(p3)) {
    throw new Error("Counts must be integers");
  }

  const p1Penalty = p1 === 0 ? 0 : Math.ceil(Math.log2(p1 + 1) * 12);
  const p2Penalty = p2 * 3;
  const p3Penalty = p3 * 1;

  return Math.max(0, 100 - p1Penalty - p2Penalty - p3Penalty);
}
