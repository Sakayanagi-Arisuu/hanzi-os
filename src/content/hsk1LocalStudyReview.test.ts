import { describe, expect, it } from "vitest";
import {
  loadHsk1LocalStudyReviewBundle,
  validateHsk1LocalStudyReviewBundle,
} from "./hsk1LocalStudyReview.mjs";

describe("HSK1 local-study AI-assisted review", () => {
  it("binds all six lessons and 425 targets without human or production claims", async () => {
    const result = await validateHsk1LocalStudyReviewBundle(
      loadHsk1LocalStudyReviewBundle(),
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        unitId: "hsk1-time-place-events",
        lessons: 6,
        contentTargets: 425,
        runtimeTargets: 425,
        reviewBatches: 27,
        resolvedFindings: 6,
        readyForLocalStudyVisibility: true,
        humanReviewed: false,
        productionEligible: false,
      },
    });
  });

  it("fails closed when the checked review claims human review", async () => {
    const bundle = loadHsk1LocalStudyReviewBundle();
    bundle.review.reviewer.humanReviewed = true;

    const result = await validateHsk1LocalStudyReviewBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK1 local-study review shape or safety boundary is invalid",
      "HSK1 local-study review does not match exact reviewed sources",
    ]));
  });

  it("fails closed when a source-bound target is removed", async () => {
    const bundle = loadHsk1LocalStudyReviewBundle();
    bundle.source.reviewerPacketBundle.packet.contentTargets.pop();

    const result = await validateHsk1LocalStudyReviewBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("does not match exact sources");
  });
});
