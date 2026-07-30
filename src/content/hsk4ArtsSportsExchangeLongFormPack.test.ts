import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4ArtsSportsExchangeLongFormPack,
  serializeHsk4ArtsSportsExchangeLongFormPack,
} from "../../scripts/content/build-hsk4-arts-sports-exchange-long-form-pack.mjs";
import {
  assertValidHsk4ArtsSportsExchangeLongFormPackBundle,
  HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH,
  loadHsk4ArtsSportsExchangeLongFormPackBundle,
  validateHsk4ArtsSportsExchangeLongFormPackBundle,
} from "./hsk4ArtsSportsExchangeLongFormPack.mjs";

describe("HSK4 arts/sports/exchange long-form draft pack", () => {
  it("authors the fifth six-lesson evidence chain", () => {
    const bundle = loadHsk4ArtsSportsExchangeLongFormPackBundle();
    const result = assertValidHsk4ArtsSportsExchangeLongFormPackBundle(bundle);
    expect(result.summary).toEqual({
      lessons: 6,
      completedLongFormDomains: 5,
      completedLongFormLessons: 30,
      mappedTopics: 7,
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
      "hsk4-society-economy-long-form-2026.07",
    );
  });

  it("rejects premature release and an invented inference boundary", () => {
    const bundle = loadHsk4ArtsSportsExchangeLongFormPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.releaseEligible = true;
    const supportedDetail = pack.lessons[0].comprehensionItems[1];
    expect(supportedDetail.kind).toBe("supported-detail");
    supportedDetail.inferenceBoundaryVi =
      "Không được gắn ranh giới suy luận vào câu hỏi dữ kiện.";
    const result = validateHsk4ArtsSportsExchangeLongFormPackBundle({
      ...bundle,
      pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 long-form content must remain learner-hidden",
      `${supportedDetail.itemId} comprehension item is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_ARTS_SPORTS_EXCHANGE_LONG_FORM_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4ArtsSportsExchangeLongFormPack(
        buildHsk4ArtsSportsExchangeLongFormPack(),
      ),
    );
  });
});
