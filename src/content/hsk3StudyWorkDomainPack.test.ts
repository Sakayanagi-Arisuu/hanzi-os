import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3StudyWorkDomainPack,
  serializeHsk3StudyWorkDomainPack,
} from "../../scripts/content/build-hsk3-study-work-domain-pack.mjs";
import {
  assertValidHsk3StudyWorkDomainPackBundle,
  HSK3_STUDY_WORK_DOMAIN_PACK_RELATIVE_PATH,
  loadHsk3StudyWorkDomainPackBundle,
  validateHsk3StudyWorkDomainPackBundle,
} from "./hsk3StudyWorkDomainPack.mjs";

describe("HSK3 study/work paragraph domain pack", () => {
  it("authors five deep lessons bound to the exact blueprint partition", () => {
    const bundle = loadHsk3StudyWorkDomainPackBundle();
    const result = assertValidHsk3StudyWorkDomainPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 5,
      completedParagraphDomainCount: 2,
      completedParagraphLessons: 10,
      vocabularyDrafts: 107,
      authoredTexts: 10,
      authoredTextLines: 80,
      vocabularyPracticeItems: 321,
      comprehensionItems: 50,
      readingComprehensionItems: 25,
      listeningComprehensionItems: 25,
      noteGridItems: 10,
      guidedSummaryItems: 10,
      authoredPracticeItems: 391,
      audioDependentItems: 142,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 5,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses every mapped lexeme in its own lesson texts", () => {
    const { pack } = loadHsk3StudyWorkDomainPackBundle();

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

  it("keeps review, audio, scoring, mastery and release fail closed", () => {
    const { pack } = loadHsk3StudyWorkDomainPackBundle();
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
        audioDependentItems: 142,
        reviewedAudioItems: 0,
        approvals: 0,
      },
    });
  });

  it("rejects stale sources, missing text coverage and fake eligibility", () => {
    const bundle = loadHsk3StudyWorkDomainPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    for (const text of pack.lessons[0].texts) {
      for (const line of text.lines) {
        line.hanzi = line.hanzi.replaceAll("球场", "操场");
      }
    }
    pack.lessons[0].guidedSummaries[0].masteryEligible = true;

    const result = validateHsk3StudyWorkDomainPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 paragraph domain source binding is stale",
      "hsk-vocab-00811 is absent from hsk3-study-work-accounts-courses-learning",
      expect.stringContaining("guided summary is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_STUDY_WORK_DOMAIN_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3StudyWorkDomainPack(buildHsk3StudyWorkDomainPack()),
    );
  });
});
