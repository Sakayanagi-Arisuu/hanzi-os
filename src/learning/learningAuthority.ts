import {
  getActivePathReleasedLessons,
  getReleasedLessonProgress,
  isLessonPassed,
  isLessonUnlocked,
} from "../lib/adaptive";
import type { LearningState } from "../types";
import type { AuthoritativeReleasedLessonProgressV1 } from "./authoritativeProgress";
import type { NormalizedLearningProjectionV1 } from "./projectionProtocol";

export type LearningAuthorityLessonView = {
  lessonId: string;
  status: "locked" | "unlocked" | "passed";
  passed: boolean;
  unlocked: boolean;
  bestScore: number | null;
};

export type LearningPathAuthorityView = {
  mode: "anonymous" | "authoritative";
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  progress: number;
  nextLessonId: string | null;
  lessons: ReadonlyMap<string, LearningAuthorityLessonView>;
};

export type LearningPathAuthorityResolution =
  | { state: "ready"; view: LearningPathAuthorityView }
  | { state: "blocked" };

/**
 * Chooses the only progress model allowed to drive navigation. Authenticated
 * callers never fall back to browser-authored completion, XP, or mastery.
 */
export const resolveLearningPathAuthority = ({
  authenticated,
  localState,
  projection,
  authoritativeProgress,
}: {
  authenticated: boolean;
  localState: LearningState;
  projection: NormalizedLearningProjectionV1 | null;
  authoritativeProgress: AuthoritativeReleasedLessonProgressV1 | null;
}): LearningPathAuthorityResolution => {
  if (!authenticated) {
    const progress = getReleasedLessonProgress(localState);
    const activeLessons = getActivePathReleasedLessons(
      localState.profile.startingLevel,
    );
    const lessons = new Map(activeLessons.map((lesson) => {
      const passed = isLessonPassed(lesson, localState);
      const unlocked = passed || isLessonUnlocked(lesson, localState);
      return [lesson.id, {
        lessonId: lesson.id,
        passed,
        unlocked,
        status: passed ? "passed" : unlocked ? "unlocked" : "locked",
        bestScore: localState.completedLessons[lesson.id]?.bestScore ?? null,
      } satisfies LearningAuthorityLessonView];
    }));
    return {
      state: "ready",
      view: {
        mode: "anonymous",
        ...progress,
        nextLessonId: activeLessons.find((lesson) => {
          const item = lessons.get(lesson.id);
          return item?.unlocked && !item.passed;
        })?.id ?? null,
        lessons,
      },
    };
  }

  if (!projection || !authoritativeProgress || projection.enrollment === null) {
    return { state: "blocked" };
  }
  if (
    authoritativeProgress.resetEpoch !== projection.resetEpoch
    || authoritativeProgress.cursor !== projection.cursor
    || authoritativeProgress.enrollmentId !== projection.enrollment.enrollmentId
    || authoritativeProgress.contentVersion !== projection.contentVersion
    || authoritativeProgress.manifestSha256 !== projection.manifestSha256
  ) return { state: "blocked" };

  const submittedBestScores = new Map(projection.submittedLessons.map(
    (summary) => [summary.lessonId, summary.bestGateScore],
  ));
  const lessons = new Map(authoritativeProgress.lessons.map((lesson) => [
    lesson.lessonId,
    {
      lessonId: lesson.lessonId,
      status: lesson.status,
      passed: lesson.passed,
      unlocked: lesson.unlocked,
      bestScore: submittedBestScores.get(lesson.lessonId) ?? null,
    } satisfies LearningAuthorityLessonView,
  ]));
  return {
    state: "ready",
    view: {
      mode: "authoritative",
      completedCount: authoritativeProgress.completedCount,
      totalCount: authoritativeProgress.totalCount,
      remainingCount: authoritativeProgress.remainingCount,
      progress: authoritativeProgress.progress,
      nextLessonId: authoritativeProgress.nextLesson?.lessonId ?? null,
      lessons,
    },
  };
};
