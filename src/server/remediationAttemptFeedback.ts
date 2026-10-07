import { RELEASED_LESSONS } from "../data/curriculum";
import type { LearningAttemptCommandV1 } from "../learning/attemptProtocol";
import { buildExerciseCatalog } from "../lib/exerciseGeneration";
import { getAuthoritativeLessonAnswer } from "./authoritativeItemBank";
import { remediationLessonSupport } from "./remediationLessonSupport";

/** Receipt-only explanation, resolved after scoring and attempt-context validation. */
export const remediationAttemptFeedback = (command: LearningAttemptCommandV1) => {
  if (command.source !== "mistake") return undefined;
  const separator = command.activityId.indexOf(":");
  if (separator <= 0) return undefined;
  const lessonId = command.activityId.slice(0, separator);
  const questionId = command.activityId.slice(separator + 1);
  const answer = getAuthoritativeLessonAnswer(lessonId, questionId);
  if (!answer || answer.activityVersion !== command.activityVersion
    || answer.method !== command.method) return undefined;
  const lesson = RELEASED_LESSONS.find(candidate => candidate.id === lessonId);
  const exercise = lesson
    ? buildExerciseCatalog(lesson, "simplified", () => 0.5).find(candidate =>
      candidate.id === questionId && candidate.activityVersion === command.activityVersion)
    : undefined;
  return exercise ? {
    correctAnswer: exercise.correct,
    explanation: remediationLessonSupport(exercise)?.explanation ?? exercise.explanation,
  } : undefined;
};
