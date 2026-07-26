import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify } from "../sync/document";
import type { NormalizedLessonRuntimeV1 } from "./normalizedLessonRuntime";
import type {
  LessonSessionAuthorityBindingV1,
  OpenLessonSessionReceiptV1,
} from "./lessonSessionProtocol";
import type { NormalizedLearningProjectionV1 } from "./projectionProtocol";

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

const boundedScore = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 100;

const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0;

const ATTEMPT_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "attemptId",
  "evidenceId",
  "resetEpoch",
  "source",
  "method",
  "activityId",
  "activityVersion",
  "skill",
  "outcome",
  "score",
  "verification",
] as const;

export function lessonAttemptReceiptMatchesSessionBinding(
  value: unknown,
  binding: LessonSessionAuthorityBindingV1,
  expectedCommandId: string,
  position: number,
) {
  if (!isRecord(value) || !exactKeys(value, ATTEMPT_KEYS)) return false;
  const activity = binding.form.activities[position];
  if (!activity || activity.position !== position) return false;
  const outcomeAndScoreMatch =
    (value.outcome === "correct" && value.score === 100)
    || (value.outcome === "incorrect" && value.score === 0);
  return value.protocolVersion === 1
    && value.idempotencyKey === expectedCommandId
    && typeof value.duplicate === "boolean"
    && boundedString(value.attemptId, 160)
    && boundedString(value.evidenceId, 160)
    && value.resetEpoch === binding.resetEpoch
    && value.source === "lesson"
    && value.method === activity.method
    && value.activityId === activity.activityId
    && value.activityVersion === activity.activityVersion
    && value.skill === activity.skill
    && outcomeAndScoreMatch
    && value.verification === "server-objective";
}

export function activeProjectionMatchesSessionBinding(
  projection: NormalizedLearningProjectionV1,
  binding: LessonSessionAuthorityBindingV1,
) {
  const enrollment = projection.enrollment;
  const active = projection.activeLessonSessions.filter(
    (session) => session.sessionId === binding.sessionId,
  );
  return Boolean(
    projection.contentVersion === CONTENT_VERSION
    && projection.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
    && projection.resetEpoch === binding.resetEpoch
    && enrollment
    && enrollment.enrollmentId === binding.enrollmentId
    && enrollment.contentVersion === binding.contentVersion
    && enrollment.manifestSha256 === projection.manifestSha256
    && active.length === 1
    && active[0].enrollmentId === binding.enrollmentId
    && active[0].contentVersion === binding.contentVersion
    && active[0].lessonId === binding.lessonId
    && active[0].lessonVersion === binding.lessonVersion
    && active[0].expectedEvidenceCount === binding.expectedEvidenceCount
    && active[0].formHash === binding.formHash
    && active[0].status === binding.status
    && active[0].startedAt === binding.startedAt
    && canonicalStringify(active[0].form) === canonicalStringify(binding.form)
  );
}

export const activeProjectionMatchesOpenReceipt = (
  projection: NormalizedLearningProjectionV1,
  receipt: OpenLessonSessionReceiptV1,
) => activeProjectionMatchesSessionBinding(projection, receipt);

export function runtimeMatchesSessionBinding(
  runtime: NormalizedLessonRuntimeV1,
  binding: LessonSessionAuthorityBindingV1,
) {
  if (
    runtime.contentVersion !== binding.contentVersion
    || runtime.resetEpoch !== binding.resetEpoch
    || runtime.enrollmentId !== binding.enrollmentId
    || runtime.lessonId !== binding.lessonId
    || runtime.lessonVersion !== binding.lessonVersion
    || runtime.sessionId !== binding.sessionId
    || runtime.formHash !== binding.formHash
    || runtime.startedAt !== binding.startedAt
    || runtime.script !== binding.form.script
    || runtime.activities.length !== binding.expectedEvidenceCount
  ) return false;
  return runtime.activities.every((activity, position) => {
    const formActivity = binding.form.activities[position];
    return Boolean(
      formActivity
      && activity.position === formActivity.position
      && activity.activityId === formActivity.activityId
      && activity.activityVersion === formActivity.activityVersion
      && activity.method === formActivity.method
      && activity.skill === formActivity.skill
      && activity.requiredForPass === formActivity.requiredForPass
    );
  });
}

const SUBMISSION_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "contentVersion",
  "resetEpoch",
  "lessonId",
  "lessonVersion",
  "formHash",
  "status",
  "evidenceCount",
  "rawScore",
  "gateScore",
  "requiredEvidenceCount",
  "requiredCorrectCount",
  "passed",
  "completionEvidenceId",
  "submittedAt",
] as const;

export function submissionReceiptMatchesSessionBinding(
  value: unknown,
  binding: LessonSessionAuthorityBindingV1,
  expectedCommandId: string,
) {
  if (!isRecord(value) || !exactKeys(value, SUBMISSION_KEYS)) return false;
  const requiredEvidenceCount = binding.form.activities.filter(
    (activity) => activity.requiredForPass,
  ).length;
  return value.protocolVersion === 1
    && value.idempotencyKey === expectedCommandId
    && typeof value.duplicate === "boolean"
    && value.sessionId === binding.sessionId
    && value.contentVersion === binding.contentVersion
    && value.resetEpoch === binding.resetEpoch
    && value.lessonId === binding.lessonId
    && value.lessonVersion === binding.lessonVersion
    && value.formHash === binding.formHash
    && value.status === "submitted"
    && value.evidenceCount === binding.expectedEvidenceCount
    && boundedScore(value.rawScore)
    && boundedScore(value.gateScore)
    && value.requiredEvidenceCount === requiredEvidenceCount
    && nonNegativeInteger(value.requiredCorrectCount)
    && Number(value.requiredCorrectCount) <= requiredEvidenceCount
    && typeof value.passed === "boolean"
    && value.passed === (Number(value.gateScore) >= 70)
    && boundedString(value.completionEvidenceId, 160)
    && exactTimestamp(value.submittedAt);
}

const ABANDONMENT_KEYS = [
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "enrollmentId",
  "contentVersion",
  "resetEpoch",
  "lessonId",
  "lessonVersion",
  "status",
  "abandonedAt",
] as const;

export function abandonmentReceiptMatchesSessionBinding(
  value: unknown,
  binding: LessonSessionAuthorityBindingV1,
  expectedCommandId: string,
) {
  if (!isRecord(value) || !exactKeys(value, ABANDONMENT_KEYS)) return false;
  return value.protocolVersion === 1
    && value.idempotencyKey === expectedCommandId
    && typeof value.duplicate === "boolean"
    && value.sessionId === binding.sessionId
    && value.enrollmentId === binding.enrollmentId
    && value.contentVersion === binding.contentVersion
    && value.resetEpoch === binding.resetEpoch
    && value.lessonId === binding.lessonId
    && value.lessonVersion === binding.lessonVersion
    && value.status === "abandoned"
    && exactTimestamp(value.abandonedAt);
}
