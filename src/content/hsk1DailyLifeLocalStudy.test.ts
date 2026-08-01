import { describe, expect, it } from "vitest";
import {
  loadHsk1DailyLifeLocalStudyBundle,
  validateHsk1DailyLifeLocalStudyBundle,
} from "./hsk1DailyLifeLocalStudy.mjs";

describe("HSK1 daily-life AI-assisted local-study review", () => {
  it("binds the complete unit without human or mastery claims", async () => {
    const result = await validateHsk1DailyLifeLocalStudyBundle(
      loadHsk1DailyLifeLocalStudyBundle(),
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        lessons: 4,
        lexemes: 54,
        sourceTargets: 286,
        resolvedFindings: 4,
        humanReviewed: false,
        productionEligible: false,
      },
    });
  });

  it("fails closed when a reviewed dialogue correction drifts", async () => {
    const bundle = loadHsk1DailyLifeLocalStudyBundle();
    bundle.core.lessons[0].payload.title = "tampered";

    const result = await validateHsk1DailyLifeLocalStudyBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "HSK1 daily-life core projection does not match reviewed payloads",
    );
  });
});
