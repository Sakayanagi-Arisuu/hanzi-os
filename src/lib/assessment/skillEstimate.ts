import {
  ASSESSMENT_FORM_VERSION,
  ASSESSMENT_QUESTION_BY_ID,
  ASSESSMENT_QUESTIONS,
  type AssessmentQuestion,
} from "../../data/assessment";
import type { LearningEvidence, Skill } from "../../types";

export const ASSESSMENT_CONFIDENCE_LEVEL = 0.95;
export const ASSESSMENT_MIN_OBSERVED_EVIDENCE = 2;
export const LEARNER_EVIDENCE_TARGET = 10;

const SKILLS: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

export type ObservedAccuracyEstimate = {
  status: "unassessed" | "insufficient" | "observed";
  correct: number;
  n: number;
  observedAccuracy: number | null;
  confidence95: {
    lower: number;
    upper: number;
  } | null;
};

export type SkillObservedAccuracy = Record<Skill, ObservedAccuracyEstimate>;

export type BinaryObservation = {
  id: string;
  skill: Skill;
  correct: boolean;
};

const roundPercent = (value: number) => Math.round(value * 100);

export const wilson95Interval = (correct: number, n: number) => {
  if (!Number.isSafeInteger(correct) || !Number.isSafeInteger(n) || n <= 0 || correct < 0 || correct > n) {
    return null;
  }
  const z = 1.959963984540054;
  const proportion = correct / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (proportion + zSquared / (2 * n)) / denominator;
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * n)) / n,
  ) / denominator;
  return {
    lower: roundPercent(Math.max(0, center - margin)),
    upper: roundPercent(Math.min(1, center + margin)),
  };
};

export const estimateObservedAccuracy = (
  observations: readonly Pick<BinaryObservation, "id" | "correct">[],
  minimumEvidence = ASSESSMENT_MIN_OBSERVED_EVIDENCE,
): ObservedAccuracyEstimate => {
  const unique = new Map<string, boolean>();
  for (const observation of observations) {
    if (!unique.has(observation.id)) unique.set(observation.id, observation.correct);
  }
  const n = unique.size;
  const correct = [...unique.values()].filter(Boolean).length;
  return {
    status: n === 0
      ? "unassessed"
      : n < minimumEvidence
        ? "insufficient"
        : "observed",
    correct,
    n,
    observedAccuracy: n ? roundPercent(correct / n) : null,
    confidence95: wilson95Interval(correct, n),
  };
};

/**
 * Builds the same descriptive estimate from a server-owned aggregate. This is
 * intentionally observational: counts and a Wilson interval are not a
 * calibrated mastery probability.
 */
export const estimateObservedAccuracyFromCounts = (
  correct: number,
  n: number,
  minimumEvidence = ASSESSMENT_MIN_OBSERVED_EVIDENCE,
): ObservedAccuracyEstimate => {
  if (
    !Number.isSafeInteger(correct)
    || !Number.isSafeInteger(n)
    || !Number.isSafeInteger(minimumEvidence)
    || correct < 0
    || n < 0
    || correct > n
    || minimumEvidence < 1
  ) {
    return {
      status: "unassessed",
      correct: 0,
      n: 0,
      observedAccuracy: null,
      confidence95: null,
    };
  }
  return {
    status: n === 0
      ? "unassessed"
      : n < minimumEvidence
        ? "insufficient"
        : "observed",
    correct,
    n,
    observedAccuracy: n ? roundPercent(correct / n) : null,
    confidence95: wilson95Interval(correct, n),
  };
};

export const summarizeObservedAccuracyBySkill = (
  observations: readonly BinaryObservation[],
  minimumEvidence = ASSESSMENT_MIN_OBSERVED_EVIDENCE,
): SkillObservedAccuracy => Object.fromEntries(
  SKILLS.map((skill) => [
    skill,
    estimateObservedAccuracy(
      observations.filter((observation) => observation.skill === skill),
      minimumEvidence,
    ),
  ]),
) as SkillObservedAccuracy;

