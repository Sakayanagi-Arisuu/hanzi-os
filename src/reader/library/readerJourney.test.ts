import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "../../data/curriculum";
import { selectReaderJourneyDestination } from "./readerJourney";

describe("selectReaderJourneyDestination", () => {
  it("prefers the chapter explicitly bound to the anchor lesson", () => {
    const lesson = LESSON_BY_ID.get("hsk2-aspect-time-experience-lesson-01");
    expect(lesson).toBeDefined();

    expect(selectReaderJourneyDestination(lesson!)).toEqual({
      seriesId: "jade-lantern-archive",
      chapterId: "jade-lantern-archive-c01",
      relationship: "exact-lesson",
    });
  });

  it("returns no destination when neither lesson binding nor vocabulary overlaps", () => {
    const lesson = LESSON_BY_ID.get("boot-1");
    expect(lesson).toBeDefined();

    expect(selectReaderJourneyDestination({
      ...lesson!,
      id: "test-unbound-lesson",
      wordIds: ["test-unreleased-word"],
    })).toBeNull();
  });
});
