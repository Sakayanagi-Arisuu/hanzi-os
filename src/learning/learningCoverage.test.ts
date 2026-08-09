import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import { buildExerciseCatalog, type Exercise } from "../lib/exerciseGeneration";
import { isEvidenceCombinationAllowed } from "../lib/evidencePolicy";
import type { LearningEvidence } from "../types";
import {
  LEARNING_COVERAGE_TARGETS,
  buildReleasedLessonActivityCatalogForValidation,
  deriveLocalLearnerActivityCoverage,
  deriveProjectedLearnerActivityCoverage,
  formatLearnerActivityCoverage,
} from "./learningCoverage";

const releasedActivityCatalog =
  buildReleasedLessonActivityCatalogForValidation();

const evidenceFor = (
  activityId: string,
  skill: LearningEvidence["skill"],
  id = activityId,
): LearningEvidence => ({
  id: `evidence:${id}`,
  idempotencyKey: `attempt:${id}`,
  schemaVersion: 1,
  contentVersion: CONTENT_VERSION,
  activityVersion: `${CONTENT_VERSION}:fixture:1`,
  source: "lesson",
  method: skill === "vocabulary"
    ? "meaning-selection"
    : skill === "writing"
      ? "typed-character-recall"
      : skill === "pronunciation"
        ? "phonology-recognition"
        : skill === "listening"
          ? "listening-selection"
          : "reading-comprehension",
  activityId,
  skill,
  outcome: "correct",
  score: 100,
  verified: true,
  masteryEligible: true,
  occurredAt: "2026-08-09T00:00:00.000Z",
});

const methodForExercise = (exercise: Exercise) => {
  if (exercise.kind === "meaning") return "meaning-selection" as const;
  if (exercise.kind === "listening") return "listening-selection" as const;
  if (exercise.kind === "sentence") return "reading-comprehension" as const;
  if (exercise.kind === "recall") return "typed-character-recall" as const;
  return "phonology-recognition" as const;
};

describe("learner activity coverage", () => {
  it("enumerates unique released, policy-supported lesson activities", () => {
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
    expect(formatLearnerActivityCoverage(0, 0)).toBe(
      "Chưa có hoạt động hỗ trợ",
    );
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

  it("counts one attempted activity instead of every word in a large lesson", () => {
    const largestLesson = [...RELEASED_LESSONS].sort(
      (left, right) => right.wordIds.length - left.wordIds.length,
    )[0]!;
    expect(largestLesson.wordIds.length).toBeGreaterThan(1);
    const activity = releasedActivityCatalog.find((candidate) =>
      candidate.activityId.startsWith(`${largestLesson.id}:`)
    )!;

    const coverage = deriveLocalLearnerActivityCoverage([
      evidenceFor(activity.activityId, activity.skill),
    ]);

    expect(coverage[activity.skill].covered).toBe(1);
    expect(coverage[activity.skill].percent).toBeLessThan(1);
    expect(Object.values(coverage).reduce(
      (sum, item) => sum + item.covered,
      0,
    )).toBe(1);
  });

  it("does not grow when the same correct activity is repeated", () => {
    const activity = releasedActivityCatalog[0]!;
    const once = deriveLocalLearnerActivityCoverage([
      evidenceFor(activity.activityId, activity.skill, "once"),
    ]);
    const repeated = deriveLocalLearnerActivityCoverage([
      evidenceFor(activity.activityId, activity.skill, "once"),
      evidenceFor(activity.activityId, activity.skill, "again"),
    ]);
    expect(repeated).toEqual(once);
  });

  it("ignores assisted, incorrect, non-lesson, and unknown activities", () => {
    const activity = releasedActivityCatalog[0]!;
    const assisted = {
      ...evidenceFor(activity.activityId, activity.skill, "assisted"),
      masteryEligible: false,
      metadata: { usedHint: true },
    };
    const incorrect = {
      ...evidenceFor(activity.activityId, activity.skill, "incorrect"),
      outcome: "incorrect" as const,
      score: 0,
    };
    const reader = {
      ...evidenceFor(activity.activityId, activity.skill, "reader"),
      source: "reader" as const,
    };
    const unknown = evidenceFor("unknown:q1", activity.skill, "unknown");
    const coverage = deriveLocalLearnerActivityCoverage([
      assisted,
      incorrect,
      reader,
      unknown,
    ]);
    expect(Object.values(coverage).every((item) => item.covered === 0)).toBe(
      true,
    );
  });

  it("reaches 100% for every supported skill with the full catalog", () => {
    const evidence = releasedActivityCatalog.map((activity, index) =>
      evidenceFor(activity.activityId, activity.skill, String(index))
    );
    const local = deriveLocalLearnerActivityCoverage(evidence);
    const projected = deriveProjectedLearnerActivityCoverage(
      Object.fromEntries(Object.entries(LEARNING_COVERAGE_TARGETS)) as
        typeof LEARNING_COVERAGE_TARGETS,
    );

    for (const item of Object.values(local)) {
      if (!item.supported) {
        expect(item.percent).toBeNull();
        continue;
      }
      expect(item.covered).toBe(item.target);
      expect(item.percent).toBe(100);
    }
    expect(projected).toEqual(local);
  });
});
