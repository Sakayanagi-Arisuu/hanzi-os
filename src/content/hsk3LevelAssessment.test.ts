import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3LevelAssessment,
  serializeHsk3LevelAssessment,
} from "../../scripts/content/build-hsk3-level-assessment.mjs";
import {
  assertValidHsk3LevelAssessmentBundle,
  HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH,
  loadHsk3LevelAssessmentBundle,
  validateHsk3LevelAssessmentBundle,
} from "./hsk3LevelAssessment.mjs";

describe("HSK3 skill-separated level assessment", () => {
  it("plans two 86-item source-disjoint forms", () => {
    const result = assertValidHsk3LevelAssessmentBundle(
      loadHsk3LevelAssessmentBundle(),
    );
    expect(result.summary).toEqual({
      forms: 2,
      itemsPerForm: 86,
      totalItems: 172,
      objectiveItems: 108,
      constructedResponseItems: 64,
      listeningItems: 24,
      readingItems: 24,
      vocabularyItems: 30,
      grammarItems: 30,
      speakingItems: 32,
      writingItems: 32,
      audioDependentItems: 56,
      reviewedAudioItems: 0,
      sourceEntityOverlapBetweenForms: 0,
      reviewBatches: 12,
      reviewedItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      prerequisiteWaiverEligibleItems: 0,
      releaseEligibleItems: 0,
    });
  });

  it("keeps every item isolated to one skill and every form unissuable", () => {
    const { bank } = loadHsk3LevelAssessmentBundle();
    expect(bank.forms.every((form: {
      itemCount: number;
      eligibleForIssuance: boolean;
    }) =>
      form.itemCount === 86 && form.eligibleForIssuance === false
    )).toBe(true);
    expect(bank.items.every((item: {
      skill: string;
      measurementEligible: boolean;
      masteryEligible: boolean;
      prerequisiteWaiverEligible: boolean;
    }) =>
      typeof item.skill === "string"
      && item.measurementEligible === false
      && item.masteryEligible === false
      && item.prerequisiteWaiverEligible === false
    )).toBe(true);
  });

  it("rejects source drift, option corruption and fake authority", () => {
    const bundle = loadHsk3LevelAssessmentBundle();
    const bank = structuredClone(bundle.bank);
    bank.source.sourceTipPackSha256 = "sha256:stale";
    bank.items[0].options = [];
    bank.items[0].masteryEligible = true;

    const result = validateHsk3LevelAssessmentBundle({
      ...bundle,
      bank,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 assessment source binding is stale",
      expect.stringContaining("objective options are invalid"),
      expect.stringContaining("eligibility state is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_LEVEL_ASSESSMENT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3LevelAssessment(buildHsk3LevelAssessment()),
    );
  });
});
