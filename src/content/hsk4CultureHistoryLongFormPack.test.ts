import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4CultureHistoryLongFormPack,
  serializeHsk4CultureHistoryLongFormPack,
} from "../../scripts/content/build-hsk4-culture-history-long-form-pack.mjs";
import {
  assertValidHsk4CultureHistoryLongFormPackBundle,
  HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH,
  loadHsk4CultureHistoryLongFormPackBundle,
  validateHsk4CultureHistoryLongFormPackBundle,
} from "./hsk4CultureHistoryLongFormPack.mjs";

describe("HSK4 culture/history long-form draft pack", () => {
  it("completes all six long-form evidence domains", () => {
    const bundle = loadHsk4CultureHistoryLongFormPackBundle();
    const result = assertValidHsk4CultureHistoryLongFormPackBundle(bundle);
    expect(result.summary).toEqual({
      lessons: 6,
      completedLongFormDomains: 6,
      completedLongFormLessons: 36,
      mappedTopics: 9,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 6,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.prerequisiteBundles[0].pack.packId).toBe(
      "hsk4-arts-sports-exchange-long-form-2026.07",
    );
  });

  it("rejects premature release and an evidence reference outside the text", () => {
    const bundle = loadHsk4CultureHistoryLongFormPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.releaseEligible = true;
    const inference = pack.lessons[0].comprehensionItems[3];
    expect(inference.kind).toBe("bounded-inference");
    inference.evidenceParagraphIds = ["unknown-paragraph"];
    const result = validateHsk4CultureHistoryLongFormPackBundle({
      ...bundle,
      pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 long-form content must remain learner-hidden",
      `${inference.itemId} comprehension item is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_CULTURE_HISTORY_LONG_FORM_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4CultureHistoryLongFormPack(
        buildHsk4CultureHistoryLongFormPack(),
      ),
    );
  });
});
