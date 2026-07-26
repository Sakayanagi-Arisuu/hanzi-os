import {
  estimateObservedAccuracyFromCounts,
  type ObservedAccuracyEstimate,
  type SkillObservedAccuracy,
} from "../lib/assessment/skillEstimate";
import type { Skill } from "../types";
import {
  LEARNING_PROJECTION_SKILLS,
  parseNormalizedLearningProjection,
  type NormalizedLearningProjectionV1,
} from "./projectionProtocol";

export type NormalizedObjectiveEvidenceSummary = {
  overall: ObservedAccuracyEstimate;
  skills: SkillObservedAccuracy;
  verifiedAttemptCount: number;
  masteryEligibleCount: number;
};

/**
 * Converts server-owned objective counters into descriptive accuracy only.
 * It never produces a mastery probability or infers one skill from another.
 */
export const summarizeNormalizedObjectiveEvidence = (
  input: NormalizedLearningProjectionV1 | null | undefined,
): NormalizedObjectiveEvidenceSummary | null => {
  const parsed = parseNormalizedLearningProjection(input);
  if (!parsed.ok || parsed.projection.enrollment === null) return null;

  let verifiedAttemptCount = 0;
  let masteryEligibleCount = 0;
  let masteryEligibleCorrectCount = 0;
  const skills = Object.fromEntries(
    LEARNING_PROJECTION_SKILLS.map((skill) => {
      const counts = parsed.projection.objectiveEvidence[skill];
      verifiedAttemptCount += counts.attemptCount;
      masteryEligibleCount += counts.masteryEligibleCount;
      masteryEligibleCorrectCount += counts.masteryEligibleCorrectCount;
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
  };
};
