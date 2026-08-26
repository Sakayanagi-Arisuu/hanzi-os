import { describe, expect, it } from "vitest";
import { COURSE_UNITS, LESSON_BY_ID } from "./curriculum";

describe("learner-facing curriculum language", () => {
  it("keeps the HSK0 lesson list in Vietnamese without changing stable IDs", () => {
    const bootLessons = COURSE_UNITS.find((unit) => unit.id === "boot")!.lessons;
    expect(bootLessons.map((lesson) => lesson.id)).toEqual([
      "boot-1",
      "boot-2",
      "boot-3",
      "boot-4",
    ]);
    expect(LESSON_BY_ID.get("boot-4")?.title).toBe("Cặp thanh điệu");
    expect(bootLessons.map((lesson) => lesson.title)).not.toContain("Tone pairs");
  });
});
