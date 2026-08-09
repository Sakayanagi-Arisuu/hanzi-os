import {
  estimateObservedAccuracyFromCounts,
  type ObservedAccuracyEstimate,
  type SkillObservedAccuracy,
} from "../lib/assessment/skillEstimate";
import type { Skill } from "../types";
import {
  LEARNING_PROJECTION_SKILLS,
  parseNormalizedLearningProjection,
  parseNormalizedLearningProjectionV4,
  toNormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV4,
} from "./projectionProtocol";

export type NormalizedObjectiveEvidenceSummary = {
  overall: ObservedAccuracyEstimate;
  skills: SkillObservedAccuracy;
  verifiedAttemptCount: number;
  masteryEligibleCount: number;
  gateEligibleCorrectActivityCounts: Record<Skill, number>;
};

/**
 * Converts server-owned objective counters into descriptive accuracy only.
 * It never produces a mastery probability or infers one skill from another.
 */
export const summarizeNormalizedObjectiveEvidence = (
  input:
    | NormalizedLearningProjectionV1
    | NormalizedLearningProjectionV4
    | null
    | undefined,
): NormalizedObjectiveEvidenceSummary | null => {
  const parsedV4 = input?.protocolVersion === 4
    ? parseNormalizedLearningProjectionV4(input)
    : null;
  const parsed = parsedV4?.ok
    ? {
        ok: true as const,
        projection: toNormalizedLearningProjectionV1(parsedV4.projection),
      }
    : parseNormalizedLearningProjection(input);
  if (!parsed.ok || parsed.projection.enrollment === null) return null;

  let verifiedAttemptCount = 0;
  let masteryEligibleCount = 0;
  let masteryEligibleCorrectCount = 0;
  const gateEligibleCorrectActivityCounts = {} as Record<Skill, number>;
  const skills = Object.fromEntries(
    LEARNING_PROJECTION_SKILLS.map((skill) => {
      const counts = parsed.projection.objectiveEvidence[skill];
      verifiedAttemptCount += counts.attemptCount;
      masteryEligibleCount += counts.masteryEligibleCount;
      masteryEligibleCorrectCount += counts.masteryEligibleCorrectCount;
      gateEligibleCorrectActivityCounts[skill] =
        parsedV4?.ok
          ? parsedV4.projection.gateEligibleCorrectActivityCounts[skill]
          : 0;
      return [
        skill,
        estimateObservedAccuracyFromCounts(
          counts.masteryEligibleCorrectCount,
          counts.masteryEligibleCount,
        ),
      ];
    }),
  ) as Record<Skill, ObservedAccuracyEstimate>;

  return {
    overall: estimateObservedAccuracyFromCounts(
      masteryEligibleCorrectCount,
      masteryEligibleCount,
    ),
    skills,
    verifiedAttemptCount,
    masteryEligibleCount,
    gateEligibleCorrectActivityCounts,
  };
};
