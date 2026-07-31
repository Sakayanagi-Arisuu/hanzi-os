import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "../data/curriculum";
import {
  loadHsk1RichLessonContentBundle,
  validateHsk1RichLessonContentBundle,
} from "./hsk1RichLessonContent.mjs";

describe("HSK1 rich local-study lesson presentation", () => {
  it("projects every reviewed dialogue, grammar point, topic and task", async () => {
    const bundle = loadHsk1RichLessonContentBundle();
    const result = await validateHsk1RichLessonContentBundle(bundle);

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        lessons: 6,
        dialogueTurns: 24,
        grammarPoints: 25,
        guidedGrammarPrompts: 25,
        topics: 3,
        tasks: 3,
        taskDialogueTurns: 12,
      },
    });
    expect(bundle.presentation.lessons.every((lesson: { lessonId: string }) =>
      LESSON_BY_ID.has(lesson.lessonId)
    )).toBe(true);
    expect(bundle.presentation.policy).toMatchObject({
      learnerVisibleForPersonalLocalStudy: true,
      humanReviewed: false,
      browserTtsPracticeOnly: true,
      measurementEligible: false,
      masteryEligible: false,
      productionEligible: false,
      sitesAuthorized: false,
    });
  });

  it("fails closed when a grammar explanation drifts", async () => {
    const bundle = loadHsk1RichLessonContentBundle();
    bundle.presentation.lessons[0].grammar[0].explanationVi = "tampered";

    const result = await validateHsk1RichLessonContentBundle(bundle);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "HSK1 rich lesson presentation does not match exact sources",
    );
  });
});
