import type { LearningState } from "../types";

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
