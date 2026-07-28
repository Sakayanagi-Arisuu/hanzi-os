import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk2LessonBlueprints,
  serializeHsk2LessonBlueprints,
} from "../../scripts/content/build-hsk2-lesson-blueprints.mjs";
import {
  assertValidHsk2LessonBlueprintsBundle,
  HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH,
  loadHsk2LessonBlueprintsBundle,
  validateHsk2LessonBlueprintsBundle,
} from "./hsk2LessonBlueprints.mjs";

describe("HSK2 lesson blueprint pack", () => {
  it("partitions the complete HSK2 scope across 40 distinct lessons", () => {
    const bundle = loadHsk2LessonBlueprintsBundle();
    const result = assertValidHsk2LessonBlueprintsBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 40,
      situationalDialogueLessons: 20,
      sentenceChainLessons: 10,
      shortTextProductionLessons: 10,
      taskBlueprintMappings: 17,
      topicBlueprintMappings: 34,
      vocabularyBlueprintMappings: 200,
      grammarBlueprintMappings: 75,
      recognitionCharacterBlueprintMappings: 125,
      authoredPracticeItems: 0,
      authoredAssessmentPrompts: 0,
      reviewBatches: 40,
      approvals: 0,
      releaseEligibleLessons: 0,
    });
    expect(bundle.pack.lessons[0]).toMatchObject({
      lessonId: "hsk2-person-events-environment-lesson-01",
      sequence: 1,
      unitId: "hsk2-situational-dialogue",
      prerequisiteLessonIds: [],
    });
    expect(bundle.pack.lessons[39]).toMatchObject({
      lessonId: "hsk2-picture-description-lesson-02",
      sequence: 40,
      unitId: "hsk2-short-text-production",
      prerequisiteLessonIds: ["hsk2-picture-description-lesson-01"],
    });
  });

  it("keeps practice, scoring, review and release explicitly pending", () => {
    const { pack } = loadHsk2LessonBlueprintsBundle();

    expect(pack.lessons.every(
      (lesson: {
        practicePlan: { authoredItemCount: number; masteryEligible: boolean };
        assessmentPlan: { rubric: null; authoredPromptCount: number };
        review: string;
        releaseEligible: boolean;
      }) =>
        lesson.practicePlan.authoredItemCount === 0
        && lesson.practicePlan.masteryEligible === false
        && lesson.assessmentPlan.rubric === null
        && lesson.assessmentPlan.authoredPromptCount === 0
        && lesson.review === "pending"
        && lesson.releaseEligible === false,
    )).toBe(true);
    expect(pack).toMatchObject({
      learnerVisible: false,
      releaseEligible: false,
    });
  });

  it("fails closed on duplicate mapping or premature visibility", () => {
    const bundle = loadHsk2LessonBlueprintsBundle();
    const pack = structuredClone(bundle.pack);
    pack.learnerVisible = true;
    pack.lessons[1].inventoryMappings.vocabularyIds.push(
      pack.lessons[0].inventoryMappings.vocabularyIds[0],
    );

    const result = validateHsk2LessonBlueprintsBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK2 lesson blueprints must remain learner-hidden drafts",
      "lesson vocabulary mappings must exactly partition its HSK2 scope",
    ]));
  });

  it("keeps the generated blueprint artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK2_LESSON_BLUEPRINTS_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk2LessonBlueprints(buildHsk2LessonBlueprints()),
    );
  });
});
