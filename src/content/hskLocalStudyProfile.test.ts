import { describe, expect, it } from "vitest";
import {
  evaluateHskLocalStudyReview,
  HSK_LOCAL_STUDY_REVIEW_PASSES,
  loadHskLocalStudyProfile,
  validateHskLocalStudyProfile,
} from "./hskLocalStudyProfile.mjs";

const passedReview = () => ({
  mode: "ai-assisted-self-review",
  schemaValid: true,
  sourceBound: true,
  aiAssistedDisclosed: true,
  humanReviewed: false,
  unresolvedIssueCount: 0,
  passResults: Object.fromEntries(
    HSK_LOCAL_STUDY_REVIEW_PASSES.map((pass) => [pass, "passed"]),
  ),
});

describe("HSK local-study acceptance profile", () => {
  it("keeps the checked profile local, synthetic and non-production", () => {
    const profile = loadHskLocalStudyProfile();
    const result = validateHskLocalStudyProfile(profile);

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        profileId: "hsk0-4-personal-study-2026.07.1",
        reviewPasses: 5,
        syntheticPracticeAudio: true,
        productionEligible: false,
      },
    });
    expect(profile.audio.listeningMasteryEligible).toBe(false);
    expect(profile.audio.pronunciationMasteryEligible).toBe(false);
    expect(profile.productionBoundary.productionReadinessGatesUnchanged)
      .toBe(true);
  });

  it("accepts a disclosed, source-bound AI linguistic review for local study", () => {
    expect(evaluateHskLocalStudyReview(passedReview())).toEqual({
      profileId: "hsk0-4-personal-study-2026.07.1",
      audience: "personal-local-study",
      readyForLocalStudyVisibility: true,
      blockers: [],
      claims: {
        aiAssistedReview: true,
        humanReview: false,
        nativeAudio: false,
        calibratedAssessment: false,
        listeningMastery: false,
        pronunciationMastery: false,
        officialHskCertification: false,
        productionEligible: false,
      },
    });
  });

  it("blocks incomplete review passes and a false human-review claim", () => {
    const review = passedReview();
    review.humanReviewed = true;
    review.passResults["vietnamese-meaning-and-usage"] = "changes-requested";
    review.unresolvedIssueCount = 2;

    const result = evaluateHskLocalStudyReview(review);

    expect(result.readyForLocalStudyVisibility).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "FALSE_HUMAN_REVIEW_CLAIM",
      "UNRESOLVED_REVIEW_ISSUES",
      "REVIEW_PASS_NOT_PASSED:vietnamese-meaning-and-usage",
    ]));
    expect(result.claims.aiAssistedReview).toBe(false);
    expect(result.claims.productionEligible).toBe(false);
  });
});
