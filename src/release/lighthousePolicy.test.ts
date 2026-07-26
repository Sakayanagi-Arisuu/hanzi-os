import { describe, expect, it } from "vitest";
import {
  formatLighthouseFailure,
  lighthouseThresholdFailures,
  median,
  summarizeLighthouseRuns,
  validateLighthouseRunCount,
} from "../../scripts/lighthouse-policy.mjs";

const result = (
  performance: number,
  lcp: number,
  cls: number,
  tbt: number,
) => ({
  categories: {
    performance: { score: performance },
    accessibility: { score: 1 },
    "best-practices": { score: 1 },
    seo: { score: 1 },
  },
  audits: {
    "largest-contentful-paint": { numericValue: lcp },
    "cumulative-layout-shift": { numericValue: cls },
    "total-blocking-time": { numericValue: tbt },
  },
});

describe("Lighthouse production policy", () => {
  it("requires an odd, positive, safe run count", () => {
    expect(validateLighthouseRunCount(3)).toBe(3);
    for (const invalid of [0, 2, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => validateLighthouseRunCount(invalid)).toThrow(
        /positive odd safe integer/u,
      );
    }
  });

  it("computes category and metric medians independently", () => {
    const summary = summarizeLighthouseRuns([
      result(0.96, 2_800, 0.01, 120),
      result(0.92, 2_100, 0.03, 300),
      result(0.98, 2_400, 0.02, 180),
    ]);
    expect(summary.scores.performance).toBe(0.96);
    expect(summary.metrics["largest-contentful-paint"]).toBe(2_400);
    expect(summary.metrics["cumulative-layout-shift"]).toBe(0.02);
    expect(summary.metrics["total-blocking-time"]).toBe(180);
  });

  it("fails closed for missing metrics and enforces WS8 budgets", () => {
    const failures = lighthouseThresholdFailures({
      scores: {
        performance: 0.94,
        accessibility: 1,
        "best-practices": 1,
        seo: 1,
      },
      metrics: {
        "largest-contentful-paint": 2_501,
        "cumulative-layout-shift": Number.NaN,
      },
    });
    expect(failures.map(formatLighthouseFailure)).toEqual([
      "performance 94 < 95",
      "LCP 2501ms > 2500ms",
      "CLS missing > 0.1",
    ]);
  });

  it("rejects even or non-finite median inputs", () => {
    expect(() => median([1, 2])).toThrow(/positive odd/u);
    expect(() => median([1, Number.NaN, 3])).toThrow(/finite number/u);
  });
});
