import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3NatureEnvironmentDomainPack,
  serializeHsk3NatureEnvironmentDomainPack,
} from "../../scripts/content/build-hsk3-nature-environment-domain-pack.mjs";
import {
  assertValidHsk3NatureEnvironmentDomainPackBundle,
  HSK3_NATURE_ENVIRONMENT_DOMAIN_PACK_RELATIVE_PATH,
  loadHsk3NatureEnvironmentDomainPackBundle,
  validateHsk3NatureEnvironmentDomainPackBundle,
} from "./hsk3NatureEnvironmentDomainPack.mjs";

describe("HSK3 nature/environment paragraph domain pack", () => {
  it("authors five deep lessons bound to the exact blueprint partition", () => {
    const bundle = loadHsk3NatureEnvironmentDomainPackBundle();
    const result = assertValidHsk3NatureEnvironmentDomainPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 5,
      completedParagraphDomainCount: 3,
      completedParagraphLessons: 15,
      vocabularyDrafts: 100,
      authoredTexts: 10,
      authoredTextLines: 80,
      vocabularyPracticeItems: 300,
      comprehensionItems: 50,
      readingComprehensionItems: 25,
      listeningComprehensionItems: 25,
      noteGridItems: 10,
      guidedSummaryItems: 10,
      authoredPracticeItems: 370,
      audioDependentItems: 135,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 5,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("uses every mapped lexeme in its own lesson texts", () => {
    const { pack } = loadHsk3NatureEnvironmentDomainPackBundle();

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
    const { pack } = loadHsk3NatureEnvironmentDomainPackBundle();
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
      audioDependentItems: 135,
      reviewedAudioItems: 0,
      approvals: 0,
    });
  });

  it("rejects stale sources, missing text coverage and fake eligibility", () => {
    const bundle = loadHsk3NatureEnvironmentDomainPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    for (const text of pack.lessons[0].texts) {
      for (const line of text.lines) {
        line.hanzi = line.hanzi.replaceAll("牙刷", "用品");
      }
    }
    pack.lessons[0].comprehensionItems[0].releaseEligible = true;

    const result = validateHsk3NatureEnvironmentDomainPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 paragraph domain source binding is stale",
      "hsk-vocab-00917 is absent from hsk3-nature-environment-explanations-climate-seasons",
      expect.stringContaining("comprehension practice is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_NATURE_ENVIRONMENT_DOMAIN_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3NatureEnvironmentDomainPack(
        buildHsk3NatureEnvironmentDomainPack(),
      ),
    );
  });
});
