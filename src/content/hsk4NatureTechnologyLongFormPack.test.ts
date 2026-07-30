import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4NatureTechnologyLongFormPack,
  serializeHsk4NatureTechnologyLongFormPack,
} from "../../scripts/content/build-hsk4-nature-technology-long-form-pack.mjs";
import {
  assertValidHsk4NatureTechnologyLongFormPackBundle,
  HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH,
  loadHsk4NatureTechnologyLongFormPackBundle,
  validateHsk4NatureTechnologyLongFormPackBundle,
} from "./hsk4NatureTechnologyLongFormPack.mjs";

describe("HSK4 nature/technology long-form draft pack", () => {
  it("authors the third six-lesson evidence chain", () => {
    const bundle = loadHsk4NatureTechnologyLongFormPackBundle();
    const result = assertValidHsk4NatureTechnologyLongFormPackBundle(bundle);
    expect(result.summary).toEqual({
      lessons: 6,
      completedLongFormDomains: 3,
      completedLongFormLessons: 18,
      mappedTopics: 10,
      targetLexemeContexts: 60,
      authoredTexts: 12,
      authoredParagraphs: 36,
      vocabularyPracticeItems: 180,
      comprehensionItems: 60,
      evidenceBoundComprehensionItems: 60,
      inferenceItems: 12,
      noteMapItems: 12,
      noteMapNodes: 60,
      synthesisPrompts: 6,
      authoredPracticeItems: 258,
      audioDependentItems: 96,
      reviewedAudioItems: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 6,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.prerequisiteBundles[0].pack.packId).toBe(
      "hsk4-education-work-long-form-2026.07",
    );
  });

  it("rejects premature release and missing evidence", () => {
    const bundle = loadHsk4NatureTechnologyLongFormPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.releaseEligible = true;
    pack.lessons[0].comprehensionItems[0].evidenceParagraphIds = [];
    const result = validateHsk4NatureTechnologyLongFormPackBundle({
      ...bundle,
      pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 long-form content must remain learner-hidden",
      `${pack.lessons[0].comprehensionItems[0].itemId} comprehension item is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_NATURE_TECHNOLOGY_LONG_FORM_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4NatureTechnologyLongFormPack(
        buildHsk4NatureTechnologyLongFormPack(),
      ),
    );
  });
});
