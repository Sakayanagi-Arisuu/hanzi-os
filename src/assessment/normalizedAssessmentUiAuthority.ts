import type { Skill } from "../types";
import type {
  AssessmentSessionAuthorityBindingV1,
} from "./assessmentSessionProtocol";
import type { NormalizedAssessmentRuntimeV1 } from "./normalizedAssessmentRuntime";

const SKILLS: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const exactTimestamp = (value: unknown): value is string => {
  if (!boundedString(value, 40)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0;

const percentage = (value: unknown): value is number =>
  nonNegativeInteger(value) && value <= 100;

const ATTEMPT_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "attemptId",
  "sessionId",
  "resetEpoch",
  "contentVersion",
  "formHash",
  "position",
  "itemId",
  "itemVersion",
  "skill",
  "measurementEligible",
  "masteryEligible",
  "status",
  "recordedAt",
] as const;

export function assessmentAttemptReceiptMatchesSessionBinding(
  value: unknown,
  binding: AssessmentSessionAuthorityBindingV1,
  expectedCommandId: string,
  position: number,
) {
  if (!isRecord(value) || !exactKeys(value, ATTEMPT_KEYS)) return false;
  const item = binding.form.items[position];
  return Boolean(
    item
    && item.position === position
    && value.protocolVersion === 1
    && value.idempotencyKey === expectedCommandId
    && typeof value.duplicate === "boolean"
    && boundedString(value.attemptId, 160)
    && value.sessionId === binding.sessionId
    && value.resetEpoch === binding.resetEpoch
    && value.contentVersion === binding.contentVersion
    && value.formHash === binding.formHash
    && value.position === item.position
    && value.itemId === item.itemId
    && value.itemVersion === item.itemVersion
    && value.skill === item.skill
    && value.measurementEligible === item.measurementEligible
    && value.masteryEligible === false
    && value.status === "recorded"
    && exactTimestamp(value.recordedAt)
  );
}

export function assessmentRuntimeMatchesSessionBinding(
  runtime: NormalizedAssessmentRuntimeV1,
  binding: AssessmentSessionAuthorityBindingV1,
) {
  if (
    runtime.contentVersion !== binding.contentVersion
    || runtime.resetEpoch !== binding.resetEpoch
    || runtime.enrollmentId !== binding.enrollmentId
    || runtime.sessionId !== binding.sessionId
    || runtime.blueprintId !== binding.blueprintId
    || runtime.formVersion !== binding.formVersion
    || runtime.scoringPolicyVersion !== binding.scoringPolicyVersion
    || runtime.formHash !== binding.formHash
    || runtime.startedAt !== binding.startedAt
    || runtime.items.length !== binding.expectedItemCount
  ) return false;
  return runtime.items.every((item, position) => {
    const expected = binding.form.items[position];
    return Boolean(
      expected
      && item.position === expected.position
      && item.itemId === expected.itemId
      && item.itemVersion === expected.itemVersion
      && item.skill === expected.skill
      && item.construct === expected.construct
      && item.modality === expected.modality
      && item.measurementEligible === expected.measurementEligible
      && item.prompt === expected.prompt
      && item.meta === expected.meta
      && item.stimulusText === expected.stimulusText
      && item.options.length === expected.options.length
      && item.options.every((option, index) => option === expected.options[index])
    );
  });
}

const RESULT_KEYS = [
  "status",
  "correct",
  "n",
  "observedAccuracy",
  "confidence95",
  "masteryEligible",
] as const;
const SKILL_RESULT_KEYS = [...RESULT_KEYS, "skill"] as const;
const CONFIDENCE_KEYS = ["lower", "upper"] as const;

const wilson95 = (correct: number, n: number) => {
  if (n <= 0) return null;
  const z = 1.959963984540054;
  const proportion = correct / n;
  const zSquared = z * z;
  const denominator = 1 + zSquared / n;
  const center = (proportion + zSquared / (2 * n)) / denominator;
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * n)) / n,
  ) / denominator;
  return {
    lower: Math.round(Math.max(0, center - margin) * 100),
    upper: Math.round(Math.min(1, center + margin) * 100),
  };
};

