import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTIONS,
} from "../../data/assessment";
import { CONTENT_VERSION } from "../../data/curriculum";
import type { LearningEvidence } from "../../types";
import {
  estimateObservedAccuracyFromCounts,
  formatLearnerEvidence,
  formatObservedEstimateCompact,
  estimateObservedAccuracy,
  learnerEvidenceDepthPercent,
  summarizeAssessmentEvidence,
  wilson95Interval,
} from "./skillEstimate";

const answer = (
  question: (typeof ASSESSMENT_QUESTIONS)[number],
  correct: boolean,
  patch: Partial<LearningEvidence> = {},
): LearningEvidence => ({
  id: `evidence:test:${question.id}`,
  idempotencyKey: `test-session:${question.id}`,
  schemaVersion: 1,
  contentVersion: CONTENT_VERSION,
  activityVersion: ASSESSMENT_FORM_VERSION,
  source: "diagnostic",
  method: "diagnostic-selection",
  activityId: `diagnostic:${question.id}`,
  skill: question.skill,
  outcome: correct ? "correct" : "incorrect",
  score: correct ? 100 : 0,
  verified: true,
  masteryEligible: true,
  occurredAt: "2026-07-22T00:00:00.000Z",
  metadata: { priorExposure: false },
  ...patch,
});

describe("observed assessment confidence", () => {
  it("returns no interval when a skill is unassessed", () => {
    expect(estimateObservedAccuracy([])).toEqual({
      status: "unassessed",
      correct: 0,
      n: 0,
      observedAccuracy: null,
      confidence95: null,
    });
  });

  it("uses a bounded Wilson 95% interval for small samples", () => {
    expect(wilson95Interval(1, 1)).toEqual({ lower: 21, upper: 100 });
    expect(wilson95Interval(0, 1)).toEqual({ lower: 0, upper: 79 });
    expect(estimateObservedAccuracy([
      { id: "a", correct: true },
      { id: "b", correct: false },
    ])).toEqual({
      status: "observed",
      correct: 1,
      n: 2,
      observedAccuracy: 50,
      confidence95: { lower: 9, upper: 91 },
    });
  });

  it("derives the same observation from validated server aggregates", () => {
    expect(estimateObservedAccuracyFromCounts(1, 2)).toEqual({
      status: "observed",
      correct: 1,
      n: 2,
      observedAccuracy: 50,
      confidence95: { lower: 9, upper: 91 },
    });
    expect(estimateObservedAccuracyFromCounts(3, 2)).toEqual({
      status: "unassessed",
      correct: 0,
      n: 0,
      observedAccuracy: null,
      confidence95: null,
    });
  });

  it("keeps statistical intervals internal on learner-facing copy", () => {
    expect(formatObservedEstimateCompact(estimateObservedAccuracy([
      { id: "a", correct: true },
      { id: "b", correct: false },
    ]))).toBe("2 lượt · cần thêm dữ liệu");
    expect(formatObservedEstimateCompact(estimateObservedAccuracy([])))
      .toBe("chưa có lượt");
  });

  it("keeps learner bars shallow when a perfect result has little evidence", () => {
    const twoCorrect = estimateObservedAccuracy([
      { id: "a", correct: true },
      { id: "b", correct: true },
    ]);
    expect(learnerEvidenceDepthPercent(twoCorrect)).toBe(20);
    expect(formatLearnerEvidence(twoCorrect)).toBe("2/2 đúng · cần thêm");
    expect(formatLearnerEvidence(estimateObservedAccuracy([]))).toBe("Chưa có lượt");
  });

  it("deduplicates exposure groups and ignores prior exposure", () => {
    const question = ASSESSMENT_QUESTIONS[0];
    const summary = summarizeAssessmentEvidence([
      answer(question, false),
      answer(question, true, {
        id: "evidence:repeat",
        idempotencyKey: `repeat-session:${question.id}`,
        metadata: { priorExposure: true },
      }),
    ]);

    expect(summary.skills.vocabulary).toMatchObject({
      status: "insufficient",
      correct: 0,
      n: 1,
    });
  });

  it("excludes synthetic TTS and leaves untested production skills unassessed", () => {
    const evidence = ASSESSMENT_QUESTIONS.map((question) => answer(question, true));
    const summary = summarizeAssessmentEvidence(evidence);

    expect(summary.overall).toMatchObject({ correct: 9, n: 9 });
    expect(summary.skills.listening.status).toBe("unassessed");
    expect(summary.skills.speaking.status).toBe("unassessed");
    expect(summary.skills.writing.status).toBe("unassessed");
    expect(summary.skills.pronunciation).toMatchObject({
      status: "observed",
      correct: 2,
      n: 2,
    });
  });
});
