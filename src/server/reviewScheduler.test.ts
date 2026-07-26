import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
  REVIEW_SCHEDULER_VERSION,
} from "../learning/reviewProtocol";
import {
  advanceAuthoritativeReviewCard,
  canonicalReviewCardState,
  createAuthoritativeReviewCard,
} from "./reviewScheduler";

describe("authoritative review scheduler", () => {
  it("creates a deterministic, immediately due revision-one card", () => {
    const activatedAt = Date.parse("2026-07-26T08:00:00.000Z");
    expect(createAuthoritativeReviewCard(activatedAt)).toEqual({
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      dueAt: activatedAt,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      lastReviewAt: null,
      revision: 1,
    });
  });

  it("uses received time and no fuzz for reproducible server scheduling", () => {
    const activatedAt = Date.parse("2026-07-26T08:00:00.000Z");
    const reviewedAt = Date.parse("2026-07-26T08:05:00.000Z");
    const initial = createAuthoritativeReviewCard(activatedAt);
    const first = advanceAuthoritativeReviewCard(initial, reviewedAt, 3);
    const second = advanceAuthoritativeReviewCard(initial, reviewedAt, 3);
    expect(first).toEqual(second);
    expect(first.revision).toBe(2);
    expect(first.lastReviewAt).toBe(reviewedAt);
    expect(first.dueAt).toBeGreaterThan(reviewedAt);
    expect(initial.revision).toBe(1);
    expect(canonicalReviewCardState(first)).toBe(
      canonicalReviewCardState(second),
    );
  });
});
