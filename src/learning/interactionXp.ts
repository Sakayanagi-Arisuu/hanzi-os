import { LESSON_BY_ID } from "../data/curriculum";
import type { AuthoritativeReleasedLessonProgressV1 } from "./authoritativeProgress";
import type { StudyEvent } from "../types";

export const INTERACTION_XP_POLICY_VERSION = "lesson-first-clear-v1" as const;
export const REVIEW_INTERACTION_XP = 5 as const;
export const LESSON_REWARD_CLAIM_STARTED_AT = Date.parse(
  "2026-08-19T12:40:00.000Z",
);

export const lessonRewardActivityId = (lessonId: string) =>
  `lesson-reward:${lessonId}`;

export const isLocalLessonRewardClaimed = (input: {
  lessonId: string;
  lessonTitle: string;
  lessonXp: number;
  completedAt?: string;
  activityLog: readonly StudyEvent[];
}) => {
  const completedAt = input.completedAt ? Date.parse(input.completedAt) : Number.NaN;
  if (Number.isFinite(completedAt) && completedAt < LESSON_REWARD_CLAIM_STARTED_AT) {
    return true;
  }
  return input.activityLog.some((event) =>
    event.type === "lesson"
    && event.xp === input.lessonXp
    && (
      event.id === lessonRewardActivityId(input.lessonId)
      // Legacy local rewards used random activity IDs and the lesson title.
      || event.label === input.lessonTitle
    )
  );
};

export type AuthoritativeInteractionXp = {
  policyVersion: typeof INTERACTION_XP_POLICY_VERSION;
  totalXp: number;
  rewardedLessonCount: number;
};

export const calculateLessonFirstClearXp = ({
  lessonXp,
  gateScore,
  previousBestScore,
}: {
  lessonXp: number;
  gateScore: number;
  previousBestScore?: number;
}) => Number.isSafeInteger(lessonXp)
  && lessonXp >= 0
  && Number.isFinite(gateScore)
  && gateScore >= 70
  && (previousBestScore ?? 0) < 70
    ? lessonXp
    : 0;

/**
 * Account XP is reconstructed from the same server-owned pass projection that
 * unlocks Thiên Lộ. Each released lesson contributes its catalog reward once;
 * failed runs and replays cannot inflate the total.
 */
export const deriveAuthoritativeInteractionXp = (
  progress: AuthoritativeReleasedLessonProgressV1 | null | undefined,
): AuthoritativeInteractionXp | null => {
  if (!progress) return null;

  let totalXp = 0;
  let rewardedLessonCount = 0;
  for (const entry of progress.lessons) {
    if (!entry.passed) continue;
    const lesson = LESSON_BY_ID.get(entry.lessonId);
    if (
      !lesson
      || entry.lessonVersion !== `${lesson.contentVersion}:${lesson.id}:1`
      || !Number.isSafeInteger(lesson.xp)
      || lesson.xp < 0
    ) return null;
    totalXp += lesson.xp;
    rewardedLessonCount += 1;
  }

  if (!Number.isSafeInteger(totalXp)) return null;
  return {
    policyVersion: INTERACTION_XP_POLICY_VERSION,
    totalXp,
    rewardedLessonCount,
  };
};
