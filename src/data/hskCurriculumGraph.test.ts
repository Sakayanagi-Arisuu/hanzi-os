import { describe, expect, it } from "vitest";
import {
  getHskCurriculumView,
  getNextHskRealmPreview,
  getProgressingHskCurriculumView,
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

  it("advances a learner from HSK0 to HSK1 after all four foundation trials pass", () => {
    const view = getProgressingHskCurriculumView(
      "zero",
      new Set(["boot-1", "boot-2", "boot-3", "boot-4"]),
    );

    expect(view.path.pathId).toBe("hsk1");
    expect(view.visibleLessonIds).toContain("survival-1");
    expect(view.visibleLessonIds).toHaveLength(44);
  });

  it("does not advance while any lesson in the current target remains unpassed", () => {
    const view = getProgressingHskCurriculumView(
      "zero",
      new Set(["boot-1", "boot-2", "boot-3"]),
    );

    expect(view.path.pathId).toBe("hsk0");
    expect(view.visibleLessonIds).not.toContain("survival-1");
  });

  it.each([
    ["hsk1", "hsk2", 40],
    ["hsk2", "hsk3", 40],
    ["hsk3", "hsk4", 55],
  ] as const)("advances %s to %s after every target lesson passes", (startingLevel, expectedPath, targetCount) => {
    const current = getHskCurriculumView(startingLevel);
    expect(current.targetLessonIds).toHaveLength(targetCount);
    const view = getProgressingHskCurriculumView(
      startingLevel,
      new Set([...current.bridgeLessonIds, ...current.targetLessonIds]),
    );
    expect(view.path.pathId).toBe(expectedPath);
    expect(view.targetLessonIds.length).toBeGreaterThan(0);
  });

  it("derives the next-realm promise from the exact runtime target IDs", () => {
    const view = getHskCurriculumView("hsk1");
    const passed = new Set(view.targetLessonIds.slice(0, 13));
    expect(getNextHskRealmPreview(view, passed)).toEqual({
      pathId: "hsk2",
      lessonCount: 40,
      completedPrerequisiteCount: 13,
      remainingPrerequisiteCount: 27,
      progressPercent: 33,
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
