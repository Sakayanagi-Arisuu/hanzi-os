import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2GrammarContext,
  serializeHsk2GrammarContext,
} from "../../scripts/content/build-hsk2-grammar-context.mjs";
import {
  assertValidHsk2GrammarContextBundle,
  HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH,
  loadHsk2GrammarContextBundle,
  validateHsk2GrammarContextBundle,
} from "./hsk2GrammarContext.mjs";

describe("HSK2 grammar-context pack", () => {
  it("authors contextual draft practice for all 75 official grammar rows", () => {
    const bundle = loadHsk2GrammarContextBundle();
    const result = assertValidHsk2GrammarContextBundle(bundle);

    expect(result.summary).toEqual({
      lessonBlueprints: 40,
      sentenceChainLessons: 10,
      grammarDrafts: 75,
      modelExamples: 75,
      guidedPracticeItems: 75,
      reviewBatches: 10,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    });
    expect(new Set(bundle.pack.grammarDrafts.map(
      (draft: { lessonId: string }) => draft.lessonId,
    )).size).toBe(10);
  });

  it("keeps model and production contexts specific to their official rows", () => {
    const { pack } = loadHsk2GrammarContextBundle();
    const comparison = pack.grammarDrafts.find(
      (draft: { officialGrammarRowId: string }) =>
        draft.officialGrammarRowId === "hsk2-grammar-row-061",
    );
    const experience = pack.grammarDrafts.find(
      (draft: { officialGrammarRowId: string }) =>
        draft.officialGrammarRowId === "hsk2-grammar-row-071",
    );

    expect(comparison).toEqual(expect.objectContaining({
      officialContent:
        "（4）A比B+动词+得+形容词/A+动词+得+比 / +B+形容词",
      trackId: "hsk2-reference-description-comparison",
      modelExample: expect.objectContaining({
        hanzi: "他跑得比我快。",
      }),
    }));
    expect(experience).toEqual(expect.objectContaining({
      officialContent: "用动态助词“过”表示",
      trackId: "hsk2-aspect-time-experience",
      modelExample: expect.objectContaining({
        hanzi: "你吃过中国饺子吗？",
      }),
    }));
  });

  it("fails closed on stale mapping, implied review or mastery eligibility", () => {
    const bundle = loadHsk2GrammarContextBundle();
    const pack = structuredClone(bundle.pack);
    pack.grammarDrafts[0].lessonId =
      "hsk2-aspect-time-experience-lesson-01";
    pack.grammarDrafts[1].review.nativeMandarinReview = "approved";
    pack.practiceItems[2].masteryEligible = true;

    const result = validateHsk2GrammarContextBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk2-grammar-row-001 lesson mapping is stale",
      "hsk2-grammar-row-002 review state must remain pending",
      `${pack.practiceItems[2].itemId} must remain pending and mastery-ineligible`,
      "HSK2 grammar-context counts do not match its actual content",
    ]));
  });

  it("keeps the generated grammar-context artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_GRAMMAR_CONTEXT_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2GrammarContext(buildHsk2GrammarContext()),
    );
  });
});
