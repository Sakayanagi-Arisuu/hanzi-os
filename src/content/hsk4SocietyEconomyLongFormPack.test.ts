import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4SocietyEconomyLongFormPack,
  serializeHsk4SocietyEconomyLongFormPack,
} from "../../scripts/content/build-hsk4-society-economy-long-form-pack.mjs";
import {
  assertValidHsk4SocietyEconomyLongFormPackBundle,
  HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH,
  loadHsk4SocietyEconomyLongFormPackBundle,
  validateHsk4SocietyEconomyLongFormPackBundle,
} from "./hsk4SocietyEconomyLongFormPack.mjs";

describe("HSK4 society/economy long-form draft pack", () => {
  it("authors the fourth six-lesson evidence chain", () => {
    const bundle = loadHsk4SocietyEconomyLongFormPackBundle();
    const result = assertValidHsk4SocietyEconomyLongFormPackBundle(bundle);
    expect(result.summary).toEqual({
      lessons: 6,
      completedLongFormDomains: 4,
      completedLongFormLessons: 24,
      mappedTopics: 9,
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
      "hsk4-nature-technology-long-form-2026.07",
    );
  });

  it("rejects premature release and cross-paragraph evidence loss", () => {
    const bundle = loadHsk4SocietyEconomyLongFormPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.releaseEligible = true;
    const crossParagraph = pack.lessons[0].comprehensionItems[2];
    expect(crossParagraph.kind).toBe("cross-paragraph-evidence");
    crossParagraph.evidenceParagraphIds = [
      crossParagraph.evidenceParagraphIds[0],
    ];
    const result = validateHsk4SocietyEconomyLongFormPackBundle({
      ...bundle,
      pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 long-form content must remain learner-hidden",
      `${crossParagraph.itemId} comprehension item is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_SOCIETY_ECONOMY_LONG_FORM_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4SocietyEconomyLongFormPack(
        buildHsk4SocietyEconomyLongFormPack(),
      ),
    );
  });
});