const observedResultIsExact = (
  value: unknown,
  expectedN: number,
  skill?: Skill,
) => {
  if (
    !isRecord(value)
    || !exactKeys(value, skill ? SKILL_RESULT_KEYS : RESULT_KEYS)
    || (skill !== undefined && value.skill !== skill)
    || !nonNegativeInteger(value.correct)
    || value.correct > expectedN
    || value.n !== expectedN
    || value.masteryEligible !== false
  ) return false;
  const expectedStatus = expectedN === 0
    ? "unassessed"
    : expectedN < 2
      ? "insufficient"
      : "observed";
  if (value.status !== expectedStatus) return false;
  if (expectedN === 0) {
    return value.correct === 0
      && value.observedAccuracy === null
      && value.confidence95 === null;
  }
  const expectedAccuracy = Math.round((value.correct / expectedN) * 100);
  const expectedConfidence = wilson95(value.correct, expectedN);
  return percentage(value.observedAccuracy)
    && value.observedAccuracy === expectedAccuracy
    && isRecord(value.confidence95)
    && exactKeys(value.confidence95, CONFIDENCE_KEYS)
    && value.confidence95.lower === expectedConfidence?.lower
    && value.confidence95.upper === expectedConfidence?.upper;
};

const SUBMISSION_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "enrollmentId",
  "resetEpoch",
  "contentVersion",
  "blueprintId",
  "formVersion",
  "scoringPolicyVersion",
  "formHash",
  "status",
  "calibrationStatus",
  "confidenceLevel",
  "masteryEligible",
  "overall",
  "skills",
  "submittedAt",
] as const;

export function assessmentSubmissionReceiptMatchesSessionBinding(
  value: unknown,
  binding: AssessmentSessionAuthorityBindingV1,
  expectedCommandId: string,
) {
  if (
    !isRecord(value)
    || !exactKeys(value, SUBMISSION_KEYS)
    || value.protocolVersion !== 1
    || value.idempotencyKey !== expectedCommandId
    || typeof value.duplicate !== "boolean"
    || value.sessionId !== binding.sessionId
    || value.enrollmentId !== binding.enrollmentId
    || value.resetEpoch !== binding.resetEpoch
    || value.contentVersion !== binding.contentVersion
    || value.blueprintId !== binding.blueprintId
    || value.formVersion !== binding.formVersion
    || value.scoringPolicyVersion !== binding.scoringPolicyVersion
    || value.formHash !== binding.formHash
    || value.status !== "submitted"
    || value.calibrationStatus !== "uncalibrated"
    || value.confidenceLevel !== 0.95
    || value.masteryEligible !== false
    || !Array.isArray(value.skills)
    || value.skills.length !== SKILLS.length
    || !exactTimestamp(value.submittedAt)
  ) return false;

  const eligibleItems = binding.form.items.filter(
    (item) => item.measurementEligible,
  );
  if (!observedResultIsExact(value.overall, eligibleItems.length)) return false;
  const bySkill = new Map<string, unknown>();
  for (const result of value.skills) {
    if (!isRecord(result) || typeof result.skill !== "string") return false;
    if (bySkill.has(result.skill)) return false;
    bySkill.set(result.skill, result);
  }
  let summedCorrect = 0;
  let summedN = 0;
  for (const skill of SKILLS) {
    const result = bySkill.get(skill);
    const expectedN = eligibleItems.filter((item) => item.skill === skill).length;
    if (!observedResultIsExact(result, expectedN, skill)) return false;
    const parsed = result as { correct: number; n: number };
    summedCorrect += parsed.correct;
    summedN += parsed.n;
  }
  const overall = value.overall as { correct: number; n: number };
  return summedCorrect === overall.correct && summedN === overall.n;
}

const ABANDONMENT_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "enrollmentId",
  "resetEpoch",
  "contentVersion",
  "blueprintId",
  "formVersion",
  "formHash",
  "status",
  "masteryEligible",
  "abandonedAt",
] as const;

export function assessmentAbandonmentReceiptMatchesSessionBinding(
  value: unknown,
  binding: AssessmentSessionAuthorityBindingV1,
  expectedCommandId: string,
) {
  if (!isRecord(value) || !exactKeys(value, ABANDONMENT_KEYS)) return false;
  return value.protocolVersion === 1
    && value.idempotencyKey === expectedCommandId
    && typeof value.duplicate === "boolean"
    && value.sessionId === binding.sessionId
    && value.enrollmentId === binding.enrollmentId
    && value.resetEpoch === binding.resetEpoch
    && value.contentVersion === binding.contentVersion
    && value.blueprintId === binding.blueprintId
    && value.formVersion === binding.formVersion
    && value.formHash === binding.formHash
    && value.status === "abandoned"
    && value.masteryEligible === false
    && exactTimestamp(value.abandonedAt);
}
