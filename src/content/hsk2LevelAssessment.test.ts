import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2LevelAssessment,
  HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH,
  serializeHsk2LevelAssessment,
} from "../../scripts/content/build-hsk2-level-assessment.mjs";
import {
  assertValidHsk2LevelAssessmentBundle,
  loadHsk2LevelAssessmentBundle,
  validateHsk2LevelAssessmentBundle,
} from "./hsk2LevelAssessment.mjs";

describe("HSK2 skill-separated level assessment", () => {
  it("plans two balanced source-nonoverlapping forms", () => {
    const bundle = loadHsk2LevelAssessmentBundle();
    const result = assertValidHsk2LevelAssessmentBundle(bundle);

    expect(result.summary).toEqual({
      forms: 2,
      itemsPerForm: 86,
      totalItems: 172,
      objectiveItems: 120,
      constructedResponseItems: 52,
      listeningItems: 30,
      readingItems: 30,
      vocabularyItems: 30,
      grammarItems: 30,
      speakingItems: 20,
      writingItems: 32,
      audioDependentItems: 30,
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

  it("keeps every item bound to exactly one evidence skill", () => {
    const { bank } = loadHsk2LevelAssessmentBundle();
    const sectionSkills = new Map(bank.forms[0].sections.map(
      (section: { sectionId: string; skill: string }) => [
        section.sectionId,
        section.skill,
      ],
    ));

    expect(bank.items.every(
      (item: { sectionId: string; skill: string }) =>
        item.skill === sectionSkills.get(item.sectionId),
    )).toBe(true);
    expect(new Set(bank.items.map(
      (item: { skill: string }) => item.skill,
    ))).toEqual(new Set([
      "listening",
      "reading",
      "vocabulary",
      "grammar",
      "speaking",
      "writing",
    ]));
  });

  it("fails closed on fake audio, calibration or mastery eligibility", () => {
    const bundle = loadHsk2LevelAssessmentBundle();
    const bank = structuredClone(bundle.bank);
    bank.calibration.cutScore = 70;
    bank.items[0].stimulus.audio = { assetId: "invented-audio" };
    bank.items[0].masteryEligible = true;

    const result = validateHsk2LevelAssessmentBundle({
      ...bundle,
      bank,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK2 level assessment calibration must remain empty",
      "hsk2-level-check:form-a:listening:01 eligibility state is invalid",
      "hsk2-level-check:form-a:listening:01 listening stimulus is invalid",
      "HSK2 level assessment counts are stale or invalid",
    ]));
  });

  it("rejects source overlap between the planned forms", () => {
    const bundle = loadHsk2LevelAssessmentBundle();
    const bank = structuredClone(bundle.bank);
    const formA = bank.items.find(
      (item: { formId: string }) => item.formId === "hsk2-level-form-a",
    );
    const formB = bank.items.find(
      (item: { formId: string }) => item.formId === "hsk2-level-form-b",
    );
    formB.sourceEntityKey = formA.sourceEntityKey;

    const result = validateHsk2LevelAssessmentBundle({
      ...bundle,
      bank,
    });

    expect(result.errors).toContain(
      "HSK2 planned forms must not share source entities",
    );
  });

  it("keeps the generated assessment artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_LEVEL_ASSESSMENT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2LevelAssessment(buildHsk2LevelAssessment()),
    );
  });
});
