import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3GuidedParagraphPack,
  serializeHsk3GuidedParagraphPack,
} from "../../scripts/content/build-hsk3-guided-paragraph-pack.mjs";
import {
  assertValidHsk3GuidedParagraphPackBundle,
  HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH,
  loadHsk3GuidedParagraphPackBundle,
  validateHsk3GuidedParagraphPackBundle,
} from "./hsk3GuidedParagraphPack.mjs";

describe("HSK3 guided-paragraph production pack", () => {
  it("authors 16 evidence-bound paragraphs for the fourth stage", () => {
    const result = assertValidHsk3GuidedParagraphPackBundle(
      loadHsk3GuidedParagraphPackBundle(),
    );

    expect(result.summary).toEqual({
      lessons: 3,
      completedGuidedProductionStages: 4,
      completedGuidedProductionLessons: 12,
      sourceTexts: 16,
      sourceTextLines: 128,
      sourceInputBindings: 21,
      sourceGuidedSummaries: 16,
      promptUnits: 16,
      sixSentencePromptUnits: 6,
      comparisonPromptUnits: 5,
      eightSentencePromptUnits: 5,
      dualSourcePromptUnits: 5,
      modelEvidenceSummaries: 21,
      minimumRequiredSentences: 106,
      revisionChecklists: 16,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("keeps dual-source comparison distinct from single-source writing", () => {
    const { pack } = loadHsk3GuidedParagraphPackBundle();
    expect(pack.lessons[0].promptUnits.every(
      (item: { inputRefs: unknown[]; comparisonCriteriaVi: null }) =>
        item.inputRefs.length === 1
        && item.comparisonCriteriaVi === null,
    )).toBe(true);
    expect(pack.lessons[1].promptUnits.every(
      (item: {
        inputRefs: unknown[];
        comparisonCriteriaVi: string[];
      }) =>
        item.inputRefs.length === 2
        && item.comparisonCriteriaVi.length === 4,
    )).toBe(true);
    expect(pack.lessons[2].promptUnits.every(
      (item: { minimumSentenceCount: number }) =>
        item.minimumSentenceCount === 8,
    )).toBe(true);
  });

  it("rejects dependency drift, evidence drift and fake writing mastery", () => {
    const bundle = loadHsk3GuidedParagraphPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePackSha256 = "sha256:stale";
    pack.sourceTexts[0].text.lines[0].hanzi = "漂移";
    pack.lessons[0].promptUnits[0].masteryEligible = true;

    const result = validateHsk3GuidedParagraphPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 guided-paragraph source binding is stale",
      expect.stringContaining("guided-paragraph source is stale"),
      expect.stringContaining("guided-paragraph item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK3_GUIDED_PARAGRAPH_PACK_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3GuidedParagraphPack(buildHsk3GuidedParagraphPack()),
    );
  });
});
