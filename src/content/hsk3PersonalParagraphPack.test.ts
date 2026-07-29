import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3PersonalParagraphPack,
  serializeHsk3PersonalParagraphPack,
} from "../../scripts/content/build-hsk3-personal-paragraph-pack.mjs";
import {
  assertValidHsk3PersonalParagraphPackBundle,
  HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH,
  loadHsk3PersonalParagraphPackBundle,
  validateHsk3PersonalParagraphPackBundle,
} from "./hsk3PersonalParagraphPack.mjs";

describe("HSK3 personal paragraph content pack", () => {
  it("authors a complete reading/listening practice slice for one lesson", () => {
    const bundle = loadHsk3PersonalParagraphPackBundle();
    const result = assertValidHsk3PersonalParagraphPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 1,
      vocabularyDrafts: 20,
      authoredTexts: 2,
      authoredTextLines: 16,
      vocabularyPracticeItems: 60,
      comprehensionItems: 10,
      readingComprehensionItems: 5,
      listeningComprehensionItems: 5,
      noteGridItems: 2,
      guidedSummaryItems: 2,
      authoredPracticeItems: 74,
      audioDependentItems: 27,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 1,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.texts.map(
      (text: { kind: string }) => text.kind,
    )).toEqual(["graded-reading", "graded-listening"]);
  });

  it("uses every lesson lexeme in an authored paragraph", () => {
    const { pack } = loadHsk3PersonalParagraphPackBundle();
    const authoredHanzi = pack.texts.flatMap(
      (text: { lines: Array<{ hanzi: string }> }) =>
        text.lines.map((line) => line.hanzi),
    ).join("");

    expect(pack.lexemes.every(
      (lexeme: { simplified: string }) =>
        authoredHanzi.includes(lexeme.simplified),
    )).toBe(true);
  });

  it("keeps listening, speaking, scoring and release fail closed", () => {
    const { pack } = loadHsk3PersonalParagraphPackBundle();
    const practiceItems = [
      ...pack.vocabularyPracticeItems,
      ...pack.comprehensionItems,
      ...pack.noteGrids,
      ...pack.guidedSummaries,
    ];

    expect(practiceItems.every(
      (item: {
        review: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
        releaseEligible: boolean;
      }) =>
        item.review === "pending"
        && item.measurementEligible === false
        && item.masteryEligible === false
        && item.releaseEligible === false,
    )).toBe(true);
    expect(pack).toMatchObject({
      learnerVisible: false,
      releaseEligible: false,
      audioPolicy: {
        committedAudio: false,
        browserTtsPreviewOnly: true,
        browserAsrCanScoreSpeakingMastery: false,
      },
    });
  });

  it("fails closed when a target word disappears or practice is published", () => {
    const bundle = loadHsk3PersonalParagraphPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.texts[1].lines[4].hanzi = pack.texts[1].lines[4].hanzi
      .replace("草", "花");
    pack.vocabularyPracticeItems[0].releaseEligible = true;

    const result = validateHsk3PersonalParagraphPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk-vocab-00547 is absent from the authored paragraphs",
      expect.stringContaining("vocabulary practice contract is invalid"),
    ]));
  });

  it("keeps the authored pack deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_PERSONAL_PARAGRAPH_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3PersonalParagraphPack(
        buildHsk3PersonalParagraphPack(),
      ),
    );
  });
});
