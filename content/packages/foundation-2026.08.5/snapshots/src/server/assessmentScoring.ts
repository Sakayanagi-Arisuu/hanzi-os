import type {
  AssessmentObservedResultV1,
  AssessmentSkillResultV1,
} from "../assessment/assessmentSubmissionProtocol";
import type { Skill } from "../types";

export const ASSESSMENT_RESULT_SKILLS = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
] as const satisfies readonly Skill[];

export const ASSESSMENT_MIN_OBSERVED_EVIDENCE = 2;

export type AssessmentScoringObservation = {
  skill: Skill;
  correct: boolean;
  measurementEligible: boolean;
};

const roundedPercent = (value: number) => Math.round(value * 100);

export const assessmentWilson95Interval = (correct: number, n: number) => {
  if (
    !Number.isSafeInteger(correct)
    || !Number.isSafeInteger(n)
    || n <= 0
    || correct < 0
    || correct > n
  ) return null;
  const z = 1.959963984540054;
  const proportion = correct / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (proportion + zSquared / (2 * n)) / denominator;
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * n)) / n,
  ) / denominator;
  return {
    lower: roundedPercent(Math.max(0, center - margin)),
    upper: roundedPercent(Math.min(1, center + margin)),
  };
};

export const assessmentObservedResult = (
  correct: number,
  n: number,
): AssessmentObservedResultV1 => ({
  status: n === 0
    ? "unassessed"
    : n < ASSESSMENT_MIN_OBSERVED_EVIDENCE
      ? "insufficient"
      : "observed",
  correct,
  n,
  observedAccuracy: n > 0 ? roundedPercent(correct / n) : null,
  confidence95: assessmentWilson95Interval(correct, n),
  masteryEligible: false,
});

export const scoreAssessmentObservations = (
  observations: readonly AssessmentScoringObservation[],
): {
  overall: AssessmentObservedResultV1;
  skills: AssessmentSkillResultV1[];
} => {
  const eligible = observations.filter((item) => item.measurementEligible);
  const summarize = (items: readonly AssessmentScoringObservation[]) =>
    assessmentObservedResult(
      items.filter((item) => item.correct).length,
      items.length,
    );
  return {
    overall: summarize(eligible),
    skills: ASSESSMENT_RESULT_SKILLS.map((skill) => ({
      skill,
      ...summarize(eligible.filter((item) => item.skill === skill)),
    })),
  };
};
