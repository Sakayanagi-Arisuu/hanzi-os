import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4LevelAssessment,
  serializeHsk4LevelAssessment,
} from "../../scripts/content/build-hsk4-level-assessment.mjs";
import {
  assertValidHsk4LevelAssessmentBundle,
  HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH,
  loadHsk4LevelAssessmentBundle,
  validateHsk4LevelAssessmentBundle,
} from "./hsk4LevelAssessment.mjs";

describe("HSK4 source-disjoint level assessment bank", () => {
  it("plans two 96-item pools and bounded 54-item timed mocks", () => {
    const result = assertValidHsk4LevelAssessmentBundle(
      loadHsk4LevelAssessmentBundle(),
    );

    expect(result.summary).toEqual({
      forms: 2,
      itemsPerForm: 96,
      totalItems: 192,
      objectiveItems: 144,
      constructedResponseItems: 48,
      listeningItems: 36,
      readingItems: 36,
      vocabularyItems: 36,
      grammarItems: 36,
      officialVocabularyBindings: 36,
      officialGrammarBindings: 36,
      speakingItems: 24,
      writingItems: 24,
      audioDependentItems: 60,
      sourceFamilies: 12,
      sourceFamiliesPerForm: 6,
      equivalentGroups: 96,
      sourceIdOverlapBetweenForms: 0,
      sourceExposureOverlapBetweenForms: 0,
      sourceTextHashOverlapBetweenForms: 0,
      sourceContentOverlapBetweenForms: 0,
      learningSourceIdOverlap: 0,
      learningSourceTextHashOverlap: 0,
      learningSourceContentOverlap: 0,
      mockItemsPerForm: 54,
      mockAlternateItemsPerForm: 42,
      mockPlannedDurationSeconds: 6000,
      reviewBatches: 12,
      reviewedItems: 0,
      reviewedAudioItems: 0,
      calibratedItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      prerequisiteWaiverEligibleItems: 0,
      releaseEligibleItems: 0,
    });
  });

  it("keeps every item skill-separated and every form fail-closed", () => {
    const { bank } = loadHsk4LevelAssessmentBundle();

    expect(bank.forms.every((form: {
      itemCount: number;
      eligibleForIssuance: boolean;
    }) =>
      form.itemCount === 96 && form.eligibleForIssuance === false
    )).toBe(true);
    expect(bank.items.every((item: {
      skill: string;
      measurementEligible: boolean;
      masteryEligible: boolean;
      prerequisiteWaiverEligible: boolean;
      releaseEligible: boolean;
    }) =>
      typeof item.skill === "string"
      && item.measurementEligible === false
      && item.masteryEligible === false
      && item.prerequisiteWaiverEligible === false
      && item.releaseEligible === false
    )).toBe(true);
    expect(bank.mockBlueprint).toMatchObject({
      plannedDurationSeconds: 6000,
      eligibleForIssuance: false,
    });
    expect(bank.mockBlueprint.forms.every((form: {
      learnerVisible: boolean;
      eligibleForScoring: boolean;
      passingStandard: null;
    }) =>
      form.learnerVisible === false
      && form.eligibleForScoring === false
      && form.passingStandard === null
    )).toBe(true);
  });

  it("rejects source-chain drift, learning reuse and cross-form text overlap", () => {
    const bundle = loadHsk4LevelAssessmentBundle();
    const bank = structuredClone(bundle.bank);

    bank.source.sourceChain[0].sha256 = "sha256:stale";
    bank.sources[0].learningReuse = true;
    bank.sources[7].readingSource = structuredClone(
      bank.sources[1].readingSource,
    );

    const result = validateHsk4LevelAssessmentBundle({
      ...bundle,
      bank,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 assessment source chain binding is stale",
      expect.stringContaining(bank.sources[0].sourceFamilyId),
      "HSK4 assessment forms must not share source, exposure or text content",
    ]));
  });

  it("rejects objective corruption, fake mastery and invalid mock selection", () => {
    const bundle = loadHsk4LevelAssessmentBundle();
    const bank = structuredClone(bundle.bank);
    const objective = bank.items.find((item: {
      sectionId: string;
    }) => item.sectionId.endsWith("-objective"));

    objective.options = [];
    objective.masteryEligible = true;
    bank.mockBlueprint.forms[0].selectedItemIds[0] =
      bank.mockBlueprint.forms[0].selectedItemIds[1];

    const result = validateHsk4LevelAssessmentBundle({
      ...bundle,
      bank,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("objective evidence is invalid"),
      expect.stringContaining("eligibility state is invalid"),
      expect.stringContaining("mock selection is invalid"),
    ]));
  });

  it("rejects official inventory drift and detached evidence aliases", () => {
    const bundle = loadHsk4LevelAssessmentBundle();
    const bank = structuredClone(bundle.bank);
    const vocabulary = bank.items.find((item: {
      sectionId: string;
    }) => item.sectionId === "vocabulary-objective");
    const grammar = bank.items.find((item: {
      sectionId: string;
    }) => item.sectionId === "grammar-objective");
    const reading = bank.items.find((item: {
      sectionId: string;
    }) => item.sectionId === "reading-objective");

    vocabulary.officialVocabularyId = "hsk-vocab-00001";
    vocabulary.evidenceBindings = [];
    grammar.grammarRowId = "hsk1-grammar-row-001";
    reading.domainId = "hsk4-wrong-domain";

    const result = validateHsk4LevelAssessmentBundle({
      ...bundle,
      bank,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("official vocabulary binding is invalid"),
      expect.stringContaining("source evidence binding is invalid"),
      expect.stringContaining("binding is invalid"),
      expect.stringContaining("official grammar binding is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_LEVEL_ASSESSMENT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4LevelAssessment(buildHsk4LevelAssessment()),
    );
  });
});
