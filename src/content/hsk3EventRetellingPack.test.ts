import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3EventRetellingPack,
  serializeHsk3EventRetellingPack,
} from "../../scripts/content/build-hsk3-event-retelling-pack.mjs";
import {
  assertValidHsk3EventRetellingPackBundle,
  HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH,
  loadHsk3EventRetellingPackBundle,
  validateHsk3EventRetellingPackBundle,
} from "./hsk3EventRetellingPack.mjs";

describe("HSK3 event-retelling guided-production pack", () => {
  it("authors 20 listening-to-speaking units for the third stage", () => {
    const result = assertValidHsk3EventRetellingPackBundle(
      loadHsk3EventRetellingPackBundle(),
    );

    expect(result.summary).toEqual({
      lessons: 3,
      completedGuidedProductionStages: 3,
      completedGuidedProductionLessons: 9,
      sourceTexts: 20,
      sourceTextLines: 160,
      sourceGuidedSummaries: 20,
      promptUnits: 20,
      noteCardRetellingPromptUnits: 7,
      changeCauseRetellingPromptUnits: 7,
      structuredRetellingPromptUnits: 6,
      modelRetellings: 20,
      revisionChecklists: 20,
      audioDependentPromptUnits: 20,
      reviewedAudioPromptUnits: 0,
      learnerRecordingPromptUnits: 20,
      reviewedLearnerRecordingRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses all 20 listening texts once with exact source models", () => {
    const { pack } = loadHsk3EventRetellingPackBundle();
    const items = pack.lessons.flatMap(
      (lesson: { promptUnits: unknown[] }) => lesson.promptUnits,
    );
    expect(new Set(items.map(
      (item: { sourceTextId: string }) => item.sourceTextId,
    )).size).toBe(20);
    expect(items.every((item: {
      inputSkill: string;
      responseSkill: string;
      noteCardElementsVi: string[];
      evidenceLineIds: string[];
      recordingAttemptRequired: boolean;
    }) =>
      item.inputSkill === "listening"
      && item.responseSkill === "speaking"
      && item.noteCardElementsVi.length === 4
      && item.evidenceLineIds.length === 8
      && item.recordingAttemptRequired
    )).toBe(true);
  });

  it("rejects source drift, model drift and fake speaking mastery", () => {
    const bundle = loadHsk3EventRetellingPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePackSha256 = "sha256:stale";
    pack.sourceTexts[0].sourceSummary.modelHanzi = "漂移";
    pack.lessons[0].promptUnits[0].masteryEligible = true;

    const result = validateHsk3EventRetellingPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 event-retelling source binding is stale",
      expect.stringContaining("event-retelling source is stale"),
      expect.stringContaining("event-retelling item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK3_EVENT_RETELLING_PACK_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3EventRetellingPack(buildHsk3EventRetellingPack()),
    );
  });
});
