import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3LessonBlueprints,
  serializeHsk3LessonBlueprints,
} from "../../scripts/content/build-hsk3-lesson-blueprints.mjs";
import {
  assertValidHsk3LessonBlueprintsBundle,
  HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH,
  loadHsk3LessonBlueprintsBundle,
  validateHsk3LessonBlueprintsBundle,
} from "./hsk3LessonBlueprints.mjs";

describe("HSK3 differentiated lesson blueprint pack", () => {
  it("partitions every official HSK3 inventory item across 55 lessons", () => {
    const bundle = loadHsk3LessonBlueprintsBundle();
    const result = assertValidHsk3LessonBlueprintsBundle(bundle);
    const summary = result.summary;
    if (!summary) throw new Error("Validated HSK3 summary is missing");

    expect(summary).toMatchObject({
      lessons: 55,
      paragraphInputLessons: 25,
      narrationGrammarLessons: 15,
      guidedProductionLessons: 15,
      taskBlueprintMappings: 22,
      topicBlueprintMappings: 54,
      vocabularyBlueprintMappings: 500,
      grammarBlueprintMappings: 96,
      recognitionCharacterBlueprintMappings: 284,
      plannedMinimumPromptUnits: 92,
      authoredPracticeItems: 0,
      authoredAssessmentPrompts: 0,
      reviewBatches: 55,
      approvals: 0,
      releaseEligibleLessons: 0,
    });
    expect(
      summary.sourceSenseKeywordMatches
      + summary.foundationFallbackVocabulary,
    ).toBe(500);
    expect(
      summary.charactersWithIncrementalVocabularyContext
      + summary.charactersWithoutIncrementalVocabularyContext,
    ).toBe(284);
    expect(bundle.pack.lessons[0]).toMatchObject({
      lessonId:
        "hsk3-personal-life-narratives-identity-transactions",
      sequence: 1,
      unitId: "hsk3-paragraph-input",
      prerequisiteLessonIds: [],
    });
    expect(bundle.pack.lessons[54]).toMatchObject({
      lessonId: "hsk3-structured-explanation-lesson-03",
      sequence: 55,
      prerequisiteLessonIds: [
        "hsk3-structured-explanation-lesson-02",
      ],
    });
  });

  it("records semantic evidence and labels every foundation fallback honestly", () => {
    const { pack } = loadHsk3LessonBlueprintsBundle();
    const semantic = pack.vocabularyAssignments.filter(
      (assignment: { method: string }) =>
        assignment.method === "source-sense-keyword-match",
    );
    const fallbacks = pack.vocabularyAssignments.filter(
      (assignment: { method: string }) =>
        assignment.method === "cross-domain-foundation-fallback",
    );

    expect(semantic.length).toBeGreaterThan(100);
    expect(semantic.every(
      (assignment: { score: number; matchedSignal: string }) =>
        assignment.score > 0 && assignment.matchedSignal.length > 0,
    )).toBe(true);
    expect(fallbacks.every(
      (assignment: { score: number; matchedSignal: null }) =>
        assignment.score === 0 && assignment.matchedSignal === null,
    )).toBe(true);
    expect(pack.classificationPolicy).toMatchObject({
      fallbackClaimsSemanticMatch: false,
      humanSemanticReviewRequired: true,
    });
  });

  it("keeps practice, rubrics, review, visibility and mastery pending", () => {
    const { pack } = loadHsk3LessonBlueprintsBundle();

    expect(pack.lessons.every(
      (lesson: {
        practicePlan: {
          authoredItemCount: number;
          measurementEligible: boolean;
          masteryEligible: boolean;
        };
        assessmentPlan: { rubric: null; authoredPromptCount: number };
        review: string;
        releaseEligible: boolean;
      }) =>
        lesson.practicePlan.authoredItemCount === 0
        && lesson.practicePlan.measurementEligible === false
        && lesson.practicePlan.masteryEligible === false
        && lesson.assessmentPlan.rubric === null
        && lesson.assessmentPlan.authoredPromptCount === 0
        && lesson.review === "pending"
        && lesson.releaseEligible === false,
    )).toBe(true);
    expect(pack).toMatchObject({
      learnerVisible: false,
      releaseEligible: false,
      coverageClaims: {
        reviewedContentComplete: false,
        hsk3Complete: false,
      },
    });
  });

  it("fails closed on duplicate mapping or premature release state", () => {
    const bundle = loadHsk3LessonBlueprintsBundle();
    const pack = structuredClone(bundle.pack);
    pack.learnerVisible = true;
    pack.lessons[1].inventoryMappings.vocabularyIds.push(
      pack.lessons[0].inventoryMappings.vocabularyIds[0],
    );

    const result = validateHsk3LessonBlueprintsBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 lesson blueprints must remain learner-hidden drafts",
      "lesson vocabulary mappings must exactly partition its HSK3 scope",
    ]));
  });

  it("keeps the generated HSK3 blueprint artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_LESSON_BLUEPRINTS_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3LessonBlueprints(buildHsk3LessonBlueprints()),
    );
  });
});
