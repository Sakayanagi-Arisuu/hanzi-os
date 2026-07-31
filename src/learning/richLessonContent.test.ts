import { describe, expect, it } from "vitest";
import {
  getRichLessonContent,
  RICH_LESSON_DISCLOSURE,
} from "./richLessonContent";

describe("learner-facing rich lesson adapter", () => {
  it("exposes only the locally authorized HSK1 presentation", () => {
    const lesson = getRichLessonContent(
      "hsk1-time-place-events-02-calendar",
    );

    expect(lesson).not.toBeNull();
    expect(lesson).toMatchObject({
      dialogue: expect.arrayContaining([
        expect.objectContaining({ hanzi: "今天几月几号？" }),
      ]),
      grammar: expect.arrayContaining([
        expect.objectContaining({ id: "hsk1-grammar-row-001" }),
      ]),
      topics: [expect.objectContaining({ id: "hsk1-topic-003" })],
      tasks: [expect.objectContaining({ id: "hsk1-task-02" })],
    });
    expect(RICH_LESSON_DISCLOSURE.reviewVi).toContain("AI");
  });

  it("does not invent rich content for another released lesson", () => {
    expect(getRichLessonContent("survival-1")).toBeNull();
  });
});
