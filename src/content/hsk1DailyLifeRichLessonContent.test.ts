import { describe, expect, it } from "vitest";
import {
  loadHsk1DailyLifeRichLessonBundle,
  validateHsk1DailyLifeRichLessonBundle,
} from "./hsk1DailyLifeRichLessonContent.mjs";

describe("HSK1 daily-life rich lesson presentation", () => {
  it("surfaces every reviewed dialogue, grammar point, topic and task", async () => {
    const result = await validateHsk1DailyLifeRichLessonBundle(
      loadHsk1DailyLifeRichLessonBundle(),
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
      summary: {
        lessons: 4,
        dialogueTurns: 16,
        grammarPoints: 5,
        guidedGrammarPrompts: 5,
        topics: 10,
        tasks: 5,
        taskDialogueTurns: 20,
      },
    });
  });
});
