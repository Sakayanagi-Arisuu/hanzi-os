import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk1GrammarContextPackBundle,
  loadHsk1GrammarContextPackBundle,
  validateHsk1GrammarContextPackBundle,
} from "./hsk1GrammarContextPack.mjs";
import {
  buildHsk1GrammarContextPack,
  serializeHsk1GrammarContextPack,
} from "../../scripts/content/build-hsk1-grammar-context-pack.mjs";

describe("HSK1 grammar-context draft pack", () => {
  it("maps all 66 grammar rows into contextual draft practice", () => {
    const bundle = loadHsk1GrammarContextPackBundle();
    const result = assertValidHsk1GrammarContextPackBundle(bundle);

    expect(result.summary).toEqual({
      communicativeLessonBlueprints: 25,
      lessonsWithGrammarPractice: 20,
      grammarDrafts: 66,
      modelExamples: 66,
      guidedPracticeItems: 66,
      reviewBatches: 20,
      measurementEligibleItems: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.coverageClaims).toMatchObject({
      officialGrammarInventoryDraftMapped: true,
      grammarContextDraftComplete: true,
      reviewedGrammarContentComplete: false,
      measurementCoverageComplete: false,
      hsk1Complete: false,
    });
  });

  it("keeps productive grammar self-checks outside mastery", () => {
    const { pack } = loadHsk1GrammarContextPackBundle();

    expect(pack.practiceItems).toHaveLength(66);
    expect(pack.practiceItems.every(
      (item: {
        kind: string;
        scoringPolicy: string;
        review: string;
        measurementEligible: boolean;
        masteryEligible: boolean;
      }) =>
        item.kind === "guided-pattern-production"
        && item.scoringPolicy === "self-reveal-only"
        && item.review === "pending"
        && item.measurementEligible === false
        && item.masteryEligible === false,
    )).toBe(true);
  });

  it("fails closed on pre-approval or premature measurement", () => {
    const bundle = loadHsk1GrammarContextPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.practiceItems[0].measurementEligible = true;
    pack.reviewBatches[0].approvals.push({
      role: "grammar-pedagogy-reviewer",
    });

    const result = validateHsk1GrammarContextPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("must remain pending and mastery-ineligible"),
      expect.stringContaining("review batch is incomplete or pre-approved"),
      "grammar pack counts do not match its content",
    ]));
  });

  it("keeps the checked grammar pack deterministic", () => {
    const bundle = loadHsk1GrammarContextPackBundle();
    expect(readFileSync(bundle.packPath, "utf8")).toBe(
      serializeHsk1GrammarContextPack(
        buildHsk1GrammarContextPack(),
      ),
    );
  });
});
