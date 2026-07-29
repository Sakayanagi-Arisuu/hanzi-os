import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3EventComplementsNarrationPack,
  serializeHsk3EventComplementsNarrationPack,
} from "../../scripts/content/build-hsk3-event-complements-narration-pack.mjs";
import {
  assertValidHsk3EventComplementsNarrationPackBundle,
  HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH,
  loadHsk3EventComplementsNarrationPackBundle,
  validateHsk3EventComplementsNarrationPackBundle,
} from "./hsk3EventComplementsNarrationPack.mjs";

describe("HSK3 event/complements narration grammar pack", () => {
  it("authors three lessons over the exact 18-row grammar partition", () => {
    const bundle = loadHsk3EventComplementsNarrationPackBundle();
    const result = assertValidHsk3EventComplementsNarrationPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 3,
      completedNarrationGrammarModules: 3,
      completedNarrationGrammarLessons: 9,
      grammarDrafts: 18,
      modelExamples: 18,
      correctionPairs: 18,
      modelNarrations: 3,
      modelNarrationLines: 18,
      grammarInParagraphItems: 18,
      discourseErrorCorrectionItems: 18,
      orderedRetellingItems: 3,
      authoredPracticeItems: 39,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("rejects prerequisite drift, source-row drift and fake measurement", () => {
    const bundle = loadHsk3EventComplementsNarrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    pack.lessons[0].grammar[0].sourcePage = 0;
    pack.lessons[0].grammarInParagraphItems[0].measurementEligible = true;

    const result = validateHsk3EventComplementsNarrationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 narration/grammar source binding is stale",
      "hsk3-grammar-row-005 grammar draft is invalid",
      expect.stringContaining("grammar-in-paragraph item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_EVENT_COMPLEMENTS_NARRATION_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3EventComplementsNarrationPack(
        buildHsk3EventComplementsNarrationPack(),
      ),
    );
  });
});
