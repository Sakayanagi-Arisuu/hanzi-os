import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4PersonalCommunityLongFormPack,
  serializeHsk4PersonalCommunityLongFormPack,
} from "../../scripts/content/build-hsk4-personal-community-long-form-pack.mjs";
import {
  assertValidHsk4PersonalCommunityLongFormPackBundle,
  HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH,
  loadHsk4PersonalCommunityLongFormPackBundle,
  validateHsk4PersonalCommunityLongFormPackBundle,
} from "./hsk4PersonalCommunityLongFormPack.mjs";

describe("HSK4 personal/community long-form draft pack", () => {
  it("authors all six domain lessons with evidence-bound depth", () => {
    const bundle = loadHsk4PersonalCommunityLongFormPackBundle();
    const result =
      assertValidHsk4PersonalCommunityLongFormPackBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 6,
      completedLongFormDomains: 1,
      completedLongFormLessons: 6,
      mappedTopics: 27,
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
    expect(bundle.pack.lessons.every(
      (lesson: {
        texts: Array<{ paragraphs: unknown[] }>;
        comprehensionItems: Array<{
          evidenceParagraphIds: string[];
          kind: string;
          inferenceBoundaryVi: string | null;
        }>;
      }) =>
        lesson.texts.every((text) => text.paragraphs.length === 3)
        && lesson.comprehensionItems.every(
          (item) => item.evidenceParagraphIds.length > 0,
        )
        && lesson.comprehensionItems
          .filter((item) => item.kind === "bounded-inference")
          .every((item) => typeof item.inferenceBoundaryVi === "string"),
    )).toBe(true);
  });

  it("keeps audio, review, measurement and mastery fail-closed", () => {
    const { pack } = loadHsk4PersonalCommunityLongFormPackBundle();

    expect(pack).toMatchObject({
      learnerVisible: false,
      releaseEligible: false,
      coverageClaims: {
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
    expect(pack.lessons.every(
      (lesson: {
        texts: Array<{ kind: string; audio: null }>;
        reviewBatch: { state: string; approvals: unknown[] };
      }) =>
        lesson.texts.every((text) => text.audio === null)
        && lesson.reviewBatch.state === "pending"
        && lesson.reviewBatch.approvals.length === 0,
    )).toBe(true);
  });

  it("fails closed when evidence or visibility is weakened", () => {
    const bundle = loadHsk4PersonalCommunityLongFormPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.learnerVisible = true;
    pack.lessons[0].comprehensionItems[2].evidenceParagraphIds = [];

    const result = validateHsk4PersonalCommunityLongFormPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 long-form content must remain learner-hidden",
      `${pack.lessons[0].comprehensionItems[2].itemId} comprehension item is invalid`,
    ]));
  });

  it("keeps the generated artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_PERSONAL_COMMUNITY_LONG_FORM_RELATIVE_PATH,
      ),
      "utf8",
    );

    expect(checked).toBe(
      serializeHsk4PersonalCommunityLongFormPack(
        buildHsk4PersonalCommunityLongFormPack(),
      ),
    );
  });
});
