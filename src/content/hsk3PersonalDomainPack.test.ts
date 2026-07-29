import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3PersonalDomainPack,
  serializeHsk3PersonalDomainPack,
} from "../../scripts/content/build-hsk3-personal-domain-pack.mjs";
import {
  assertValidHsk3PersonalDomainPackBundle,
  HSK3_PERSONAL_DOMAIN_PACK_RELATIVE_PATH,
  loadHsk3PersonalDomainPackBundle,
  validateHsk3PersonalDomainPackBundle,
} from "./hsk3PersonalDomainPack.mjs";

describe("HSK3 personal-life paragraph domain pack", () => {
  it("completes the remaining four lessons with deep paragraph practice", () => {
    const bundle = loadHsk3PersonalDomainPackBundle();
    const result = assertValidHsk3PersonalDomainPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 4,
      personalDomainLessonsWithPriorPack: 5,
      vocabularyDrafts: 80,
      authoredTexts: 8,
      authoredTextLines: 64,
      vocabularyPracticeItems: 240,
      comprehensionItems: 40,
      readingComprehensionItems: 20,
      listeningComprehensionItems: 20,
      noteGridItems: 8,
      guidedSummaryItems: 8,
      authoredPracticeItems: 296,
      audioDependentItems: 108,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 4,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.lessons.map(
      (lesson: { lessonId: string }) => lesson.lessonId,
    )).toEqual([
      "hsk3-personal-life-narratives-food-shopping",
      "hsk3-personal-life-narratives-travel-transport",
      "hsk3-personal-life-narratives-health-care",
      "hsk3-personal-life-narratives-home-family-leisure",
    ]);
  });

  it("uses every mapped lexeme in its own lesson texts", () => {
    const { pack } = loadHsk3PersonalDomainPackBundle();

    expect(pack.lessons.every(
      (lesson: {
        lexemes: Array<{ simplified: string }>;
        texts: Array<{ lines: Array<{ hanzi: string }> }>;
      }) => {
        const authored = lesson.texts.flatMap(
          (text) => text.lines.map((line) => line.hanzi),
        ).join("");
        return lesson.lexemes.every((lexeme) =>
          authored.includes(lexeme.simplified)
        );
      },
    )).toBe(true);
  });

  it("keeps audio, scoring, review and release fail closed", () => {
    const { pack } = loadHsk3PersonalDomainPackBundle();
    const practice = pack.lessons.flatMap(
      (lesson: {
        vocabularyPracticeItems: unknown[];
        comprehensionItems: unknown[];
        noteGrids: unknown[];
        guidedSummaries: unknown[];
      }) => [
        ...lesson.vocabularyPracticeItems,
        ...lesson.comprehensionItems,
        ...lesson.noteGrids,
        ...lesson.guidedSummaries,
      ],
    ) as Array<{
      review: string;
      measurementEligible: boolean;
      masteryEligible: boolean;
      releaseEligible: boolean;
    }>;

    expect(practice.every((item) =>
      item.review === "pending"
      && item.measurementEligible === false
      && item.masteryEligible === false
      && item.releaseEligible === false
    )).toBe(true);
    expect(pack).toMatchObject({
      learnerVisible: false,
      releaseEligible: false,
      counts: {
        audioDependentItems: 108,
        reviewedAudioItems: 0,
        approvals: 0,
      },
    });
  });

  it("fails closed on missing text coverage or premature eligibility", () => {
    const bundle = loadHsk3PersonalDomainPackBundle();
    const pack = structuredClone(bundle.pack);
    for (const text of pack.lessons[0].texts) {
      for (const line of text.lines) {
        line.hanzi = line.hanzi.replaceAll("高铁", "火车");
      }
    }
    pack.lessons[0].vocabularyPracticeItems[0].masteryEligible = true;

    const result = validateHsk3PersonalDomainPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "hsk-vocab-00644 is absent from hsk3-personal-life-narratives-food-shopping",
      expect.stringContaining("vocabulary practice is invalid"),
    ]));
  });

  it("keeps the domain artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_PERSONAL_DOMAIN_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3PersonalDomainPack(buildHsk3PersonalDomainPack()),
    );
  });
});
