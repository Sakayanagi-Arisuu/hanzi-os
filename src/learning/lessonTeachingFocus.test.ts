import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "../data/curriculum";
import {
  MAX_LESSON_TEACHING_WORDS,
  selectLessonTeachingWordIds,
} from "./lessonTeachingFocus";

describe("selectLessonTeachingWordIds", () => {
  const lessonWordIds = Array.from({ length: 20 }, (_, index) => `word-${index + 1}`);

  it("keeps an unopened lesson preview cognitively bounded", () => {
    expect(selectLessonTeachingWordIds(lessonWordIds)).toEqual(
      lessonWordIds.slice(0, MAX_LESSON_TEACHING_WORDS),
    );
  });

  it("uses the exact unique words from a frozen session form", () => {
    expect(selectLessonTeachingWordIds(lessonWordIds, [
      "word-12",
      "word-3",
      "word-12",
      undefined,
      "not-in-lesson",
    ])).toEqual(["word-12", "word-3"]);
  });

  it("bounds the largest current source lesson without deleting its inventory", () => {
    const largest = [...LESSON_BY_ID.values()].sort(
      (left, right) => right.wordIds.length - left.wordIds.length,
    )[0];
    const before = [...largest.wordIds];
    const focus = selectLessonTeachingWordIds(largest.wordIds);

    expect(largest.wordIds.length).toBeGreaterThan(MAX_LESSON_TEACHING_WORDS);
    expect(focus).toHaveLength(MAX_LESSON_TEACHING_WORDS);
    expect(largest.wordIds).toEqual(before);
  });
});
