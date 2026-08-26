import { describe, expect, it } from "vitest";
import { RELEASED_LESSONS } from "../data/curriculum";
import { buildExerciseCatalog, type Exercise } from "../lib/exerciseGeneration";
import { isEvidenceCombinationAllowed } from "../lib/evidencePolicy";
import type { LearningEvidence, Skill } from "../types";
import {
  LEARNING_COVERAGE_TARGETS,
  PILLAR_SIGNAL_MINIMUM_SPAN_MS,
  PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES,
  PILLAR_SIGNAL_POLICY_VERSION,
  PILLAR_SIGNAL_SAMPLE_TARGET,
  buildReleasedLessonActivityCatalogForValidation,
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatLearnerActivityCoverage,
  type ReleasedLessonActivity,
} from "./learningCoverage";

const releasedActivityCatalog =
  buildReleasedLessonActivityCatalogForValidation();

const evidenceFor = (
  activity: ReleasedLessonActivity,
  input: {
    id: string;
    occurredAt: string;
    sessionId: string;
    correct?: boolean;
    priorExposure?: boolean;
    usedHint?: boolean;
  },
): LearningEvidence => {
  const correct = input.correct ?? true;
  return {
    id: `evidence:${input.id}`,
    idempotencyKey: `attempt:${input.id}`,
    schemaVersion: 1,
    contentVersion: activity.contentVersion,
    activityVersion: activity.activityVersion,
    source: "lesson",
    method: activity.method,
    activityId: activity.activityId,
    skill: activity.skill,
    outcome: correct ? "correct" : "incorrect",
    score: correct ? 100 : 0,
    verified: true,
    masteryEligible: input.priorExposure !== true
      && input.usedHint !== true,
    occurredAt: input.occurredAt,
    metadata: {
      priorExposure: input.priorExposure ?? false,
      sessionId: input.sessionId,
      usedHint: input.usedHint ?? false,
    },
  };
};

const DAY_ONE = "2026-08-09T00:00:00.000Z";
const DAY_TWO = new Date(
  Date.parse(DAY_ONE) + PILLAR_SIGNAL_MINIMUM_SPAN_MS,
).toISOString();

const activitiesForSkill = (
  skill: Skill,
  count = PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES,
) => releasedActivityCatalog.filter((activity) => activity.skill === skill)
  .slice(0, count);

const distributedEvidence = (
  activities: readonly ReleasedLessonActivity[],
  options: {
    correctCount?: number;
    secondTime?: string;
    sameSession?: boolean;
  } = {},
) => activities.map((activity, index) => {
  const secondHalf = index >= Math.floor(activities.length / 2);
  return evidenceFor(activity, {
    id: `distributed:${activity.activityId}`,
    occurredAt: secondHalf ? options.secondTime ?? DAY_TWO : DAY_ONE,
    sessionId: options.sameSession
      ? "session:shared"
      : secondHalf ? "session:later" : "session:earlier",
    correct: index < (options.correctCount ?? activities.length),
  });
});

const methodForExercise = (exercise: Exercise) => {
  if (exercise.kind === "meaning") return "meaning-selection" as const;
  if (exercise.kind === "listening") return "listening-selection" as const;
  if (exercise.kind === "sentence") return "reading-comprehension" as const;
  if (exercise.kind === "recall") return "typed-character-recall" as const;
  return "phonology-recognition" as const;
};

