import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3SocietyArtsSportsDomainPack,
  serializeHsk3SocietyArtsSportsDomainPack,
} from "../../scripts/content/build-hsk3-society-arts-sports-domain-pack.mjs";
import {
  assertValidHsk3SocietyArtsSportsDomainPackBundle,
  HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_PACK_RELATIVE_PATH,
  loadHsk3SocietyArtsSportsDomainPackBundle,
  validateHsk3SocietyArtsSportsDomainPackBundle,
} from "./hsk3SocietyArtsSportsDomainPack.mjs";

describe("HSK3 society/arts/sports paragraph domain pack", () => {
  it("authors five deep lessons bound to the exact blueprint partition", () => {
    const bundle = loadHsk3SocietyArtsSportsDomainPackBundle();
    const result = assertValidHsk3SocietyArtsSportsDomainPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 5,
      completedParagraphDomainCount: 4,
      completedParagraphLessons: 20,
      vocabularyDrafts: 96,
      authoredTexts: 10,
      authoredTextLines: 80,
      vocabularyPracticeItems: 288,
      comprehensionItems: 50,
      readingComprehensionItems: 25,
      listeningComprehensionItems: 25,
      noteGridItems: 10,
      guidedSummaryItems: 10,
      authoredPracticeItems: 358,
      audioDependentItems: 131,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 5,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses every mapped lexeme in its own lesson texts", () => {
    const { pack } = loadHsk3SocietyArtsSportsDomainPackBundle();
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
    const { pack } = loadHsk3SocietyArtsSportsDomainPackBundle();
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
    expect(pack.counts).toMatchObject({
      audioDependentItems: 131,
      reviewedAudioItems: 0,
      approvals: 0,
    });
  });

  it("rejects stale sources, missing text coverage and fake eligibility", () => {
    const bundle = loadHsk3SocietyArtsSportsDomainPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    for (const text of pack.lessons[0].texts) {
      for (const line of text.lines) {
        line.hanzi = line.hanzi.replaceAll("耳机", "设备");
      }
    }
    pack.lessons[0].noteGrids[0].measurementEligible = true;

    const result = validateHsk3SocietyArtsSportsDomainPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 paragraph domain source binding is stale",
      "hsk-vocab-00613 is absent from hsk3-society-arts-sports-reports-modern-life",
      expect.stringContaining("note grid is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_SOCIETY_ARTS_SPORTS_DOMAIN_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3SocietyArtsSportsDomainPack(
        buildHsk3SocietyArtsSportsDomainPack(),
      ),
    );
  });
});
