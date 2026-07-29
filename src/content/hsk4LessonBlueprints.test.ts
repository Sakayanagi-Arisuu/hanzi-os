import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4LessonBlueprints,
  serializeHsk4LessonBlueprints,
} from "../../scripts/content/build-hsk4-lesson-blueprints.mjs";
import {
  assertValidHsk4LessonBlueprintsBundle,
  HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH,
  loadHsk4LessonBlueprintsBundle,
  validateHsk4LessonBlueprintsBundle,
} from "./hsk4LessonBlueprints.mjs";

describe("HSK4 differentiated lesson blueprint pack", () => {
  it("partitions every official HSK4 inventory item across 78 lessons", () => {
    const bundle = loadHsk4LessonBlueprintsBundle();
    const result = assertValidHsk4LessonBlueprintsBundle(bundle);
    const summary = result.summary;
    if (!summary) throw new Error("Validated HSK4 summary is missing");

    expect(summary).toMatchObject({
      lessons: 78,
      deepComprehensionLessons: 36,
      summaryArgumentLessons: 24,
      timedIntegrationLessons: 18,
      taskBlueprintMappings: 30,
      topicBlueprintMappings: 77,
      vocabularyBlueprintMappings: 1_000,
      grammarBlueprintMappings: 95,
      recognitionCharacterBlueprintMappings: 441,
      timedLessonBlueprints: 9,
      plannedMinimumPromptUnits: 106,
      authoredPracticeItems: 0,
      authoredAssessmentPrompts: 0,
      reviewBatches: 78,
      approvals: 0,
      releaseEligibleLessons: 0,
    });
    expect(
      summary.sourceSenseKeywordMatches
      + summary.foundationFallbackVocabulary,
    ).toBe(1_000);
    expect(bundle.pack.lessons[0]).toMatchObject({
      lessonId: "hsk4-personal-community-analysis-concept-actor-map",
      sequence: 1,
      unitId: "hsk4-deep-comprehension",
      prerequisiteLessonIds: [],
    });
    expect(bundle.pack.lessons[77]).toMatchObject({
      lessonId: "hsk4-timed-sectional-rehearsal-lesson-03",
      sequence: 78,
      prerequisiteLessonIds: [
        "hsk4-timed-sectional-rehearsal-lesson-02",
      ],
    });
  });

  it("labels semantic fallback and all timed plans honestly", () => {
    const { pack } = loadHsk4LessonBlueprintsBundle();
    const fallbacks = pack.vocabularyAssignments.filter(
      (assignment: { method: string }) =>
        assignment.method === "cross-domain-foundation-fallback",
    );
    const timed = pack.lessons.filter(
      (lesson: { promptPlan?: { timed: boolean } }) =>
        lesson.promptPlan?.timed === true,
    );

    expect(fallbacks.every(
      (assignment: { score: number; matchedSignal: null }) =>
        assignment.score === 0 && assignment.matchedSignal === null,
    )).toBe(true);
    expect(timed).toHaveLength(9);
    expect(timed.every(
      (lesson: {
        assessmentPlan: { timedEvidenceRequired: boolean };
        practicePlan: { authoredItemCount: number };
      }) =>
        lesson.assessmentPlan.timedEvidenceRequired === true
        && lesson.practicePlan.authoredItemCount === 0,
    )).toBe(true);
    expect(pack.classificationPolicy).toMatchObject({
      fallbackClaimsSemanticMatch: false,
      sourceCoverageGapClaimsSemanticMatch: false,
      humanSemanticReviewRequired: true,
    });
  });

  it("keeps review, calibration, visibility and mastery pending", () => {
    const { pack } = loadHsk4LessonBlueprintsBundle();

    expect(pack.lessons.every(
      (lesson: {
        practicePlan: {
          measurementEligible: boolean;
          masteryEligible: boolean;
        };
        assessmentPlan: { rubric: null; authoredPromptCount: number };
        review: string;
        releaseEligible: boolean;
      }) =>
        lesson.practicePlan.measurementEligible === false
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
        calibratedMockComplete: false,
        hsk4Complete: false,
      },
    });
  });

  it("fails closed on duplicate mapping or premature completion", () => {
    const bundle = loadHsk4LessonBlueprintsBundle();
    const pack = structuredClone(bundle.pack);
    pack.coverageClaims.hsk4Complete = true;
    pack.lessons[1].inventoryMappings.vocabularyIds.push(
      pack.lessons[0].inventoryMappings.vocabularyIds[0],
    );

    const result = validateHsk4LessonBlueprintsBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK4 lesson-blueprint coverage claims are invalid",
      "lesson vocabulary mappings must exactly partition its HSK4 scope",
    ]));
  });

  it("keeps the generated HSK4 blueprint artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK4_LESSON_BLUEPRINTS_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4LessonBlueprints(buildHsk4LessonBlueprints()),
    );
  });
});
