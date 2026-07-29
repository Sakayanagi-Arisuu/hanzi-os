import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3CultureTraditionDomainPack,
  serializeHsk3CultureTraditionDomainPack,
} from "../../scripts/content/build-hsk3-culture-tradition-domain-pack.mjs";
import {
  assertValidHsk3CultureTraditionDomainPackBundle,
  HSK3_CULTURE_TRADITION_DOMAIN_PACK_RELATIVE_PATH,
  loadHsk3CultureTraditionDomainPackBundle,
  validateHsk3CultureTraditionDomainPackBundle,
} from "./hsk3CultureTraditionDomainPack.mjs";

describe("HSK3 culture/tradition paragraph domain pack", () => {
  it("closes all five paragraph domains with exact blueprint coverage", () => {
    const bundle = loadHsk3CultureTraditionDomainPackBundle();
    const result = assertValidHsk3CultureTraditionDomainPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 5,
      completedParagraphDomainCount: 5,
      completedParagraphLessons: 25,
      vocabularyDrafts: 97,
      authoredTexts: 10,
      authoredTextLines: 80,
      vocabularyPracticeItems: 291,
      comprehensionItems: 50,
      readingComprehensionItems: 25,
      listeningComprehensionItems: 25,
      noteGridItems: 10,
      guidedSummaryItems: 10,
      authoredPracticeItems: 361,
      audioDependentItems: 132,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 5,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses every mapped lexeme in its own lesson texts", () => {
    const { pack } = loadHsk3CultureTraditionDomainPackBundle();
    expect(pack.lessons.every(
      (lesson: {
        lexemes: Array<{ simplified: string }>;
        texts: Array<{ lines: Array<{ hanzi: string }> }>;
      }) => {
        const authored = lesson.texts.flatMap(
          (source) => source.lines.map((line) => line.hanzi),
        ).join("");
        return lesson.lexemes.every((lexeme) =>
          authored.includes(lexeme.simplified)
        );
      },
    )).toBe(true);
  });

  it("keeps cultural drafts, audio, scoring and release fail closed", () => {
    const { pack } = loadHsk3CultureTraditionDomainPackBundle();
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
      audioDependentItems: 132,
      reviewedAudioItems: 0,
      approvals: 0,
    });
  });

  it("rejects stale sources, missing lexeme coverage and fake eligibility", () => {
    const bundle = loadHsk3CultureTraditionDomainPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    for (const source of pack.lessons[0].texts) {
      for (const line of source.lines) {
        line.hanzi = line.hanzi.replaceAll("安静", "平静");
      }
    }
    pack.lessons[0].noteGrids[0].measurementEligible = true;

    const result = validateHsk3CultureTraditionDomainPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 paragraph domain source binding is stale",
      "hsk-vocab-00504 is absent from hsk3-culture-tradition-descriptions-regional-cuisine",
      expect.stringContaining("note grid is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_CULTURE_TRADITION_DOMAIN_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3CultureTraditionDomainPack(
        buildHsk3CultureTraditionDomainPack(),
      ),
    );
  });
});
