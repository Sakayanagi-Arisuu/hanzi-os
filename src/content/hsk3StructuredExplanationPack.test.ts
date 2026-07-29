import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3StructuredExplanationPack,
  serializeHsk3StructuredExplanationPack,
} from "../../scripts/content/build-hsk3-structured-explanation-pack.mjs";
import {
  assertValidHsk3StructuredExplanationPackBundle,
  HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH,
  loadHsk3StructuredExplanationPackBundle,
  validateHsk3StructuredExplanationPackBundle,
} from "./hsk3StructuredExplanationPack.mjs";

describe("HSK3 structured spoken-explanation pack", () => {
  it("authors the final 12 dual-source production prompts", () => {
    const result = assertValidHsk3StructuredExplanationPackBundle(
      loadHsk3StructuredExplanationPackBundle(),
    );

    expect(result.summary).toEqual({
      lessons: 3,
      completedGuidedProductionStages: 5,
      completedGuidedProductionLessons: 15,
      sourceTexts: 18,
      sourceTextLines: 144,
      sourceInputBindings: 24,
      sourceGuidedSummaries: 18,
      promptUnits: 12,
      choiceReasonPromptUnits: 4,
      criteriaComparisonPromptUnits: 4,
      boundedViewpointPromptUnits: 4,
      modelEvidenceSummaries: 24,
      minimumSpokenSentences: 64,
      requiredRecordingAttempts: 24,
      revisionChecklists: 12,
      audioDependentPromptUnits: 12,
      reviewedAudioPromptUnits: 0,
      learnerRecordingPromptUnits: 12,
      reviewedLearnerRecordingRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("requires evidence, a limit and two recordings on every prompt", () => {
    const { pack } = loadHsk3StructuredExplanationPackBundle();
    const items = pack.lessons.flatMap(
      (lesson: { promptUnits: unknown[] }) => lesson.promptUnits,
    );
    expect(items.every((item: {
      inputRefs: unknown[];
      evidenceLineIdsByText: Array<{ lineIds: string[] }>;
      limitOrCounterpointRequired: boolean;
      minimumRecordingAttempts: number;
    }) =>
      item.inputRefs.length === 2
      && item.evidenceLineIdsByText.every(
        (evidence) => evidence.lineIds.length === 8,
      )
      && item.limitOrCounterpointRequired
      && item.minimumRecordingAttempts === 2
    )).toBe(true);
  });

  it("rejects source drift, missing evidence and fake mastery", () => {
    const bundle = loadHsk3StructuredExplanationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePackSha256 = "sha256:stale";
    pack.sourceTexts[0].sourceSummary.modelHanzi = "漂移";
    pack.lessons[0].promptUnits[0].masteryEligible = true;

    const result = validateHsk3StructuredExplanationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 structured-explanation source binding is stale",
      expect.stringContaining("structured-explanation source is stale"),
      expect.stringContaining("structured-explanation item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK3_STRUCTURED_EXPLANATION_PACK_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3StructuredExplanationPack(
        buildHsk3StructuredExplanationPack(),
      ),
    );
  });
});
