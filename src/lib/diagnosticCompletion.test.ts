import { describe, expect, it } from "vitest";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import { applyObservedDiagnosticCompletion } from "./diagnosticCompletion";

describe("diagnostic completion", () => {
  it("never maps an uncalibrated screening score into a declared level", () => {
    const state = structuredClone(INITIAL_LEARNING_STATE);
    state.profile.startingLevel = "basic";

    const result = applyObservedDiagnosticCompletion(
      state,
      100,
      "2026-07-22T06:00:00.000Z",
      "diagnostic:test",
    );

    expect(result.profile.startingLevel).toBe("basic");
    expect(result.diagnostic).toEqual({
      completed: true,
      score: 100,
      recommendedLessonId: "characters-1",
      completedAt: "2026-07-22T06:00:00.000Z",
    });
  });

  it("clamps descriptive accuracy and only records a zero-XP activity", () => {
    const result = applyObservedDiagnosticCompletion(
      structuredClone(INITIAL_LEARNING_STATE),
      -20,
      "2026-07-22T06:00:00.000Z",
      "diagnostic:test",
    );

    expect(result.diagnostic.score).toBe(0);
    expect(result.diagnostic.recommendedLessonId).toBe("boot-1");
    expect(result.activityLog.at(-1)).toMatchObject({
      id: "diagnostic:test",
      type: "diagnostic",
      xp: 0,
    });
  });
});
