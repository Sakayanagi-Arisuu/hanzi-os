import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3ModalityTimeNarrationPack,
  serializeHsk3ModalityTimeNarrationPack,
} from "../../scripts/content/build-hsk3-modality-time-narration-pack.mjs";
import {
  assertValidHsk3ModalityTimeNarrationPackBundle,
  HSK3_MODALITY_TIME_NARRATION_PACK_RELATIVE_PATH,
  loadHsk3ModalityTimeNarrationPackBundle,
  validateHsk3ModalityTimeNarrationPackBundle,
} from "./hsk3ModalityTimeNarrationPack.mjs";

describe("HSK3 modality/time narration grammar pack", () => {
  it("authors three lessons over the exact 27-row grammar partition", () => {
    const bundle = loadHsk3ModalityTimeNarrationPackBundle();
    const result = assertValidHsk3ModalityTimeNarrationPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 3,
      completedNarrationGrammarModules: 2,
      completedNarrationGrammarLessons: 6,
      grammarDrafts: 27,
      modelExamples: 27,
      correctionPairs: 27,
      modelNarrations: 3,
      modelNarrationLines: 18,
      grammarInParagraphItems: 27,
      discourseErrorCorrectionItems: 27,
      orderedRetellingItems: 3,
      authoredPracticeItems: 57,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("requires bounded viewpoints instead of universalizing them", () => {
    const { pack } = loadHsk3ModalityTimeNarrationPackBundle();
    const viewpointLesson = pack.lessons[1] as {
      grammar: Array<{
        grammarRowId: string;
        explanationVi: string;
        usageBoundaryVi: string;
      }>;
    };
    const generalization = viewpointLesson.grammar.find(
      (item) => item.grammarRowId === "hsk3-grammar-row-042",
    );

    expect(generalization?.explanationVi).toContain("ngoại lệ");
    expect(generalization?.usageBoundaryVi).toContain("quy tắc chắc chắn");
  });

  it("rejects prerequisite drift, row drift and fake measurement", () => {
    const bundle = loadHsk3ModalityTimeNarrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    pack.lessons[0].grammar[0].sourcePage = 0;
    pack.lessons[0].grammarInParagraphItems[0].measurementEligible = true;

    const result = validateHsk3ModalityTimeNarrationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 narration/grammar source binding is stale",
      "hsk3-grammar-row-004 grammar draft is invalid",
      expect.stringContaining("grammar-in-paragraph item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_MODALITY_TIME_NARRATION_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3ModalityTimeNarrationPack(
        buildHsk3ModalityTimeNarrationPack(),
      ),
    );
  });
});
