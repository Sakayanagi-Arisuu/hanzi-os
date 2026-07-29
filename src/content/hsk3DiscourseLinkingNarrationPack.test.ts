import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3DiscourseLinkingNarrationPack,
  serializeHsk3DiscourseLinkingNarrationPack,
} from "../../scripts/content/build-hsk3-discourse-linking-narration-pack.mjs";
import {
  assertValidHsk3DiscourseLinkingNarrationPackBundle,
  HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH,
  loadHsk3DiscourseLinkingNarrationPackBundle,
  validateHsk3DiscourseLinkingNarrationPackBundle,
} from "./hsk3DiscourseLinkingNarrationPack.mjs";

describe("HSK3 discourse-linking narration grammar pack", () => {
  it("authors the final three lessons over the exact 17-row partition", () => {
    const bundle = loadHsk3DiscourseLinkingNarrationPackBundle();
    const result = assertValidHsk3DiscourseLinkingNarrationPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 3,
      completedNarrationGrammarModules: 5,
      completedNarrationGrammarLessons: 15,
      grammarDrafts: 17,
      modelExamples: 17,
      correctionPairs: 17,
      modelNarrations: 3,
      modelNarrationLines: 18,
      grammarInParagraphItems: 17,
      discourseErrorCorrectionItems: 17,
      orderedRetellingItems: 3,
      authoredPracticeItems: 37,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("distinguishes necessary, sufficient and hypothetical conditions", () => {
    const { pack } = loadHsk3DiscourseLinkingNarrationPackBundle();
    const lessons = pack.lessons as Array<{
      grammar: Array<{
        grammarRowId: string;
        usageBoundaryVi: string;
      }>;
    }>;
    const grammar = lessons.flatMap((lesson) => lesson.grammar) as Array<{
      grammarRowId: string;
      usageBoundaryVi: string;
    }>;
    const byId = new Map(grammar.map((item) => [
      item.grammarRowId,
      item.usageBoundaryVi,
    ]));

    expect(byId.get("hsk3-grammar-row-089")).toContain("không nhất thiết");
    expect(byId.get("hsk3-grammar-row-091")).toContain("điều kiện cần");
    expect(byId.get("hsk3-grammar-row-092")).toContain("Không mang nghĩa");
  });

  it("rejects prerequisite drift, row drift and fake mastery", () => {
    const bundle = loadHsk3DiscourseLinkingNarrationPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    pack.lessons[2].grammar[0].sourcePage = 0;
    pack.lessons[2].orderedRetellingItem.masteryEligible = true;

    const result = validateHsk3DiscourseLinkingNarrationPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 narration/grammar source binding is stale",
      "hsk3-grammar-row-090 grammar draft is invalid",
      expect.stringContaining("ordered retelling item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_DISCOURSE_LINKING_NARRATION_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3DiscourseLinkingNarrationPack(
        buildHsk3DiscourseLinkingNarrationPack(),
      ),
    );
  });
});
