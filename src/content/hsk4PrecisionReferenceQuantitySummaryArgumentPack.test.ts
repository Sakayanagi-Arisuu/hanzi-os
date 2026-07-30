import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4PrecisionReferenceQuantitySummaryArgumentPack,
} from "../../scripts/content/build-hsk4-precision-reference-quantity-summary-argument-pack.mjs";
import {
  serializeHsk4SummaryArgumentModulePack,
} from "../../scripts/content/hsk4-summary-argument-module-builder.mjs";
import {
  assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
  HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH,
  loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
  validateHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle,
} from "./hsk4PrecisionReferenceQuantitySummaryArgumentPack.mjs";

describe("HSK4 precision/reference/quantity summary-argument pack", () => {
  it("authors six source-bound lessons without granting mastery", () => {
    const bundle =
      loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle();
    const result =
      assertValidHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle(
        bundle,
      );
    expect(result.summary).toEqual({
      lessons: 6,
      completedSummaryArgumentModules: 1,
      completedSummaryArgumentLessons: 6,
      sourceBindings: 12,
      grammarTargets: 36,
      grammarPracticeItems: 36,
      sourceAuditItems: 12,
      paraphraseItems: 12,
      structuredSummaryPrompts: 6,
      structuredArgumentPrompts: 6,
      spokenDefensePrompts: 6,
      authoredPracticeItems: 78,
      audioDependentItems: 30,
      learnerRecordingItems: 6,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 6,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.lessons.every(
      (lesson: { sourceBindings: Array<{ kind: string }> }) =>
        lesson.sourceBindings[0].kind === "long-form-reading"
        && lesson.sourceBindings[1].kind === "long-form-listening",
    )).toBe(true);
  });

  it("rejects a stale source reference and a mastery-capable draft rubric", () => {
    const bundle =
      loadHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].paraphraseItems[0].evidenceRefs[0].paragraphIds = [
      "unknown-paragraph",
    ];
    pack.lessons[0].argumentPrompt.rubric.scoringAuthority =
      "automatic-mastery";
    const result =
      validateHsk4PrecisionReferenceQuantitySummaryArgumentPackBundle({
        ...bundle,
        pack,
      });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      `${pack.lessons[0].paraphraseItems[0].itemId} paraphrase is invalid`,
      `${pack.lessons[0].lessonId} structured argument is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_PRECISION_REFERENCE_QUANTITY_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4SummaryArgumentModulePack(
        buildHsk4PrecisionReferenceQuantitySummaryArgumentPack(),
      ),
    );
  });
});
