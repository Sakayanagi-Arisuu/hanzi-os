import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1CharacterFoundationPackBundle,
  loadHsk1CharacterFoundationPackBundle,
  validateHsk1CharacterFoundationPackBundle,
} from "./hsk1CharacterFoundationPack.mjs";
import {
  buildHsk1CharacterFoundationPack,
  serializeHsk1CharacterFoundationPack,
} from "../../scripts/content/build-hsk1-character-foundation-pack.mjs";

describe("HSK1 character-foundation draft pack", () => {
  it("maps all 246 official recognition characters into 15 lessons", () => {
    const bundle = loadHsk1CharacterFoundationPackBundle();
    const result = assertValidHsk1CharacterFoundationPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 15,
      characterDrafts: 246,
      charactersWithVocabularyContext: 246,
      charactersWithPinnedStrokeMetadata: 0,
      authoredPracticeItems: 492,
      characterInWordRecognitionItems: 246,
      glyphCopySelfCheckItems: 246,
      reviewBatches: 15,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.coverageClaims).toMatchObject({
      officialRecognitionInventoryDraftMapped: true,
      vocabularyContextCoverageComplete: true,
      strokeMetadataComplete: false,
      reviewedCharacterContentComplete: false,
      writingMasteryCoverageComplete: false,
      hsk1Complete: false,
    });
  });

  it("keeps recognition and copy practice outside writing mastery", () => {
    const { pack } = loadHsk1CharacterFoundationPackBundle();

    expect(pack.practiceItems).toHaveLength(492);
    expect(pack.practiceItems.every(
      (item: {
        review: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
      }) =>
        item.review === "pending"
        && item.measurementEligible === false
        && item.masteryEligible === false,
    )).toBe(true);
    expect(pack.practiceItems.filter(
      (item: { kind: string }) => item.kind === "glyph-copy-self-check",
    ).every(
      (item: { strokeOrderAssessed: boolean }) =>
        item.strokeOrderAssessed === false,
    )).toBe(true);
  });

  it("fails closed on invented stroke metadata or premature mastery", () => {
    const bundle = loadHsk1CharacterFoundationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.characters[0].linguisticMetadata.strokeCount = 13;
    pack.practiceItems[0].masteryEligible = true;

    const result = validateHsk1CharacterFoundationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk1-character-001 must not invent stroke metadata",
      expect.stringContaining("must remain pending and mastery-ineligible"),
    ]));
  });

  it("keeps the checked character pack deterministic", () => {
    const bundle = loadHsk1CharacterFoundationPackBundle();
    expect(readFileSync(bundle.packPath, "utf8")).toBe(
      serializeHsk1CharacterFoundationPack(
        buildHsk1CharacterFoundationPack(),
      ),
    );
  });
});
