import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_STORIES } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "./authoritativeProgress";
import { buildNormalizedReaderAttemptQueueInput } from "./normalizedReaderCommands";

const progress = (): AuthoritativeReleasedLessonProgressV1 => ({
  schemaVersion: 1,
  resetEpoch: 0,
  cursor: 1,
  enrollmentId: "enrollment:test",
  courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  completedCount: 0,
  totalCount: 0,
  remainingCount: 0,
  progress: 0,
  nextLesson: null,
  lessons: [],
});

const input = () => {
  const story = RELEASED_STORIES[0];
  const question = story.comprehension[0];
  return {
    story,
    questionId: question.id,
    selectedAnswer: question.options[0],
    usedSupport: false,
    idempotencyKey: "reader-attempt:test",
    occurredAt: "2026-07-22T00:00:00.000Z",
    durationMs: 1200,
    authoritativeProgress: progress(),
    environment: {
      ownerGeneration: { ownerKey: "account:test", generation: 1 },
      resetEpoch: 0,
      installationId: "installation:test",
      deviceId: "device:test",
    },
  } as const;
};

describe("buildNormalizedReaderAttemptQueueInput", () => {
  it("emits only an untrusted answer command bound to current authority", () => {
    const queued = buildNormalizedReaderAttemptQueueInput(input());
    expect(queued).toMatchObject({
      ownerGeneration: { ownerKey: "account:test", generation: 1 },
      command: {
        source: "reader",
        method: "reading-comprehension",
        contentVersion: CONTENT_VERSION,
        response: {
          kind: "answer",
          usedHint: false,
        },
      },
    });
    const serialized = JSON.stringify(queued);
    for (const forbidden of [
      "correctAnswer",
      "explanation",
      "outcome",
      "score",
      "verified",
      "masteryEligible",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects substituted options and stale package/reset bindings", () => {
    expect(() => buildNormalizedReaderAttemptQueueInput({
      ...input(),
      selectedAnswer: "injected answer",
    })).toThrow("Exact released reader authority is required.");
    expect(() => buildNormalizedReaderAttemptQueueInput({
      ...input(),
      environment: { ...input().environment, resetEpoch: 1 },
    })).toThrow("Exact released reader authority is required.");
    expect(() => buildNormalizedReaderAttemptQueueInput({
      ...input(),
      authoritativeProgress: {
        ...progress(),
        manifestSha256: `sha256:${"0".repeat(64)}`,
      },
    })).toThrow("Exact released reader authority is required.");
  });

  it("rejects a mutated clone that is not the exact released story", () => {
    const mutated = structuredClone(RELEASED_STORIES[0]);
    mutated.summary += " altered";
    expect(() => buildNormalizedReaderAttemptQueueInput({
      ...input(),
      story: mutated,
    })).toThrow("Exact released reader authority is required.");
  });
});
