import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3ReferenceQuantityNarrationPack,
  serializeHsk3ReferenceQuantityNarrationPack,
} from "../../scripts/content/build-hsk3-reference-quantity-narration-pack.mjs";
import {
  assertValidHsk3ReferenceQuantityNarrationPackBundle,
  HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH,
  loadHsk3ReferenceQuantityNarrationPackBundle,
  validateHsk3ReferenceQuantityNarrationPackBundle,
} from "./hsk3ReferenceQuantityNarrationPack.mjs";

describe("HSK3 reference/quantity narration grammar pack", () => {
  it("authors three lessons over the exact 21-row grammar partition", () => {
    const bundle = loadHsk3ReferenceQuantityNarrationPackBundle();
    const result = assertValidHsk3ReferenceQuantityNarrationPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 3,
      completedNarrationGrammarModules: 1,
      completedNarrationGrammarLessons: 3,
      grammarDrafts: 21,
      modelExamples: 21,
      correctionPairs: 21,
      modelNarrations: 3,
      modelNarrationLines: 18,
      grammarInParagraphItems: 21,
      discourseErrorCorrectionItems: 21,
      orderedRetellingItems: 3,
      authoredPracticeItems: 45,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("keeps grammar and speaking evidence separate and fail closed", () => {
    const { pack } = loadHsk3ReferenceQuantityNarrationPackBundle();
    expect(pack.masteryPolicy).toEqual({
      grammarEvidenceSeparatedFromSpeakingEvidence: true,
      selfRevealCannotGrantMastery: true,
      browserAsrCannotScoreSpeakingMastery: true,
    });
    expect(pack.lessons.every(
      (lesson: {
        grammarInParagraphItems: Array<{ skill: string }>;
        errorCorrectionItems: Array<{ skill: string }>;
        orderedRetellingItem: {
          skill: string;
          reviewedRubric: null;
          masteryEligible: boolean;
        };
      }) =>
        lesson.grammarInParagraphItems.every((item) =>
          item.skill === "writing"
        )
        && lesson.errorCorrectionItems.every((item) =>
          item.skill === "writing"
        )
        && lesson.orderedRetellingItem.skill === "speaking"
        && lesson.orderedRetellingItem.reviewedRubric === null
        && lesson.orderedRetellingItem.masteryEligible === false,
    )).toBe(true);
  });

  it("rejects source drift, official-row drift and fake mastery", () => {
    const bundle = loadHsk3ReferenceQuantityNarrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.lessonBlueprintPackSha256 = "sha256:stale";
    pack.lessons[0].grammar[0].officialContent = "stale";
    pack.lessons[0].orderedRetellingItem.masteryEligible = true;

    const result = validateHsk3ReferenceQuantityNarrationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 narration/grammar source binding is stale",
      "hsk3-grammar-row-001 grammar draft is invalid",
      expect.stringContaining("ordered retelling item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK3_REFERENCE_QUANTITY_NARRATION_PACK_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3ReferenceQuantityNarrationPack(
        buildHsk3ReferenceQuantityNarrationPack(),
      ),
    );
  });
});
