import { describe, expect, it } from "vitest";
import { coveredQuestionCount, formatPracticePercent, practicePercent } from "./practicePercent";
describe("released question coverage", () => {
  it("uses the actual denominator, including catalog growth", () => {
    expect(practicePercent(25, 50)).toBe(50);
    expect(practicePercent(25, 200)).toBe(12.5);
    expect(practicePercent(200, 200)).toBe(100);
  });
  it("deduplicates repeats and revisions, and excludes unknown questions", () => {
    expect(coveredQuestionCount(["lesson:q1", "lesson:q2"], ["lesson:q1", "lesson:q1", "lesson:q1~lexical-2026.10.5", "deleted:q3"])).toBe(1);
  });
  it.each([[null, 20], [1, null], [0, 0], [10, 5], [-1, 5], [NaN, 5]])("fails closed for %s / %s", (count, total) => {
    expect(practicePercent(count, total)).toBeNull();
  });
  it("distinguishes tiny progress, missing data and incomplete coverage", () => {
    expect(formatPracticePercent(practicePercent(1, 20000))).toBe("<0,1%");
    expect(formatPracticePercent(practicePercent(19999, 20000))).toBe("99,9%");
    expect(formatPracticePercent(null)).toBe("—");
    expect(formatPracticePercent(0)).toBe("0%");
  });
});
