import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
  validateHsk1PersonalExchangePackBundle,
} from "./hsk1PersonalExchangePack.mjs";
import {
  buildHsk1PersonalExchangePack,
  serializeHsk1PersonalExchangePack,
} from "../../scripts/content/build-hsk1-personal-exchange-pack.mjs";

describe("HSK1 personal-exchange AI-assisted content pack", () => {
  it("maps the complete unit into nine learner-hidden lesson blueprints", () => {
    const bundle = loadHsk1PersonalExchangePackBundle();
    const result = assertValidHsk1PersonalExchangePackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 9,
      vocabularyDrafts: 107,
      taskBlueprintMappings: 2,
      topicBlueprintMappings: 5,
      grammarBlueprintMappings: 32,
      dialogueTurns: 38,
      authoredPracticeItems: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack).toMatchObject({
      state: "ai-assisted-draft",
      learnerVisible: false,
      releaseEligible: false,
      coverageClaims: {
        unitBlueprintMapped: true,
        authoredPracticeCoverageComplete: false,
        reviewedContentComplete: false,
        hsk1Complete: false,
      },
    });
  });

  it("keeps Vietnamese glosses attributable and explicitly unreviewed", () => {
    const { pack } = loadHsk1PersonalExchangePackBundle();
    expect(pack.lexemes.find(
      (lexeme: { officialId: string }) =>
        lexeme.officialId === "hsk-vocab-00001",
    )).toMatchObject({
      simplified: "爱",
      pinyin: "ài",
      vietnameseGlossDraft: "yêu; thích",
      review: {
        machineAssisted: true,
        mandarinLinguisticReview: "pending",
        vietnameseEditorialReview: "pending",
      },
    });
    expect(pack.lexemes.every(
      (lexeme: { sourceLineSha256: string[] }) =>
        lexeme.sourceLineSha256.length > 0,
    )).toBe(true);
  });

  it("fails closed on premature release or missing Vietnamese content", () => {
    const bundle = loadHsk1PersonalExchangePackBundle();
    const pack = structuredClone(bundle.pack);
    pack.releaseEligible = true;
    pack.lexemes[0].vietnameseGlossDraft = "";

    const result = validateHsk1PersonalExchangePackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "personal-exchange pack must remain learner-hidden AI-assisted draft",
      "hsk-vocab-00001 Vietnamese draft gloss is invalid",
    ]));
  });

  it("keeps the checked content pack deterministic", () => {
    const bundle = loadHsk1PersonalExchangePackBundle();
    expect(readFileSync(bundle.packPath, "utf8")).toBe(
      serializeHsk1PersonalExchangePack(
        buildHsk1PersonalExchangePack(),
      ),
    );
  });
});
