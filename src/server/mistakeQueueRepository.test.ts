import { describe, expect, it } from "vitest";
import { deriveRemediationProgress } from "./mistakeQueueRepository";

const signal = {
  originSource: "lesson" as const,
  activityId: "boot-1:q1",
  activityVersion: "content-v1:boot-1:q1",
  method: "meaning-selection" as const,
  skill: "vocabulary" as const,
  occurrenceCount: 1,
  latestIncorrectAt: 100,
  latestReceivedAt: 110,
};

const attempt = (
  occurredAt: number,
  outcome: "correct" | "incorrect",
  usedHint = 0,
) => ({
  activityId: signal.activityId,
  activityVersion: signal.activityVersion,
  source: "mistake" as const,
  method: signal.method,
  skill: signal.skill,
  outcome,
  usedHint,
  occurredAt,
  receivedAt: occurredAt + 1,
});

describe("deriveRemediationProgress", () => {
  it("closes a repair after one verified no-hint correction", () => {
    expect(deriveRemediationProgress(signal, [
      attempt(90, "correct"),
      attempt(120, "correct"),
    ])).toEqual({
      correctedStreak: 1,
      resolved: true,
      lastAttemptAt: 120,
    });
  });

  it("does not count a hinted correction and reopens after another incorrect response", () => {
    expect(deriveRemediationProgress(signal, [
      attempt(120, "correct", 1),
    ])).toEqual({
      correctedStreak: 0,
      resolved: false,
      lastAttemptAt: 120,
    });

    expect(deriveRemediationProgress(signal, [
      attempt(120, "correct"),
      attempt(140, "incorrect"),
    ])).toEqual({
      correctedStreak: 0,
      resolved: false,
      lastAttemptAt: 140,
    });
  });
});
