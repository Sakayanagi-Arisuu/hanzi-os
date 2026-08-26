import type { LearningState, StartingLevel } from "../types";

const clampObservedAccuracy = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

/**
 * Store a descriptive screening result without changing the learner's
 * self-declared starting level. The thresholds only choose a practice area;
 * they are not calibrated level or HSK cut scores.
 */
export const applyObservedDiagnosticCompletion = (
  state: LearningState,
  score: number,
  completedAt = new Date().toISOString(),
  activityId = `diagnostic:${completedAt}`,
): LearningState => {
  const normalizedScore = clampObservedAccuracy(score);
  const recommendedLessonId = normalizedScore >= 75
    ? "characters-1"
    : normalizedScore >= 50
      ? "daily-1"
      : normalizedScore >= 25
        ? "survival-1"
        : "boot-1";
  const activity: LearningState["activityLog"][number] = {
    id: activityId,
    type: "diagnostic",
    label: "Khảo nghiệm căn cơ",
    xp: 0,
    occurredAt: completedAt,
  };

  return {
    ...state,
    diagnostic: {
      completed: true,
      score: normalizedScore,
      recommendedLessonId,
      completedAt,
    },
    activityLog: [
      ...state.activityLog,
      activity,
    ].slice(-160),
  };
};

export const applySkippedDiagnostic = (
  state: LearningState,
  completedAt = new Date().toISOString(),
  activityId = `diagnostic-skip:${completedAt}`,
): LearningState => ({
  ...state,
  profile: {
    ...state.profile,
    startingLevel: "zero",
  },
  diagnostic: {
    completed: true,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt,
  },
  activityLog: [
    ...state.activityLog,
    {
      id: activityId,
      type: "diagnostic" as const,
      label: "Bỏ qua Khảo Nghiệm Căn Cơ · bắt đầu từ số 0",
      xp: 0,
      occurredAt: completedAt,
    },
  ].slice(-160),
});

export const applyAcceptedDiagnosticPlacement = (
  state: LearningState,
  startingLevel: Exclude<StartingLevel, "basic">,
  score: number,
  completedAt = new Date().toISOString(),
  activityId = `diagnostic-placement:${completedAt}`,
): LearningState => applyObservedDiagnosticCompletion({
  ...state,
  profile: {
    ...state.profile,
    startingLevel,
  },
}, score, completedAt, activityId);
