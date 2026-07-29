import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3ComparisonEvaluationNarrationPack,
  serializeHsk3ComparisonEvaluationNarrationPack,
} from "../../scripts/content/build-hsk3-comparison-evaluation-narration-pack.mjs";
import {
  assertValidHsk3ComparisonEvaluationNarrationPackBundle,
  HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH,
  loadHsk3ComparisonEvaluationNarrationPackBundle,
  validateHsk3ComparisonEvaluationNarrationPackBundle,
} from "./hsk3ComparisonEvaluationNarrationPack.mjs";

describe("HSK3 comparison/evaluation narration grammar pack", () => {
  it("authors three lessons over the exact 13-row grammar partition", () => {
    const bundle = loadHsk3ComparisonEvaluationNarrationPackBundle();
    const result = assertValidHsk3ComparisonEvaluationNarrationPackBundle(
      bundle,
    );

    expect(result.summary).toEqual({
      lessons: 3,
      completedNarrationGrammarModules: 4,
      completedNarrationGrammarLessons: 12,
      grammarDrafts: 13,
      modelExamples: 13,
      correctionPairs: 13,
      modelNarrations: 3,
      modelNarrationLines: 18,
      grammarInParagraphItems: 13,
      discourseErrorCorrectionItems: 13,
      orderedRetellingItems: 3,
      authoredPracticeItems: 29,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("keeps comparison claims bounded by scope and evidence", () => {
    const { pack } = loadHsk3ComparisonEvaluationNarrationPackBundle();
    const lessons = pack.lessons as Array<{
      grammar: Array<{
        grammarRowId: string;
        usageBoundaryVi: string;
      }>;
      modelNarration: {
        lines: Array<{ hanzi: string }>;
      };
    }>;
    const notMoreThan = lessons[2].grammar.find(
      (item) => item.grammarRowId === "hsk3-grammar-row-076",
    );

    expect(notMoreThan?.usageBoundaryVi).toContain("bằng hoặc kém");
    expect(lessons[0].modelNarration.lines[5].hanzi).toContain("只比较这两天");
  });

  it("rejects prerequisite drift, source-row drift and fake measurement", () => {
    const bundle = loadHsk3ComparisonEvaluationNarrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    pack.lessons[0].grammar[0].officialContent = "drift";
    pack.lessons[0].orderedRetellingItem.measurementEligible = true;

    const result = validateHsk3ComparisonEvaluationNarrationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 narration/grammar source binding is stale",
      "hsk3-grammar-row-039 grammar draft is invalid",
      expect.stringContaining("ordered retelling item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK3_COMPARISON_EVALUATION_NARRATION_PACK_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3ComparisonEvaluationNarrationPack(
        buildHsk3ComparisonEvaluationNarrationPack(),
      ),
    );
  });
});
