import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2CharacterPractice,
  serializeHsk2CharacterPractice,
} from "../../scripts/content/build-hsk2-character-practice.mjs";
import {
  assertValidHsk2CharacterPracticeBundle,
  HSK2_CHARACTER_PRACTICE_RELATIVE_PATH,
  loadHsk2CharacterPracticeBundle,
  validateHsk2CharacterPracticeBundle,
} from "./hsk2CharacterPractice.mjs";

describe("HSK2 character-practice pack", () => {
  it("authors two safe draft activities for all 125 characters", () => {
    const bundle = loadHsk2CharacterPracticeBundle();
    const result = assertValidHsk2CharacterPracticeBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 10,
      characterDrafts: 125,
      charactersWithVocabularyContext: 124,
      charactersWithoutVocabularyContext: 1,
      charactersWithPinnedStrokeMetadata: 0,
      authoredPracticeItems: 250,
      characterInWordRecognitionItems: 124,
      isolatedCharacterRecognitionItems: 1,
      glyphCopySelfCheckItems: 125,
      reviewBatches: 10,
      approvals: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      releaseEligibleItems: 0,
    });
  });

  it("records the one cumulative-vocabulary context gap explicitly", () => {
    const { pack } = loadHsk2CharacterPracticeBundle();
    const missing = pack.characters.filter(
      (item: { primaryContext: unknown }) => item.primaryContext === null,
    );

    expect(missing).toEqual([
      expect.objectContaining({
        officialCharacterId: "hsk2-character-050",
        character: "留",
        contextVocabularyIds: [],
        contextState: "no-hsk1-2-vocabulary-context",
      }),
    ]);
    expect(pack.practiceItems).toContainEqual(expect.objectContaining({
      officialCharacterId: "hsk2-character-050",
      kind: "isolated-character-recognition",
      contextReason: "no-hsk1-2-vocabulary-context",
    }));
  });

  it("fails closed on invented stroke data or writing mastery", () => {
    const bundle = loadHsk2CharacterPracticeBundle();
    const pack = structuredClone(bundle.pack);
    pack.characters[0].linguisticMetadata.strokeCount = 5;
    const copy = pack.practiceItems.find(
      (item: { kind: string }) => item.kind === "glyph-copy-self-check",
    );
    copy.masteryEligible = true;
    copy.strokeOrderAssessed = true;

    const result = validateHsk2CharacterPracticeBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      `${pack.characters[0].officialCharacterId} must not invent stroke metadata`,
      `${copy.itemId} identity or eligibility is invalid`,
    ]));
  });

  it("keeps the generated character-practice artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_CHARACTER_PRACTICE_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2CharacterPractice(buildHsk2CharacterPractice()),
    );
  });
});
