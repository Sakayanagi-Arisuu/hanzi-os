import { describe, expect, it } from "vitest";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import {
  applyObservedDiagnosticCompletion,
  applyAcceptedDiagnosticPlacement,
  applySkippedDiagnostic,
} from "./diagnosticCompletion";

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

  it("records an explicit beginner skip without pretending a scored attempt", () => {
    const result = applySkippedDiagnostic(
      structuredClone(INITIAL_LEARNING_STATE),
      "2026-08-11T05:00:00.000Z",
      "diagnostic-skip:test",
    );

    expect(result.diagnostic).toEqual({
      completed: true,
      score: 0,
      recommendedLessonId: "boot-1",
      completedAt: "2026-08-11T05:00:00.000Z",
    });
    expect(result.profile.startingLevel).toBe("zero");
    expect(result.activityLog.at(-1)).toMatchObject({
      id: "diagnostic-skip:test",
      label: "Bỏ qua Khảo Nghiệm Căn Cơ · bắt đầu từ số 0",
      xp: 0,
    });
  });

  it("accepts a verified starting level and diagnostic disposition atomically", () => {
    const result = applyAcceptedDiagnosticPlacement(
      structuredClone(INITIAL_LEARNING_STATE),
      "hsk2",
      75,
      "2026-08-11T06:00:00.000Z",
      "diagnostic-placement:test",
    );

    expect(result.profile.startingLevel).toBe("hsk2");
    expect(result.diagnostic).toMatchObject({ completed: true, score: 75 });
    expect(result.activityLog.at(-1)?.id).toBe("diagnostic-placement:test");
  });
});