describe("learner pillar signal", () => {
  it("enumerates the immutable released activity inventory separately from the signal sample", () => {
    expect(new Set(
      releasedActivityCatalog.map((activity) => activity.activityId),
    ).size).toBe(releasedActivityCatalog.length);
    expect(Object.values(LEARNING_COVERAGE_TARGETS).reduce(
      (sum, count) => sum + count,
      0,
    )).toBe(releasedActivityCatalog.length);
    expect(LEARNING_COVERAGE_TARGETS.vocabulary).toBeGreaterThan(1_000);
    expect(LEARNING_COVERAGE_TARGETS.writing).toBeGreaterThan(100);
    expect(LEARNING_COVERAGE_TARGETS.reading).toBeGreaterThan(0);
    expect(LEARNING_COVERAGE_TARGETS.speaking).toBe(0);
    expect(PILLAR_SIGNAL_POLICY_VERSION).toBe("wilson-confidence-v1");
    expect(PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES).toBeGreaterThan(1);
    expect(PILLAR_SIGNAL_SAMPLE_TARGET).toBeGreaterThan(
      PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES,
    );
    expect(formatLearnerActivityCoverage(0, 0)).toBe("Trụ chưa khai mở");
  });

  it("matches the full immutable exercise catalog and frozen targets", () => {
    const fullCatalog = RELEASED_LESSONS.flatMap((lesson) =>
      buildExerciseCatalog(lesson, "simplified", () => 0.5)
        .filter((exercise) => isEvidenceCombinationAllowed(
          "lesson",
          methodForExercise(exercise),
          exercise.skill,
        ))
        .map((exercise) => ({
          activityId: `${lesson.id}:${exercise.id}`,
          activityVersion: exercise.activityVersion,
          contentVersion: lesson.contentVersion,
          method: methodForExercise(exercise),
          skill: exercise.skill,
        }))
    );
    expect(releasedActivityCatalog).toEqual(fullCatalog);
    const targetCounts = Object.fromEntries(
      Object.keys(LEARNING_COVERAGE_TARGETS).map((skill) => [
        skill,
        fullCatalog.filter((activity) => activity.skill === skill).length,
      ]),
    );
    expect(LEARNING_COVERAGE_TARGETS).toEqual(targetCounts);
  }, 60_000);

  it("does not move a pillar after one correct answer", () => {
    const activity = activitiesForSkill("vocabulary", 1)[0]!;
    const coverage = deriveLocalLearnerActivityCoverage([
      evidenceFor(activity, {
        id: "once",
        occurredAt: DAY_ONE,
        sessionId: "session:once",
      }),
    ]);

    expect(coverage.vocabulary).toMatchObject({
      covered: 1,
      target: PILLAR_SIGNAL_SAMPLE_TARGET,
      percent: null,
      state: "insufficient",
      supported: true,
    });
  });

  it("requires enough unique activities, independent sessions and a 24-hour span", () => {
    const tooFew = activitiesForSkill(
      "vocabulary",
      PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES - 1,
    );
    expect(deriveLocalLearnerActivityCoverage(
      distributedEvidence(tooFew),
    ).vocabulary.state).toBe("insufficient");

    const enough = activitiesForSkill("vocabulary");
    expect(deriveLocalLearnerActivityCoverage(
      distributedEvidence(enough, { sameSession: true }),
    ).vocabulary.state).toBe("insufficient");
    expect(deriveLocalLearnerActivityCoverage(
      distributedEvidence(enough, {
        secondTime: new Date(Date.parse(DAY_TWO) - 1).toISOString(),
      }),
    ).vocabulary.state).toBe("insufficient");
  });

  it("produces a conservative confidence signal from varied, spaced evidence", () => {
    const activities = activitiesForSkill("vocabulary");
    const coverage = deriveLocalLearnerActivityCoverage(
      distributedEvidence(activities),
    );

    expect(coverage.vocabulary).toMatchObject({
      covered: PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES,
      state: "measured",
      supported: true,
    });
    expect(coverage.vocabulary.percent).toBeGreaterThan(10);
    expect(coverage.vocabulary.percent).toBeLessThan(20);
  });

  it("lowers the signal for incorrect evidence instead of treating breadth as mastery", () => {
    const activities = activitiesForSkill("vocabulary");
    const perfect = deriveLocalLearnerActivityCoverage(
      distributedEvidence(activities),
    ).vocabulary;
    const withError = deriveLocalLearnerActivityCoverage(
      distributedEvidence(activities, { correctCount: activities.length - 1 }),
    ).vocabulary;

    expect(withError.state).toBe("measured");
    expect(withError.covered).toBe(perfect.covered);
    expect(withError.percent).toBeLessThan(perfect.percent!);
  });

  it("counts an activity once and lets a later session update its outcome", () => {
    const activities = activitiesForSkill("vocabulary");
    const baseline = distributedEvidence(activities);
    const repeated = evidenceFor(activities[0]!, {
      id: "later-repeat",
      occurredAt: new Date(
        Date.parse(DAY_TWO) + PILLAR_SIGNAL_MINIMUM_SPAN_MS,
      ).toISOString(),
      sessionId: "session:third",
      correct: false,
      priorExposure: true,
    });
    const before = deriveLocalLearnerActivityCoverage(baseline).vocabulary;
    const after = deriveLocalLearnerActivityCoverage([
      ...baseline,
      repeated,
    ]).vocabulary;

    expect(after.covered).toBe(before.covered);
    expect(after.percent).toBeLessThan(before.percent!);
    expect(deriveLocalLearnerActivityCoverage(baseline).speaking).toMatchObject({
      covered: 0,
      percent: null,
      practiceAvailable: true,
      state: "unavailable",
      supported: false,
    });
  });

  it("keeps released speaking practice active without treating browser transcripts as measurement", () => {
    const activity = releasedActivityCatalog[0]!;
    const transcript: LearningEvidence = {
      ...evidenceFor(activity, {
        id: "browser-speaking",
        occurredAt: DAY_ONE,
        sessionId: "session:speaking",
      }),
      source: "pronunciation",
      method: "speech-transcript",
      activityId: "speech:0",
      skill: "speaking",
      outcome: "unverified",
      score: 92,
      verified: false,
      masteryEligible: false,
    };

    expect(deriveLocalLearnerActivityCoverage([transcript]).speaking).toEqual({
      covered: 0,
      target: 0,
      percent: null,
      practiceAvailable: true,
      supported: false,
      state: "unavailable",
    });
  });

  it("ignores assisted, non-lesson, unknown, stale and unverified evidence", () => {
    const activity = releasedActivityCatalog[0]!;
    const base = evidenceFor(activity, {
      id: "invalid:base",
      occurredAt: DAY_ONE,
      sessionId: "session:invalid",
    });
    const invalid: LearningEvidence[] = [
      { ...base, id: "reader", idempotencyKey: "reader", source: "reader" },
      { ...base, id: "unknown", idempotencyKey: "unknown", activityId: "unknown:q1" },
      { ...base, id: "stale", idempotencyKey: "stale", activityVersion: `${base.activityVersion}:stale` },
      { ...base, id: "unverified", idempotencyKey: "unverified", verified: false },
      {
        ...base,
        id: "assisted",
        idempotencyKey: "assisted",
        metadata: { ...base.metadata, usedHint: true },
      },
      {
        ...base,
        id: "missing-hint",
        idempotencyKey: "missing-hint",
        metadata: { sessionId: "session:missing-hint" },
      },
    ];
    const coverage = deriveLocalLearnerActivityCoverage(invalid);
    expect(Object.values(coverage).every((item) => item.covered === 0)).toBe(
      true,
    );
  });

  it("fails closed for account V4 counts that lack item outcomes and session time", () => {
    const projected = deriveProjectedLearnerActivityCoverage(
      Object.fromEntries(Object.entries(LEARNING_COVERAGE_TARGETS)) as
        typeof LEARNING_COVERAGE_TARGETS,
    );

    for (const item of Object.values(projected)) {
      expect(item.covered).toBe(0);
      expect(item.percent).toBeNull();
      expect(item.practiceAvailable).toBe(item.supported || item === projected.speaking);
      expect(item.state).toBe(item.supported
        ? "insufficient"
        : "unavailable");
    }
  });
});
