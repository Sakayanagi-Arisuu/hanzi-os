import { describe, expect, it } from "vitest";
import {
  getHskCurriculumView,
  resolveHskPlacement,
} from "./hskCurriculumGraph";

describe("learner HSK0-4 curriculum view", () => {
  it("exposes different released slices instead of one shared path", () => {
    const hsk0 = getHskCurriculumView("zero");
    const hsk1 = getHskCurriculumView("hsk1");
    const hsk2 = getHskCurriculumView("hsk2");
    const hsk3 = getHskCurriculumView("hsk3");
    const hsk4 = getHskCurriculumView("hsk4");

    expect(hsk0.targetLessonIds).toEqual([
      "boot-1",
      "boot-2",
      "boot-3",
      "boot-4",
    ]);
    expect(hsk0.bridgeLessonIds).toEqual([]);
    expect(hsk1.targetLessonIds).toHaveLength(40);
    expect(hsk1.bridgeLessonIds).toEqual(hsk0.targetLessonIds);
    expect(hsk1.visibleLessonIds).toHaveLength(44);
    expect(hsk2.targetLessonIds).toHaveLength(40);
    expect(hsk2.bridgeLessonIds).toHaveLength(44);
    expect(hsk2.visibleLessonIds).toHaveLength(84);
    expect(hsk2.targetContentAvailable).toBe(true);
    expect(hsk3.targetLessonIds).toHaveLength(55);
    expect(hsk3.bridgeLessonIds).toHaveLength(84);
    expect(hsk3.visibleLessonIds).toHaveLength(139);
    expect(hsk3.targetContentAvailable).toBe(true);
    expect(hsk4.targetLessonIds).toHaveLength(78);
    expect(hsk4.bridgeLessonIds).toHaveLength(139);
    expect(hsk4.visibleLessonIds).toHaveLength(217);
    expect(hsk4.targetContentAvailable).toBe(true);
  });

  it("keeps the legacy basic value on the HSK1 graph", () => {
    expect(getHskCurriculumView("basic").path.pathId).toBe("hsk1");
  });

  it("requires bridge evidence and ignores uncalibrated screening for unlocks", () => {
    const placement = resolveHskPlacement({
      startingLevel: "hsk1",
      diagnosticCompleted: true,
      passedLessonIds: new Set(),
    });

    expect(placement).toEqual({
      targetPathId: "hsk1",
      status: "prerequisite-evidence-required",
      diagnosticUse: "observed-only",
      recommendedLessonId: "boot-1",
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
    });
  });

  it("opens the first target lesson only after bridge evidence exists", () => {
    const placement = resolveHskPlacement({
      startingLevel: "hsk1",
      diagnosticCompleted: false,
      passedLessonIds: new Set(["boot-1", "boot-2", "boot-3", "boot-4"]),
    });

    expect(placement).toMatchObject({
      targetPathId: "hsk1",
      status: "target-ready",
      recommendedLessonId: "survival-1",
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
    });
  });

  it("requires prior-path evidence before the first HSK4 lesson", () => {
    expect(resolveHskPlacement({
      startingLevel: "hsk4",
      diagnosticCompleted: true,
      passedLessonIds: new Set(),
    })).toMatchObject({
      status: "prerequisite-evidence-required",
      diagnosticUse: "observed-only",
      recommendedLessonId: "boot-1",
      grantsMastery: false,
      grantsPrerequisiteWaiver: false,
    });
  });
});
