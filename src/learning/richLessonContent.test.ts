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

  it("exposes rich dialogue, grammar and tasks for personal exchange", () => {
    expect(getRichLessonContent("survival-1")).toMatchObject({
      dialogue: expect.arrayContaining([
        expect.objectContaining({ hanzi: "你好！" }),
      ]),
      grammar: expect.arrayContaining([
        expect.objectContaining({ id: "hsk1-grammar-row-026" }),
      ]),
      tasks: [expect.objectContaining({ id: "hsk1-task-06" })],
    });
  });

  it("exposes the corrected daily-life lesson presentation", () => {
    const lesson = getRichLessonContent("daily-1");

    expect(lesson).toMatchObject({
      dialogue: expect.arrayContaining([
        expect.objectContaining({ hanzi: "我要一点儿。" }),
      ]),
      grammar: expect.arrayContaining([
        expect.objectContaining({ id: "hsk1-grammar-row-012" }),
      ]),
      topics: [expect.objectContaining({ id: "hsk1-topic-017" })],
      tasks: [expect.objectContaining({ id: "hsk1-task-09" })],
    });
    expect(getRichLessonContent("daily-2")?.grammar).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "hsk1-grammar-row-007" }),
      ]),
    );
  });
});
