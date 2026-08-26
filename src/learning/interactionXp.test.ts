import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, LESSON_BY_ID } from "../data/curriculum";
import type { AuthoritativeReleasedLessonProgressV1 } from "./authoritativeProgress";
import {
  calculateLessonFirstClearXp,
  deriveAuthoritativeInteractionXp,
  isLocalLessonRewardClaimed,
  lessonRewardActivityId,
  LESSON_REWARD_CLAIM_STARTED_AT,
} from "./interactionXp";

const progress = (): AuthoritativeReleasedLessonProgressV1 => ({
  schemaVersion: 1,
  resetEpoch: 0,
  cursor: 3,
  enrollmentId: "enrollment-a",
  courseId: "hanzi-os-core",
  contentVersion: CONTENT_VERSION,
  manifestSha256: `sha256:${"a".repeat(64)}`,
  completedCount: 3,
  totalCount: 4,
  remainingCount: 1,
  progress: 75,
  lessons: ["boot-1", "boot-2", "boot-3", "boot-4"].map((lessonId, index) => ({
    lessonId,
    lessonVersion: `${CONTENT_VERSION}:${lessonId}:1`,
    prerequisiteIds: index === 0 ? [] : [`boot-${index}`],
    releaseState: "beta" as const,
    passed: index < 3,
    unlocked: true,
    status: index < 3 ? "passed" as const : "unlocked" as const,
  })),
  nextLesson: {
    lessonId: "boot-4",
    lessonVersion: `${CONTENT_VERSION}:boot-4:1`,
    reason: "prerequisites-satisfied",
  },
});

describe("authoritative interaction XP", () => {
  it("uses the same first-clear rule for guest lessons", () => {
    expect(calculateLessonFirstClearXp({
      lessonXp: 40,
      gateScore: 100,
    })).toBe(40);
    expect(calculateLessonFirstClearXp({
      lessonXp: 40,
      gateScore: 100,
      previousBestScore: 70,
    })).toBe(0);
    expect(calculateLessonFirstClearXp({
      lessonXp: 40,
      gateScore: 60,
    })).toBe(0);
  });

  it("adds each passed lesson reward exactly once", () => {
    const result = deriveAuthoritativeInteractionXp(progress());
    const expected = ["boot-1", "boot-2", "boot-3"]
      .reduce((sum, id) => sum + LESSON_BY_ID.get(id)!.xp, 0);
    expect(result).toMatchObject({
      totalXp: expected,
      rewardedLessonCount: 3,
    });
  });

  it("fails closed when the projected lesson version is not current", () => {
    const value = progress();
    value.lessons[0]!.lessonVersion = "stale:boot-1:1";
    expect(deriveAuthoritativeInteractionXp(value)).toBeNull();
  });

  it("distinguishes a pending local chest from legacy and claimed rewards", () => {
    const lesson = LESSON_BY_ID.get("boot-4")!;
    const base = {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonXp: lesson.xp,
      activityLog: [],
    };
    expect(isLocalLessonRewardClaimed({
      ...base,
      completedAt: new Date(LESSON_REWARD_CLAIM_STARTED_AT + 1_000).toISOString(),
    })).toBe(false);
    expect(isLocalLessonRewardClaimed({
      ...base,
      completedAt: new Date(LESSON_REWARD_CLAIM_STARTED_AT - 1_000).toISOString(),
    })).toBe(true);
    expect(isLocalLessonRewardClaimed({
      ...base,
      completedAt: new Date(LESSON_REWARD_CLAIM_STARTED_AT + 1_000).toISOString(),
      activityLog: [{
        id: lessonRewardActivityId(lesson.id),
        type: "lesson",
        label: lesson.title,
        xp: lesson.xp,
        occurredAt: new Date().toISOString(),
      }],
    })).toBe(true);
  });
});