export const summarizeMasteryEligibleEvidence = (
  evidence: readonly LearningEvidence[],
) => {
  const observations = evidence.flatMap((item): BinaryObservation[] => {
    if (
      !item.verified
      || !item.masteryEligible
      || item.metadata?.usedHint === true
      || item.metadata?.priorExposure === true
      || (item.outcome !== "correct" && item.outcome !== "incorrect")
    ) return [];
    return [{
      id: `${item.activityVersion}|${item.activityId}`,
      skill: item.skill,
      correct: item.outcome === "correct",
    }];
  });
  return {
    overall: estimateObservedAccuracy(observations),
    skills: summarizeObservedAccuracyBySkill(observations),
  };
};

const assessmentQuestionForEvidence = (
  evidence: LearningEvidence,
  questionById: ReadonlyMap<string, AssessmentQuestion>,
) => {
  if (
    evidence.source !== "diagnostic"
    || evidence.method !== "diagnostic-selection"
    || evidence.activityVersion !== ASSESSMENT_FORM_VERSION
    || !evidence.activityId.startsWith("diagnostic:")
  ) return null;
  return questionById.get(evidence.activityId.slice("diagnostic:".length)) ?? null;
};

export const summarizeAssessmentEvidence = (
  evidence: readonly LearningEvidence[],
  options: {
    sessionId?: string;
    questions?: readonly AssessmentQuestion[];
  } = {},
) => {
  const questions = options.questions ?? ASSESSMENT_QUESTIONS;
  const questionById = questions === ASSESSMENT_QUESTIONS
    ? ASSESSMENT_QUESTION_BY_ID
    : new Map(questions.map((question) => [question.id, question]));
  const observations = evidence.flatMap((item): BinaryObservation[] => {
    const question = assessmentQuestionForEvidence(item, questionById);
    if (
      !question
      || !question.measurementEligible
      || !item.verified
      || item.skill !== question.skill
      || item.metadata?.priorExposure === true
      || (options.sessionId && !item.idempotencyKey.startsWith(`${options.sessionId}:`))
      || (item.outcome !== "correct" && item.outcome !== "incorrect")
    ) return [];
    return [{
      id: question.exposureGroupId,
      skill: question.skill,
      correct: item.outcome === "correct",
    }];
  });
  return {
    overall: estimateObservedAccuracy(observations),
    skills: summarizeObservedAccuracyBySkill(observations),
  };
};

export const formatObservedEstimate = (estimate: ObservedAccuracyEstimate) => {
  if (estimate.status === "unassessed") return "chưa được đo · n=0";
  const interval = estimate.confidence95
    ? `CI 95% ${estimate.confidence95.lower}–${estimate.confidence95.upper}%`
    : "CI chưa có";
  return `${estimate.correct}/${estimate.n} · ${estimate.observedAccuracy}% · ${interval}`;
};

export const formatObservedEstimateCompact = (
  estimate: ObservedAccuracyEstimate,
) => {
  if (estimate.status === "unassessed") return "chưa đo · n=0";
  const interval = estimate.confidence95
    ? `${estimate.confidence95.lower}–${estimate.confidence95.upper}%`
    : "chưa có";
  return `${estimate.correct}/${estimate.n} · CI 95% ${interval}`;
};

/**
 * Learner-facing bars show observation depth, not correctness or mastery.
 * Ten independent eligible observations is a presentation target only; it is
 * not a mastery threshold and does not change learning authorization.
 */
export const learnerEvidenceDepthPercent = (
  estimate: ObservedAccuracyEstimate,
  target = LEARNER_EVIDENCE_TARGET,
) => {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.min(100, Math.round((estimate.n / target) * 100));
};

export const formatLearnerEvidence = (
  estimate: ObservedAccuracyEstimate,
  target = LEARNER_EVIDENCE_TARGET,
) => {
  if (estimate.n === 0) return "Chưa có lượt";
  if (estimate.n < target) return `${estimate.correct}/${estimate.n} đúng · cần thêm`;
  return `${estimate.observedAccuracy}% đúng · ${estimate.n} lượt`;
};
