import { describe, expect, it } from "vitest";
import {
  applyLearningJourneyReceipt,
  createIntegratedJourneyCheckpoint,
  parseIntegratedJourneyCheckpoint,
  selectAuthoritativeJourneyAnchor,
} from "./integratedJourney";

describe("integrated learning journey checkpoint", () => {
  const create = () => createIntegratedJourneyCheckpoint({
    scopeKey: "anonymous:test:0",
    goal: "conversation",
    anchorLessonId: "boot-1",
    now: "2026-08-26T01:00:00.000Z",
  });

  it("uses the first authoritative unlocked lesson when nextLesson is absent", () => {
    expect(selectAuthoritativeJourneyAnchor({
      nextLesson: null,
      lessons: [
        { lessonId: "boot-1", unlocked: true, passed: false },
        { lessonId: "boot-2", unlocked: false, passed: false },
      ],
    })).toBe("boot-1");
  });

  it("accepts one ordered, idempotent Learn → Review → Transfer → Close cycle", () => {
    const learn = applyLearningJourneyReceipt(create(), {
      stage: "learn",
      source: "lesson",
      lessonId: "boot-1",
      activityId: "lesson-session:1",
      occurredAt: "2026-08-26T01:05:00.000Z",
    });
    expect(learn.state).toBe("accepted");
    const review = applyLearningJourneyReceipt(learn.checkpoint, {
      stage: "review",
      source: "review",
      lessonId: "boot-1",
      activityId: "review-session:1",
    });
    const transfer = applyLearningJourneyReceipt(review.checkpoint, {
      stage: "transfer",
      source: "pronunciation",
      lessonId: "boot-1",
      activityId: "pronunciation-session:1",
    });
    const close = applyLearningJourneyReceipt(transfer.checkpoint, {
      stage: "close",
      source: "path",
      lessonId: "boot-1",
      activityId: "path-close:1",
    });

    expect(close.state).toBe("accepted");
    expect(Object.keys(close.checkpoint.completedStages)).toEqual([
      "learn",
      "review",
      "transfer",
      "close",
    ]);
    expect(applyLearningJourneyReceipt(close.checkpoint, {
      stage: "close",
      source: "path",
      lessonId: "boot-1",
      activityId: "path-close:1",
    }).state).toBe("duplicate");
  });

  it("rejects skipped stages, wrong modules and a receipt from another lesson", () => {
    const checkpoint = create();
    expect(applyLearningJourneyReceipt(checkpoint, {
      stage: "transfer",
      source: "pronunciation",
      lessonId: "boot-1",
      activityId: "skip-review",
    }).state).toBe("rejected");
    expect(applyLearningJourneyReceipt(checkpoint, {
      stage: "learn",
      source: "reader",
      lessonId: "boot-1",
      activityId: "wrong-source",
    }).state).toBe("rejected");
    expect(applyLearningJourneyReceipt(checkpoint, {
      stage: "learn",
      source: "lesson",
      lessonId: "boot-2",
      activityId: "wrong-anchor",
    }).state).toBe("rejected");
  });

  it("fails closed when a persisted checkpoint belongs to another owner scope", () => {
    const checkpoint = create();
    expect(parseIntegratedJourneyCheckpoint(
      checkpoint,
      "account:someone-else:4",
    )).toBeNull();
    expect(parseIntegratedJourneyCheckpoint(
      checkpoint,
      checkpoint.scopeKey,
    )).toEqual(checkpoint);
  });
});
