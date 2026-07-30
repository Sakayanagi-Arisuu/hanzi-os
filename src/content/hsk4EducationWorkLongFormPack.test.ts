import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4EducationWorkLongFormPack,
  serializeHsk4EducationWorkLongFormPack,
} from "../../scripts/content/build-hsk4-education-work-long-form-pack.mjs";
import {
  assertValidHsk4EducationWorkLongFormPackBundle,
  HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH,
  loadHsk4EducationWorkLongFormPackBundle,
  validateHsk4EducationWorkLongFormPackBundle,
} from "./hsk4EducationWorkLongFormPack.mjs";

describe("HSK4 education/work long-form draft pack", () => {
  it("authors six cumulative evidence-bound lessons", () => {
    const bundle = loadHsk4EducationWorkLongFormPackBundle();
    const result = assertValidHsk4EducationWorkLongFormPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 6,
      completedLongFormDomains: 2,
      completedLongFormLessons: 12,
      mappedTopics: 15,
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
    expect(bundle.prerequisiteBundles.map(
      (item: { pack: { packId: string } }) => item.pack.packId,
    )).toEqual(["hsk4-personal-community-long-form-2026.07"]);
  });

  it("keeps all learning claims fail-closed", () => {
    const { pack } = loadHsk4EducationWorkLongFormPackBundle();

    expect(pack).toMatchObject({
      learnerVisible: false,
      releaseEligible: false,
      coverageClaims: {
        completedLongFormDomains: 2,
        completedLongFormLessons: 12,
        fullHsk4VocabularyPracticeComplete: false,
        reviewedContentComplete: false,
        assessmentCoverageComplete: false,
        hsk4Complete: false,
      },
      counts: {
        reviewedAudioItems: 0,
        measurementEligibleItems: 0,
        masteryEligibleItems: 0,
        approvals: 0,
        releaseEligibleItems: 0,
      },
    });
  });

  it("rejects a stale prerequisite or unbounded inference", () => {
    const bundle = loadHsk4EducationWorkLongFormPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.prerequisitePacks[0].sha256 = "sha256:stale";
    const inference = pack.lessons[0].comprehensionItems.find(
      (item: { kind: string }) => item.kind === "bounded-inference",
    );
    inference.inferenceBoundaryVi = null;

    const result = validateHsk4EducationWorkLongFormPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 long-form source binding is stale",
      `${inference.itemId} comprehension item is invalid`,
    ]));
  });

  it("keeps the generated artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_EDUCATION_WORK_LONG_FORM_RELATIVE_PATH),
      "utf8",
    );

    expect(checked).toBe(
      serializeHsk4EducationWorkLongFormPack(
        buildHsk4EducationWorkLongFormPack(),
      ),
    );
  });
});
