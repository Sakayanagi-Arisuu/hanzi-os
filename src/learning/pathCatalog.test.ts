import { describe, expect, it } from "vitest";
import { COURSE_UNITS } from "../data/curriculum";
import { isLessonReleased } from "../lib/adaptive";
import { groupCourseUnitsByHsk } from "./pathCatalog";

describe("Thiên Lộ full lesson catalog", () => {
  const groups = groupCourseUnitsByHsk(COURSE_UNITS.map((unit) => ({
    ...unit,
    lessons: unit.lessons.filter(isLessonReleased),
  })));

  it("keeps every HSK0-HSK4 realm visible independent of unlock", () => {
    expect(groups.map((group) => group.path.id)).toEqual([
      "hsk0",
      "hsk1",
      "hsk2",
      "hsk3",
      "hsk4",
    ]);
  });

  it("preserves the learner inventory instead of filtering to the active realm", () => {
    expect(groups.map((group) => group.units.flatMap((unit) => unit.lessons).length))
      .toEqual([4, 40, 40, 55, 78]);
    expect(groups.flatMap((group) => group.units).flatMap((unit) => unit.lessons))
      .toHaveLength(217);
  });
});
