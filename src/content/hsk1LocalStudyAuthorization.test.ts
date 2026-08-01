import { describe, expect, it } from "vitest";
import {
  loadHsk1LocalStudyAuthorizationBundle,
  validateHsk1LocalStudyAuthorizationBundle,
} from "./hsk1LocalStudyAuthorization.mjs";

describe("HSK1 local-study authorization", () => {
  it("authorizes the complete HSK1/2/3/4 local-study runtime", async () => {
    const result = await validateHsk1LocalStudyAuthorizationBundle(
      loadHsk1LocalStudyAuthorizationBundle(),
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        units: 15,
        lessons: 213,
        hsk1Lessons: 40,
        hsk2Lessons: 40,
        hsk3Lessons: 55,
        hsk4Lessons: 78,
        runtimeContentVersion: "foundation-2026.08.4",
        humanReviewed: false,
        productionEligible: false,
        sitesAuthorized: false,
      },
    });
  });

  it("fails closed when production eligibility is claimed", async () => {
    const bundle = loadHsk1LocalStudyAuthorizationBundle();
    bundle.authorization.policy.grantsProductionEligibility = true;

    const result = await validateHsk1LocalStudyAuthorizationBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK1 local-study authorization shape is invalid",
      "HSK1 local-study authorization does not match exact sources",
    ]));
  });
});
