import { describe, expect, it } from "vitest";
import type { LearningEvidence, StoredFsrsCard } from "../types";
import {
  buildReviewForecast,
  buildReviewMemoryDistribution,
  countReviewsToday,
  getNextReviewDate,
  summarizeReviewSession,
} from "./reviewPresentation";

const card = (patch: Partial<StoredFsrsCard> = {}): StoredFsrsCard => ({
  difficulty: 5,
  due: new Date(2026, 8, 2, 10).toISOString(),
  elapsed_days: 0,
  lapses: 0,
  learning_steps: 0,
  reps: 0,
  scheduled_days: 0,
  stability: 0,
  state: 0,
  ...patch,
});
describe("review presentation", () => {
  it("builds the seven-day forecast from persisted FSRS due dates", () => {
    const now = new Date(2026, 8, 2, 8);
    const forecast = buildReviewForecast({
      today: card(),
      tomorrow: card({ due: new Date(2026, 8, 3, 9).toISOString() }),
      later: card({ due: new Date(2026, 8, 3, 17).toISOString() }),
      outside: card({ due: new Date(2026, 8, 12, 9).toISOString() }),
    }, now);

    expect(forecast).toHaveLength(7);
    expect(forecast[0]).toMatchObject({ count: 1, label: "Hôm nay" });
    expect(forecast[1]?.count).toBe(2);
    expect(forecast.reduce((total, day) => total + day.count, 0)).toBe(3);
  });

  it("describes scheduling strength without treating it as mastery", () => {
    expect(buildReviewMemoryDistribution({
      new: card(),
      consolidating: card({ reps: 3, stability: 6 }),
      stable: card({ reps: 9, stability: 18 }),
    })).toEqual({ consolidating: 1, newCards: 1, stable: 1, total: 3 });
  });

  it("separates independent recall, hint use and weak ratings", () => {
    expect(summarizeReviewSession([
      { hintUsed: false, rating: 3, wordId: "a" },
      { hintUsed: true, rating: 3, wordId: "b" },
      { hintUsed: false, rating: 1, wordId: "c" },
    ])).toEqual({ independent: 1, needsReview: 1, total: 3, withHint: 1 });
  });

  it("counts only today's review evidence and finds the next future due", () => {
    const now = new Date(2026, 8, 2, 8);
    const baseEvidence = {
      activityId: "review:a",
      activityVersion: "v1",
      contentVersion: "v1",
      id: "1",
      idempotencyKey: "1",
      masteryEligible: false,
      metadata: { rating: 3 },
      method: "fsrs-rating",
      outcome: "unverified",
      schemaVersion: 1,
      score: null,
      skill: "vocabulary",
      source: "review",
      verified: false,
    } satisfies Omit<LearningEvidence, "occurredAt">;
    expect(countReviewsToday([
      { ...baseEvidence, occurredAt: new Date(2026, 8, 2, 7).toISOString() },
      { ...baseEvidence, id: "2", idempotencyKey: "2", occurredAt: new Date(2026, 8, 1, 7).toISOString() },
    ], now)).toBe(1);
    expect(getNextReviewDate({
      overdue: card({ due: new Date(2026, 8, 1).toISOString() }),
      next: card({ due: new Date(2026, 8, 3).toISOString() }),
    }, now)?.toISOString()).toBe(new Date(2026, 8, 3).toISOString());
  });
});
