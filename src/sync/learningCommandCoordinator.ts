import type {
  AbandonAssessmentSessionCommandV1,
  AbandonAssessmentSessionReceiptV1,
} from "../assessment/assessmentAbandonmentProtocol";
import type {
  RecordAssessmentAttemptCommandV1,
  RecordAssessmentAttemptReceiptV1,
} from "../assessment/assessmentAttemptProtocol";
import {
  hashAssessmentForm,
  isExactAssessmentFormV1,
  MAX_ASSESSMENT_FORM_ITEMS,
  type AssessmentFormV1,
  type AssessmentSessionAuthorityBindingV1,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../assessment/assessmentSessionProtocol";
import {
  ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL,
  type AssessmentObservedResultV1,
  type AssessmentSkillResultV1,
  type SubmitAssessmentSessionCommandV1,
  type SubmitAssessmentSessionReceiptV1,
} from "../assessment/assessmentSubmissionProtocol";
import type {
  LearningAttemptCommandV1,
  LearningAttemptReceiptV1,
} from "../learning/attemptProtocol";
import type {
  AbandonLessonSessionCommandV1,
  AbandonLessonSessionReceiptV1,
} from "../learning/lessonSessionAbandonmentProtocol";
import {
  hashLessonSessionForm,
  type LessonSessionAuthorityBindingV1,
  type LessonSessionFormV1,
  type OpenLessonSessionCommandV1,
  type OpenLessonSessionReceiptV1,
} from "../learning/lessonSessionProtocol";
import type {
  SubmitLessonSessionCommandV1,
  SubmitLessonSessionReceiptV1,
} from "../learning/lessonSessionSubmissionProtocol";
import {
  REVIEW_PROTOCOL_VERSION,
  REVIEW_SCHEDULER_VERSION,
  type GradeReviewCommandV1,
  type GradeReviewReceiptV1,
} from "../learning/reviewProtocol";
import {
  parseAbandonReaderSessionReceipt,
  type AbandonReaderSessionCommandV1,
  type AbandonReaderSessionReceiptV1,
} from "../reader/readerAbandonmentProtocol";
import {
  parseRecordReaderAttemptReceipt,
  type RecordReaderAttemptCommandV1,
  type RecordReaderAttemptReceiptV1,
} from "../reader/readerAttemptProtocol";
import {
  parseOpenReaderSessionReceipt,
  type OpenReaderSessionCommandV1,
  type OpenReaderSessionReceiptV1,
  type ReaderSessionAuthorityBindingV1,
} from "../reader/readerSessionProtocol";
import {
  parseSubmitReaderSessionReceipt,
  type SubmitReaderSessionCommandV1,
  type SubmitReaderSessionReceiptV1,
} from "../reader/readerSubmissionProtocol";
import type { Skill } from "../types";
import type {
  ActiveAssessmentAttemptProjectionV2,
  ActiveReaderAttemptProjectionV3,
} from "../learning/projectionProtocol";
import { canonicalStringify } from "./document";
import {
  acknowledgeLearningCommand,
  claimLearningCommand,
  listPendingLearningCommands,
  prepareLearningCommand,
  quarantineLearningCommand,
  scheduleLearningCommandRetry,
  type PreparedLearningCommand,
} from "./learningCommandOutbox";
import type { OwnerGeneration } from "./indexedDb";

export const LESSON_SESSION_COMMAND_ENDPOINT =
  "/api/learning/lesson-sessions" as const;
export const OBJECTIVE_ATTEMPT_COMMAND_ENDPOINT =
  "/api/learning/attempts" as const;
export const LESSON_SESSION_SUBMISSION_COMMAND_ENDPOINT =
  "/api/learning/lesson-sessions/submit" as const;
export const LESSON_SESSION_ABANDONMENT_COMMAND_ENDPOINT =
  "/api/learning/lesson-sessions/abandon" as const;
export const ASSESSMENT_SESSION_COMMAND_ENDPOINT =
  "/api/assessment/sessions" as const;
export const ASSESSMENT_ATTEMPT_COMMAND_ENDPOINT =
  "/api/assessment/attempts" as const;
export const ASSESSMENT_SESSION_SUBMISSION_COMMAND_ENDPOINT =
  "/api/assessment/sessions/submit" as const;
export const ASSESSMENT_SESSION_ABANDONMENT_COMMAND_ENDPOINT =
  "/api/assessment/sessions/abandon" as const;
export const REVIEW_GRADE_COMMAND_ENDPOINT =
  "/api/learning/reviews/grade" as const;
export const READER_SESSION_COMMAND_ENDPOINT =
  "/api/learning/reader-sessions" as const;
export const READER_ATTEMPT_COMMAND_ENDPOINT =
  "/api/learning/reader-attempts" as const;
export const READER_SESSION_SUBMISSION_COMMAND_ENDPOINT =
  "/api/learning/reader-sessions/submit" as const;
export const READER_SESSION_ABANDONMENT_COMMAND_ENDPOINT =
  "/api/learning/reader-sessions/abandon" as const;

export type LearningCommandTransportResponse = {
  status: number;
  body: unknown;
  retryAfterMs: number;
};

export type LearningCommandTransport = {
  sendLessonSession: (
    command: OpenLessonSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendObjectiveAttempt: (
    command: LearningAttemptCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendLessonSessionSubmission: (
    command: SubmitLessonSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendLessonSessionAbandonment: (
    command: AbandonLessonSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendOpenAssessmentSession: (
    command: OpenAssessmentSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendRecordAssessmentAttempt: (
    command: RecordAssessmentAttemptCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendSubmitAssessmentSession: (
    command: SubmitAssessmentSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendAbandonAssessmentSession: (
    command: AbandonAssessmentSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendReviewGrade: (
    command: GradeReviewCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendOpenReaderSession: (
    command: OpenReaderSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendRecordReaderAttempt: (
    command: RecordReaderAttemptCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendSubmitReaderSession: (
    command: SubmitReaderSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
  sendAbandonReaderSession: (
    command: AbandonReaderSessionCommandV1,
  ) => Promise<LearningCommandTransportResponse>;
};

export type LearningCommandFlushResult = {
  acknowledged: number;
  quarantined: number;
  retried: number;
  blocked: number;
};

type SameOriginTransportOptions = {
  fetch?: typeof fetch;
  origin?: string;
  signal?: AbortSignal;
};

const parseRetryAfterMs = (value: string | null, now = Date.now()) => {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(24 * 60 * 60_000, Math.ceil(seconds * 1_000));
  }
  const retryAt = new Date(value).getTime();
  if (Number.isNaN(retryAt)) return 0;
  return Math.min(24 * 60 * 60_000, Math.max(0, retryAt - now));
};

/**
 * Production transport with a closed endpoint set. Callers cannot supply a URL,
 * redirects are rejected, and credentials never leave the current origin.
 */
export function createSameOriginLearningCommandTransport(
  options: SameOriginTransportOptions = {},
): LearningCommandTransport {
  const fetchImplementation = options.fetch ?? fetch;
  const currentOrigin = options.origin
    ?? (typeof location === "undefined" ? null : location.origin);
  if (!currentOrigin) {
    throw new Error("Current origin is required for learning command transport.");
  }
  const origin = new URL(currentOrigin).origin;

  const post = async (
    endpointPath:
      | typeof LESSON_SESSION_COMMAND_ENDPOINT
      | typeof OBJECTIVE_ATTEMPT_COMMAND_ENDPOINT
      | typeof LESSON_SESSION_SUBMISSION_COMMAND_ENDPOINT
      | typeof LESSON_SESSION_ABANDONMENT_COMMAND_ENDPOINT
      | typeof ASSESSMENT_SESSION_COMMAND_ENDPOINT
      | typeof ASSESSMENT_ATTEMPT_COMMAND_ENDPOINT
      | typeof ASSESSMENT_SESSION_SUBMISSION_COMMAND_ENDPOINT
      | typeof ASSESSMENT_SESSION_ABANDONMENT_COMMAND_ENDPOINT
      | typeof REVIEW_GRADE_COMMAND_ENDPOINT
      | typeof READER_SESSION_COMMAND_ENDPOINT
      | typeof READER_ATTEMPT_COMMAND_ENDPOINT
      | typeof READER_SESSION_SUBMISSION_COMMAND_ENDPOINT
      | typeof READER_SESSION_ABANDONMENT_COMMAND_ENDPOINT,
    command:
      | OpenLessonSessionCommandV1
      | LearningAttemptCommandV1
      | SubmitLessonSessionCommandV1
      | AbandonLessonSessionCommandV1
      | OpenAssessmentSessionCommandV1
      | RecordAssessmentAttemptCommandV1
      | SubmitAssessmentSessionCommandV1
      | AbandonAssessmentSessionCommandV1
      | GradeReviewCommandV1
      | OpenReaderSessionCommandV1
      | RecordReaderAttemptCommandV1
      | SubmitReaderSessionCommandV1
      | AbandonReaderSessionCommandV1,
  ): Promise<LearningCommandTransportResponse> => {
    const endpoint = new URL(endpointPath, origin);
    if (
      endpoint.origin !== origin
      || endpoint.pathname !== endpointPath
      || endpoint.search
      || endpoint.hash
      || endpoint.username
      || endpoint.password
    ) {
      throw new Error("Learning command endpoint must remain same-origin.");
    }
    const response = await fetchImplementation(endpointPath, {
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    const body = await response.json().catch(() => null) as unknown;
    return {
      status: response.status,
      body,
      retryAfterMs: parseRetryAfterMs(response.headers.get("Retry-After")),
    };
  };

  return {
    sendLessonSession: (command) => post(
      LESSON_SESSION_COMMAND_ENDPOINT,
      command,
    ),
    sendObjectiveAttempt: (command) => post(
      OBJECTIVE_ATTEMPT_COMMAND_ENDPOINT,
      command,
    ),
    sendLessonSessionSubmission: (command) => post(
      LESSON_SESSION_SUBMISSION_COMMAND_ENDPOINT,
      command,
    ),
    sendLessonSessionAbandonment: (command) => post(
      LESSON_SESSION_ABANDONMENT_COMMAND_ENDPOINT,
      command,
    ),
    sendOpenAssessmentSession: (command) => post(
      ASSESSMENT_SESSION_COMMAND_ENDPOINT,
      command,
    ),
    sendRecordAssessmentAttempt: (command) => post(
      ASSESSMENT_ATTEMPT_COMMAND_ENDPOINT,
      command,
    ),
    sendSubmitAssessmentSession: (command) => post(
      ASSESSMENT_SESSION_SUBMISSION_COMMAND_ENDPOINT,
      command,
    ),
    sendAbandonAssessmentSession: (command) => post(
      ASSESSMENT_SESSION_ABANDONMENT_COMMAND_ENDPOINT,
      command,
    ),
    sendReviewGrade: (command) => post(
      REVIEW_GRADE_COMMAND_ENDPOINT,
      command,
    ),
    sendOpenReaderSession: (command) => post(
      READER_SESSION_COMMAND_ENDPOINT,
      command,
    ),
    sendRecordReaderAttempt: (command) => post(
      READER_ATTEMPT_COMMAND_ENDPOINT,
      command,
    ),
    sendSubmitReaderSession: (command) => post(
      READER_SESSION_SUBMISSION_COMMAND_ENDPOINT,
      command,
    ),
    sendAbandonReaderSession: (command) => post(
      READER_SESSION_ABANDONMENT_COMMAND_ENDPOINT,
      command,
    ),
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const normalizedTimestamp = (value: unknown) => {
  if (!boundedString(value, 40)) return false;
  return !Number.isNaN(new Date(value).getTime());
};

const canonicalTimestamp = (value: unknown): value is string => {
  if (!normalizedTimestamp(value)) return false;
  return new Date(value as string).toISOString() === value;
};

const SKILL_ORDER: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

const SKILLS = new Set<Skill>(SKILL_ORDER);

const OBJECTIVE_METHODS = new Set([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
]);

const FORM_KEYS = new Set(["schemaVersion", "script", "activities"]);

const FORM_ACTIVITY_KEYS = new Set([
  "position",
  "activityId",
  "activityVersion",
  "method",
  "skill",
  "requiredForPass",
]);

const parseLessonSessionForm = (
  value: unknown,
  expectedEvidenceCount: number,
): LessonSessionFormV1 | null => {
  if (
    !isRecord(value)
    || !Object.keys(value).every((key) => FORM_KEYS.has(key))
    || value.schemaVersion !== 1
    || (value.script !== "simplified" && value.script !== "traditional")
    || !Array.isArray(value.activities)
    || value.activities.length !== expectedEvidenceCount
  ) {
    return null;
  }
  const activityKeys = new Set<string>();
  const validActivities = value.activities.every((activity, index) => {
    if (
      !isRecord(activity)
      || !Object.keys(activity).every((key) => FORM_ACTIVITY_KEYS.has(key))
    ) {
      return false;
    }
    const activityKey = `${String(activity.activityId)}\u0000${String(
      activity.activityVersion,
    )}`;
    if (activityKeys.has(activityKey)) return false;
    activityKeys.add(activityKey);
    return activity.position === index
      && boundedString(activity.activityId, 240)
      && boundedString(activity.activityVersion, 160)
      && typeof activity.method === "string"
      && OBJECTIVE_METHODS.has(activity.method)
      && typeof activity.skill === "string"
      && SKILLS.has(activity.skill as Skill)
      && typeof activity.requiredForPass === "boolean";
  });
  return validActivities ? value as LessonSessionFormV1 : null;
};

const parseLessonSessionReceipt = async (
  value: unknown,
  command: OpenLessonSessionCommandV1,
): Promise<OpenLessonSessionReceiptV1 | null> => {
  if (!isRecord(value)) return null;
  if (
    value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || !boundedString(value.sessionId, 160)
    || value.enrollmentId !== command.enrollmentId
    || value.contentVersion !== command.contentVersion
    || value.resetEpoch !== command.resetEpoch
    || value.lessonId !== command.lessonId
    || !boundedString(value.lessonVersion, 160)
    || !Number.isSafeInteger(value.expectedEvidenceCount)
    || Number(value.expectedEvidenceCount) < 1
    || value.status !== "started"
    || !normalizedTimestamp(value.startedAt)
  ) {
    return null;
  }
  const form = parseLessonSessionForm(
    value.form,
    Number(value.expectedEvidenceCount),
  );
  if (
    !form
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || await hashLessonSessionForm(form) !== value.formHash
  ) {
    return null;
  }
  return value as OpenLessonSessionReceiptV1;
};

const parseObjectiveAttemptReceipt = (
  value: unknown,
  command: LearningAttemptCommandV1,
): LearningAttemptReceiptV1 | null => {
  if (!isRecord(value)) return null;
  const outcomeAndScoreMatch =
    (value.outcome === "correct" && value.score === 100)
    || (value.outcome === "incorrect" && value.score === 0);
  if (
    value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || !boundedString(value.attemptId, 160)
    || !boundedString(value.evidenceId, 160)
    || value.resetEpoch !== command.resetEpoch
    || value.source !== command.source
    || value.method !== command.method
    || value.activityId !== command.activityId
    || value.activityVersion !== command.activityVersion
    || typeof value.skill !== "string"
    || !SKILLS.has(value.skill as Skill)
    || !outcomeAndScoreMatch
    || value.verification !== "server-objective"
  ) {
    return null;
  }
  return value as LearningAttemptReceiptV1;
};

const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0;

const boundedScore = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 100;

const parseLessonSessionSubmissionReceipt = (
  value: unknown,
  command: SubmitLessonSessionCommandV1,
  sessionReceipt: LessonSessionAuthorityBindingV1,
): SubmitLessonSessionReceiptV1 | null => {
  if (!isRecord(value)) return null;
  const requiredEvidenceCount = sessionReceipt.form.activities.filter(
    (activity) => activity.requiredForPass,
  ).length;
  if (
    value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || value.sessionId !== command.sessionId
    || value.contentVersion !== command.contentVersion
    || value.resetEpoch !== command.resetEpoch
    || value.resetEpoch !== sessionReceipt.resetEpoch
    || value.lessonId !== sessionReceipt.lessonId
    || value.lessonVersion !== sessionReceipt.lessonVersion
    || value.formHash !== command.formHash
    || value.status !== "submitted"
    || !nonNegativeInteger(value.evidenceCount)
    || value.evidenceCount !== sessionReceipt.form.activities.length
    || !boundedScore(value.rawScore)
    || !boundedScore(value.gateScore)
    || value.requiredEvidenceCount !== requiredEvidenceCount
    || !nonNegativeInteger(value.requiredCorrectCount)
    || Number(value.requiredCorrectCount) > requiredEvidenceCount
    || typeof value.passed !== "boolean"
    || !boundedString(value.completionEvidenceId, 160)
    || !normalizedTimestamp(value.submittedAt)
  ) {
    return null;
  }
  return value as SubmitLessonSessionReceiptV1;
};

const ABANDONMENT_RECEIPT_KEYS = new Set([
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
]);

const parseLessonSessionAbandonmentReceipt = (
  value: unknown,
  command: AbandonLessonSessionCommandV1,
  sessionReceipt: LessonSessionAuthorityBindingV1,
): AbandonLessonSessionReceiptV1 | null => {
  if (
    !isRecord(value)
    || Object.keys(value).length !== ABANDONMENT_RECEIPT_KEYS.size
    || !Object.keys(value).every((key) => ABANDONMENT_RECEIPT_KEYS.has(key))
    || value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || value.sessionId !== command.sessionId
    || value.sessionId !== sessionReceipt.sessionId
    || value.enrollmentId !== sessionReceipt.enrollmentId
    || value.contentVersion !== command.contentVersion
    || value.contentVersion !== sessionReceipt.contentVersion
    || value.resetEpoch !== command.resetEpoch
    || value.resetEpoch !== sessionReceipt.resetEpoch
    || value.lessonId !== sessionReceipt.lessonId
    || value.lessonVersion !== sessionReceipt.lessonVersion
    || value.status !== "abandoned"
    || !canonicalTimestamp(value.abandonedAt)
  ) {
    return null;
  }
  return value as AbandonLessonSessionReceiptV1;
};

const exactKeys = (
  value: Record<string, unknown>,
  required: ReadonlySet<string>,
  optional: ReadonlySet<string> = new Set(),
) => {
  const keys = Object.keys(value);
  return [...required].every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.has(key) || optional.has(key));
};

const REVIEW_GRADE_RECEIPT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "reviewLogId",
  "cardId",
  "wordId",
  "wordVersion",
  "previousCardRevision",
  "cardRevision",
  "resetEpoch",
  "contentVersion",
  "schedulerVersion",
  "rating",
  "scheduledAt",
  "reviewedAt",
  "nextDueAt",
  "verification",
  "masteryEligible",
]);

const parseReviewGradeReceipt = (
  value: unknown,
  command: GradeReviewCommandV1,
): GradeReviewReceiptV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, REVIEW_GRADE_RECEIPT_KEYS)
    || value.protocolVersion !== REVIEW_PROTOCOL_VERSION
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || !boundedString(value.reviewLogId, 160)
    || value.cardId !== command.cardId
    || value.wordId !== command.wordId
    || value.wordVersion !== command.wordVersion
    || value.previousCardRevision !== command.expectedCardRevision
    || !Number.isSafeInteger(value.cardRevision)
    || value.cardRevision !== command.expectedCardRevision + 1
    || value.resetEpoch !== command.resetEpoch
    || value.contentVersion !== command.contentVersion
    || value.schedulerVersion !== REVIEW_SCHEDULER_VERSION
    || value.schedulerVersion !== command.schedulerVersion
    || value.rating !== command.rating
    || !canonicalTimestamp(value.scheduledAt)
    || !canonicalTimestamp(value.reviewedAt)
    || !canonicalTimestamp(value.nextDueAt)
    || value.verification !== "server-scheduled-self-rating"
    || value.masteryEligible !== false
  ) return null;
  const scheduledAt = new Date(value.scheduledAt).getTime();
  const reviewedAt = new Date(value.reviewedAt).getTime();
  const nextDueAt = new Date(value.nextDueAt).getTime();
  if (scheduledAt > reviewedAt || reviewedAt > nextDueAt) return null;
  return value as GradeReviewReceiptV1;
};

const parseAssessmentForm = (
  value: unknown,
  expectedItemCount: number,
): AssessmentFormV1 | null =>
  isExactAssessmentFormV1(value, expectedItemCount) ? value : null;

const ASSESSMENT_SESSION_RECEIPT_KEYS = new Set([
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
  "expectedItemCount",
  "form",
  "formHash",
  "status",
  "startedAt",
]);

const parseAssessmentSessionReceipt = async (
  value: unknown,
  command: OpenAssessmentSessionCommandV1,
): Promise<OpenAssessmentSessionReceiptV1 | null> => {
  if (
    !isRecord(value)
    || !exactKeys(value, ASSESSMENT_SESSION_RECEIPT_KEYS)
    || value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || !boundedString(value.sessionId, 160)
    || value.enrollmentId !== command.enrollmentId
    || value.resetEpoch !== command.resetEpoch
    || value.contentVersion !== command.contentVersion
    || !boundedString(value.blueprintId, 160)
    || !boundedString(value.formVersion, 200)
    || !boundedString(value.scoringPolicyVersion, 160)
    || !Number.isSafeInteger(value.expectedItemCount)
    || Number(value.expectedItemCount) < 1
    || Number(value.expectedItemCount) > MAX_ASSESSMENT_FORM_ITEMS
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || value.status !== "started"
    || !canonicalTimestamp(value.startedAt)
  ) return null;
  const form = parseAssessmentForm(value.form, Number(value.expectedItemCount));
  if (
    !form
    || form.blueprintId !== value.blueprintId
    || form.formVersion !== value.formVersion
    || form.scoringPolicyVersion !== value.scoringPolicyVersion
    || await hashAssessmentForm(form) !== value.formHash
  ) return null;
  return value as OpenAssessmentSessionReceiptV1;
};

const ASSESSMENT_ATTEMPT_RECEIPT_KEYS = new Set([
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
]);

const parseAssessmentAttemptReceipt = (
  value: unknown,
  command: RecordAssessmentAttemptCommandV1,
  sessionReceipt: AssessmentSessionAuthorityBindingV1,
): RecordAssessmentAttemptReceiptV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, ASSESSMENT_ATTEMPT_RECEIPT_KEYS)
    || value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || !boundedString(value.attemptId, 160)
    || value.sessionId !== command.sessionId
    || value.sessionId !== sessionReceipt.sessionId
    || value.resetEpoch !== command.resetEpoch
    || value.resetEpoch !== sessionReceipt.resetEpoch
    || value.contentVersion !== command.contentVersion
    || value.contentVersion !== sessionReceipt.contentVersion
    || value.formHash !== command.formHash
    || value.formHash !== sessionReceipt.formHash
    || !nonNegativeInteger(value.position)
    || value.itemId !== command.itemId
    || value.itemVersion !== command.itemVersion
    || typeof value.skill !== "string"
    || !SKILLS.has(value.skill as Skill)
    || typeof value.measurementEligible !== "boolean"
    || value.masteryEligible !== false
    || value.status !== "recorded"
    || !canonicalTimestamp(value.recordedAt)
  ) return null;
  const item = sessionReceipt.form.items[Number(value.position)];
  return item
    && item.itemId === value.itemId
    && item.itemVersion === value.itemVersion
    && item.skill === value.skill
    && item.measurementEligible === value.measurementEligible
    ? value as RecordAssessmentAttemptReceiptV1
    : null;
};

const roundPercent = (value: number) => Math.round(value * 100);

const expectedAssessmentObservedResult = (
  correct: number,
  n: number,
): Omit<AssessmentObservedResultV1, "masteryEligible"> => {
  if (n === 0) {
    return {
      status: "unassessed",
      correct: 0,
      n: 0,
      observedAccuracy: null,
      confidence95: null,
    };
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
    status: n < 2 ? "insufficient" : "observed",
    correct,
    n,
    observedAccuracy: roundPercent(proportion),
    confidence95: {
      lower: roundPercent(Math.max(0, center - margin)),
      upper: roundPercent(Math.min(1, center + margin)),
    },
  };
};

const ASSESSMENT_OBSERVED_RESULT_KEYS = new Set([
  "status",
  "correct",
  "n",
  "observedAccuracy",
  "confidence95",
  "masteryEligible",
]);
const ASSESSMENT_SKILL_RESULT_KEYS = new Set([
  ...ASSESSMENT_OBSERVED_RESULT_KEYS,
  "skill",
]);

const validAssessmentObservedResult = (
  value: unknown,
  expectedN: number,
  skill?: Skill,
): value is AssessmentObservedResultV1 | AssessmentSkillResultV1 => {
  if (
    !isRecord(value)
    || !exactKeys(
      value,
      skill === undefined
        ? ASSESSMENT_OBSERVED_RESULT_KEYS
        : ASSESSMENT_SKILL_RESULT_KEYS,
    )
    || !nonNegativeInteger(value.correct)
    || !nonNegativeInteger(value.n)
    || value.n !== expectedN
    || Number(value.correct) > expectedN
    || value.masteryEligible !== false
    || (skill !== undefined && value.skill !== skill)
  ) return false;
  const expected = expectedAssessmentObservedResult(
    Number(value.correct),
    expectedN,
  );
  return value.status === expected.status
    && value.observedAccuracy === expected.observedAccuracy
    && canonicalStringify(value.confidence95)
      === canonicalStringify(expected.confidence95);
};

const ASSESSMENT_SUBMISSION_RECEIPT_KEYS = new Set([
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
]);

const hasExactAssessmentAttemptCoverage = (
  sessionReceipt: AssessmentSessionAuthorityBindingV1,
  attemptReceipts: readonly RecordAssessmentAttemptReceiptV1[],
  projectedAttempts: readonly ActiveAssessmentAttemptProjectionV2[],
) => {
  if (
    attemptReceipts.length + projectedAttempts.length
      !== sessionReceipt.form.items.length
  ) return false;
  const positions = new Set<number>();
  const itemIds = new Set<string>();
  const recordCoverage = (
    position: number,
    itemId: string,
    itemVersion: string,
    skill: Skill,
    measurementEligible: boolean,
  ) => {
    const item = sessionReceipt.form.items[position];
    if (
      !item
      || item.itemId !== itemId
      || item.itemVersion !== itemVersion
      || item.skill !== skill
      || item.measurementEligible !== measurementEligible
      || positions.has(position)
      || itemIds.has(itemId)
    ) return false;
    positions.add(position);
    itemIds.add(itemId);
    return true;
  };
  return attemptReceipts.every((attempt) =>
    attempt.sessionId === sessionReceipt.sessionId
    && attempt.resetEpoch === sessionReceipt.resetEpoch
    && attempt.contentVersion === sessionReceipt.contentVersion
    && attempt.formHash === sessionReceipt.formHash
    && attempt.masteryEligible === false
    && attempt.status === "recorded"
    && recordCoverage(
      attempt.position,
      attempt.itemId,
      attempt.itemVersion,
      attempt.skill,
      attempt.measurementEligible,
    )
  ) && projectedAttempts.every((attempt) =>
    attempt.masteryEligible === false
    && attempt.status === "recorded"
    && recordCoverage(
      attempt.position,
      attempt.itemId,
      attempt.itemVersion,
      attempt.skill,
      attempt.measurementEligible,
    )
  ) && positions.size === sessionReceipt.form.items.length;
};

const parseAssessmentSessionSubmissionReceipt = (
  value: unknown,
  command: SubmitAssessmentSessionCommandV1,
  sessionReceipt: AssessmentSessionAuthorityBindingV1,
  attemptReceipts: readonly RecordAssessmentAttemptReceiptV1[],
  projectedAttempts: readonly ActiveAssessmentAttemptProjectionV2[],
): SubmitAssessmentSessionReceiptV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, ASSESSMENT_SUBMISSION_RECEIPT_KEYS)
    || value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || value.sessionId !== command.sessionId
    || value.sessionId !== sessionReceipt.sessionId
    || value.enrollmentId !== sessionReceipt.enrollmentId
    || value.resetEpoch !== command.resetEpoch
    || value.resetEpoch !== sessionReceipt.resetEpoch
    || value.contentVersion !== command.contentVersion
    || value.contentVersion !== sessionReceipt.contentVersion
    || value.blueprintId !== sessionReceipt.blueprintId
    || value.formVersion !== sessionReceipt.formVersion
    || value.scoringPolicyVersion !== sessionReceipt.scoringPolicyVersion
    || value.formHash !== command.formHash
    || value.formHash !== sessionReceipt.formHash
    || value.status !== "submitted"
    || value.calibrationStatus !== "uncalibrated"
    || value.confidenceLevel !== ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL
    || value.masteryEligible !== false
    || !Array.isArray(value.skills)
    || value.skills.length !== SKILL_ORDER.length
    || !canonicalTimestamp(value.submittedAt)
    || !hasExactAssessmentAttemptCoverage(
      sessionReceipt,
      attemptReceipts,
      projectedAttempts,
    )
  ) return null;
  const expectedNBySkill = new Map<Skill, number>(
    SKILL_ORDER.map((skill) => [skill, 0]),
  );
  for (const item of sessionReceipt.form.items) {
    if (item.measurementEligible) {
      expectedNBySkill.set(
        item.skill,
        (expectedNBySkill.get(item.skill) ?? 0) + 1,
      );
    }
  }
  let correct = 0;
  let n = 0;
  for (const [index, skill] of SKILL_ORDER.entries()) {
    const expectedN = expectedNBySkill.get(skill) ?? 0;
    const result = value.skills[index];
    if (!validAssessmentObservedResult(result, expectedN, skill)) return null;
    correct += result.correct;
    n += result.n;
  }
  if (
    !validAssessmentObservedResult(value.overall, n)
    || value.overall.correct !== correct
  ) return null;
  return value as SubmitAssessmentSessionReceiptV1;
};

const ASSESSMENT_ABANDONMENT_RECEIPT_KEYS = new Set([
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
]);

const parseAssessmentSessionAbandonmentReceipt = (
  value: unknown,
  command: AbandonAssessmentSessionCommandV1,
  sessionReceipt: AssessmentSessionAuthorityBindingV1,
): AbandonAssessmentSessionReceiptV1 | null => {
  if (
    !isRecord(value)
    || !exactKeys(value, ASSESSMENT_ABANDONMENT_RECEIPT_KEYS)
    || value.protocolVersion !== 1
    || value.idempotencyKey !== command.idempotencyKey
    || typeof value.duplicate !== "boolean"
    || value.sessionId !== command.sessionId
    || value.sessionId !== sessionReceipt.sessionId
    || value.enrollmentId !== sessionReceipt.enrollmentId
    || value.resetEpoch !== command.resetEpoch
    || value.resetEpoch !== sessionReceipt.resetEpoch
    || value.contentVersion !== command.contentVersion
    || value.contentVersion !== sessionReceipt.contentVersion
    || value.blueprintId !== sessionReceipt.blueprintId
    || value.formVersion !== sessionReceipt.formVersion
    || value.formHash !== command.formHash
    || value.formHash !== sessionReceipt.formHash
    || value.status !== "abandoned"
    || value.masteryEligible !== false
    || !canonicalTimestamp(value.abandonedAt)
  ) return null;
  return value as AbandonAssessmentSessionReceiptV1;
};

const parseReaderSessionReceipt = async (
  value: unknown,
  command: OpenReaderSessionCommandV1,
): Promise<OpenReaderSessionReceiptV1 | null> => {
  const parsed = await parseOpenReaderSessionReceipt(value);
  if (!parsed.ok) return null;
  const receipt = parsed.receipt;
  return receipt.idempotencyKey === command.idempotencyKey
    && receipt.enrollmentId === command.enrollmentId
    && receipt.resetEpoch === command.resetEpoch
    && receipt.contentVersion === command.contentVersion
    && receipt.storyId === command.storyId
    && receipt.script === command.script
    && receipt.supportMode === command.supportMode
    ? receipt
    : null;
};

const parseReaderAttemptReceipt = (
  value: unknown,
  command: RecordReaderAttemptCommandV1,
  sessionReceipt: ReaderSessionAuthorityBindingV1,
): RecordReaderAttemptReceiptV1 | null => {
  const parsed = parseRecordReaderAttemptReceipt(value);
  if (!parsed.ok) return null;
  const receipt = parsed.receipt;
  const item = sessionReceipt.form.items[command.position];
  return item
    && receipt.idempotencyKey === command.idempotencyKey
    && receipt.sessionId === command.sessionId
    && receipt.sessionId === sessionReceipt.sessionId
    && receipt.resetEpoch === command.resetEpoch
    && receipt.resetEpoch === sessionReceipt.resetEpoch
    && receipt.contentVersion === command.contentVersion
    && receipt.contentVersion === sessionReceipt.contentVersion
    && receipt.formHash === command.formHash
    && receipt.formHash === sessionReceipt.formHash
    && receipt.position === command.position
    && receipt.itemId === command.itemId
    && receipt.itemId === item.itemId
    && receipt.itemVersion === command.itemVersion
    && receipt.itemVersion === item.itemVersion
    && receipt.method === item.method
    && receipt.skill === item.skill
    && receipt.script === sessionReceipt.script
    && receipt.supportMode === sessionReceipt.supportMode
    && receipt.supportPolicyVersion === sessionReceipt.supportPolicyVersion
    && receipt.answerExposure === item.answerExposure
    && receipt.priorExposure === item.priorExposure
    && receipt.masteryEligible === item.masteryEligible
    ? receipt
    : null;
};

const hasExactReaderAttemptCoverage = (
  sessionReceipt: ReaderSessionAuthorityBindingV1,
  attemptReceipts: readonly RecordReaderAttemptReceiptV1[],
  projectedAttempts: readonly ActiveReaderAttemptProjectionV3[],
  submissionReceipt: SubmitReaderSessionReceiptV1,
) => {
  const attempts = [...attemptReceipts, ...projectedAttempts];
  if (
    attempts.length !== sessionReceipt.form.items.length
    || submissionReceipt.results.length !== attempts.length
  ) return false;
  const positions = new Set<number>();
  return attempts.every((attempt) => {
    const item = sessionReceipt.form.items[attempt.position];
    const result = submissionReceipt.results[attempt.position];
    if (
      !item
      || !result
      || positions.has(attempt.position)
      || attempt.sessionId !== sessionReceipt.sessionId
      || attempt.resetEpoch !== sessionReceipt.resetEpoch
      || attempt.contentVersion !== sessionReceipt.contentVersion
      || attempt.formHash !== sessionReceipt.formHash
      || attempt.itemId !== item.itemId
      || attempt.itemVersion !== item.itemVersion
      || attempt.method !== item.method
      || attempt.skill !== item.skill
      || attempt.script !== sessionReceipt.script
      || attempt.supportMode !== sessionReceipt.supportMode
      || attempt.supportPolicyVersion !== sessionReceipt.supportPolicyVersion
      || attempt.answerExposure !== item.answerExposure
      || attempt.priorExposure !== item.priorExposure
      || attempt.masteryEligible !== item.masteryEligible
      || result.position !== attempt.position
      || result.itemId !== attempt.itemId
      || result.itemVersion !== attempt.itemVersion
      || result.correct !== (attempt.outcome === "correct")
      || result.answerExposure !== item.answerExposure
      || result.priorExposure !== item.priorExposure
      || result.masteryEligible !== item.masteryEligible
    ) return false;
    positions.add(attempt.position);
    return true;
  }) && positions.size === sessionReceipt.form.items.length;
};

const parseReaderSessionSubmissionReceipt = (
  value: unknown,
  command: SubmitReaderSessionCommandV1,
  sessionReceipt: ReaderSessionAuthorityBindingV1,
  attemptReceipts: readonly RecordReaderAttemptReceiptV1[],
  projectedAttempts: readonly ActiveReaderAttemptProjectionV3[],
): SubmitReaderSessionReceiptV1 | null => {
  const parsed = parseSubmitReaderSessionReceipt(value);
  if (!parsed.ok) return null;
  const receipt = parsed.receipt;
  return receipt.idempotencyKey === command.idempotencyKey
    && receipt.sessionId === command.sessionId
    && receipt.sessionId === sessionReceipt.sessionId
    && receipt.enrollmentId === sessionReceipt.enrollmentId
    && receipt.resetEpoch === command.resetEpoch
    && receipt.resetEpoch === sessionReceipt.resetEpoch
    && receipt.contentVersion === command.contentVersion
    && receipt.contentVersion === sessionReceipt.contentVersion
    && receipt.storyId === sessionReceipt.storyId
    && receipt.storyVersion === sessionReceipt.storyVersion
    && receipt.formVersion === sessionReceipt.formVersion
    && receipt.formHash === command.formHash
    && receipt.formHash === sessionReceipt.formHash
    && receipt.expectedItemCount === command.expectedItemCount
    && receipt.expectedItemCount === sessionReceipt.expectedItemCount
    && receipt.script === sessionReceipt.script
    && receipt.supportMode === sessionReceipt.supportMode
    && receipt.supportPolicyVersion === sessionReceipt.supportPolicyVersion
    && hasExactReaderAttemptCoverage(
      sessionReceipt,
      attemptReceipts,
      projectedAttempts,
      receipt,
    )
    ? receipt
    : null;
};

const parseReaderSessionAbandonmentReceipt = (
  value: unknown,
  command: AbandonReaderSessionCommandV1,
  sessionReceipt: ReaderSessionAuthorityBindingV1,
): AbandonReaderSessionReceiptV1 | null => {
  const parsed = parseAbandonReaderSessionReceipt(value);
  if (!parsed.ok) return null;
  const receipt = parsed.receipt;
  return receipt.idempotencyKey === command.idempotencyKey
    && receipt.sessionId === command.sessionId
    && receipt.sessionId === sessionReceipt.sessionId
    && receipt.enrollmentId === sessionReceipt.enrollmentId
    && receipt.resetEpoch === command.resetEpoch
    && receipt.resetEpoch === sessionReceipt.resetEpoch
    && receipt.contentVersion === command.contentVersion
    && receipt.contentVersion === sessionReceipt.contentVersion
    && receipt.storyId === sessionReceipt.storyId
    && receipt.storyVersion === sessionReceipt.storyVersion
    && receipt.formVersion === sessionReceipt.formVersion
    && receipt.formHash === command.formHash
    && receipt.formHash === sessionReceipt.formHash
    && receipt.script === sessionReceipt.script
    && receipt.supportMode === sessionReceipt.supportMode
    && receipt.supportPolicyVersion === sessionReceipt.supportPolicyVersion
    && receipt.reason === command.reason
    ? receipt
    : null;
};

const sendPreparedCommand = (
  transport: LearningCommandTransport,
  prepared: PreparedLearningCommand,
) => {
  if (prepared.kind === "lesson-session-open") {
    return transport.sendLessonSession(prepared.command);
  }
  if (prepared.kind === "objective-attempt") {
    return transport.sendObjectiveAttempt(prepared.command);
  }
  if (prepared.kind === "lesson-session-submit") {
    return transport.sendLessonSessionSubmission(prepared.command);
  }
  if (prepared.kind === "lesson-session-abandon") {
    return transport.sendLessonSessionAbandonment(prepared.command);
  }
  if (prepared.kind === "assessment-session-open") {
    return transport.sendOpenAssessmentSession(prepared.command);
  }
  if (prepared.kind === "assessment-attempt") {
    return transport.sendRecordAssessmentAttempt(prepared.command);
  }
  if (prepared.kind === "assessment-session-submit") {
    return transport.sendSubmitAssessmentSession(prepared.command);
  }
  if (prepared.kind === "assessment-session-abandon") {
    return transport.sendAbandonAssessmentSession(prepared.command);
  }
  if (prepared.kind === "reader-session-open") {
    return transport.sendOpenReaderSession(prepared.command);
  }
  if (prepared.kind === "reader-attempt") {
    return transport.sendRecordReaderAttempt(prepared.command);
  }
  if (prepared.kind === "reader-session-submit") {
    return transport.sendSubmitReaderSession(prepared.command);
  }
  if (prepared.kind === "reader-session-abandon") {
    return transport.sendAbandonReaderSession(prepared.command);
  }
  if (prepared.kind === "review-grade") {
    return transport.sendReviewGrade(prepared.command);
  }
  return assertNever(prepared);
};

const assertNever = (value: never): never => {
  throw new Error(
    `Unsupported learning command kind: ${String(
      (value as { kind?: unknown }).kind,
    )}`,
  );
};

const parsePreparedReceipt = async (
  prepared: PreparedLearningCommand,
  body: unknown,
) => {
  if (prepared.kind === "lesson-session-open") {
    return parseLessonSessionReceipt(body, prepared.command);
  }
  if (prepared.kind === "objective-attempt") {
    return parseObjectiveAttemptReceipt(body, prepared.command);
  }
  if (prepared.kind === "lesson-session-submit") {
    return parseLessonSessionSubmissionReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
    );
  }
  if (prepared.kind === "lesson-session-abandon") {
    return parseLessonSessionAbandonmentReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
    );
  }
  if (prepared.kind === "assessment-session-open") {
    return parseAssessmentSessionReceipt(body, prepared.command);
  }
  if (prepared.kind === "assessment-attempt") {
    return parseAssessmentAttemptReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
    );
  }
  if (prepared.kind === "assessment-session-submit") {
    return parseAssessmentSessionSubmissionReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
      prepared.attemptReceipts,
      prepared.projectedAttempts,
    );
  }
  if (prepared.kind === "assessment-session-abandon") {
    return parseAssessmentSessionAbandonmentReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
    );
  }
  if (prepared.kind === "reader-session-open") {
    return parseReaderSessionReceipt(body, prepared.command);
  }
  if (prepared.kind === "reader-attempt") {
    return parseReaderAttemptReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
    );
  }
  if (prepared.kind === "reader-session-submit") {
    return parseReaderSessionSubmissionReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
      prepared.attemptReceipts,
      prepared.projectedAttempts,
    );
  }
  if (prepared.kind === "reader-session-abandon") {
    return parseReaderSessionAbandonmentReceipt(
      body,
      prepared.command,
      prepared.sessionReceipt,
    );
  }
  if (prepared.kind === "review-grade") {
    return parseReviewGradeReceipt(body, prepared.command);
  }
  return assertNever(prepared);
};

const isExplicitlyRetryable = (body: unknown) => {
  if (!isRecord(body)) return false;
  if (body.retryable === true) return true;
  return isRecord(body.error) && body.error.retryable === true;
};

const isPermanentClientResponse = (
  status: number,
  body: unknown,
) => status >= 400
  && status < 500
  && ![401, 408, 425, 429].includes(status)
  && !isExplicitlyRetryable(body);

const isSuccessfulStatus = (status: number) =>
  status >= 200 && status < 300;

export async function flushLearningCommandOutbox(input: {
  ownerGeneration: OwnerGeneration;
  transport: LearningCommandTransport;
  now?: () => Date;
  maximumCommands?: number;
  signal?: AbortSignal;
}): Promise<LearningCommandFlushResult> {
  const now = input.now ?? (() => new Date());
  const maximumCommands = Math.max(
    1,
    Math.min(100, input.maximumCommands ?? 25),
  );
  const result: LearningCommandFlushResult = {
    acknowledged: 0,
    quarantined: 0,
    retried: 0,
    blocked: 0,
  };
  const pending = await listPendingLearningCommands(input.ownerGeneration);

  for (const record of pending.slice(0, maximumCommands)) {
    input.signal?.throwIfAborted();
    const currentTime = now();
    const currentTimeMs = currentTime.getTime();
    if (Number.isNaN(currentTimeMs)) {
      throw new Error("Learning command coordinator clock is invalid.");
    }
    if (
      (record.nextAttemptAt
        && new Date(record.nextAttemptAt).getTime() > currentTimeMs)
      || (record.leaseUntil
        && new Date(record.leaseUntil).getTime() > currentTimeMs)
    ) {
      result.blocked += 1;
      break;
    }

    const preparation = await prepareLearningCommand(
      record.recordKey,
      input.ownerGeneration,
    );
    if (preparation.state === "gone") continue;
    if (preparation.state === "blocked") {
      result.blocked += 1;
      break;
    }
    if (preparation.state === "invalid") {
      await quarantineLearningCommand(
        record.recordKey,
        input.ownerGeneration,
        preparation.reason,
        currentTime,
      );
      result.quarantined += 1;
      continue;
    }

    const claim = await claimLearningCommand(
      record.recordKey,
      input.ownerGeneration,
      currentTime,
    );
    if (!claim) {
      result.blocked += 1;
      break;
    }

    let response: LearningCommandTransportResponse;
    try {
      response = await sendPreparedCommand(
        input.transport,
        preparation.prepared,
      );
    } catch {
      input.signal?.throwIfAborted();
      await scheduleLearningCommandRetry(
        record.recordKey,
        input.ownerGeneration,
        currentTime,
      );
      result.retried += 1;
      break;
    }
    input.signal?.throwIfAborted();

    if (isSuccessfulStatus(response.status)) {
      const receipt = await parsePreparedReceipt(
        preparation.prepared,
        response.body,
      );
      if (!receipt) {
        await scheduleLearningCommandRetry(
          record.recordKey,
          input.ownerGeneration,
          currentTime,
        );
        result.retried += 1;
        break;
      }
      const acknowledgement = await acknowledgeLearningCommand(
        record.recordKey,
        input.ownerGeneration,
        receipt,
        currentTime,
      );
      if (acknowledgement?.status === "quarantined") {
        result.quarantined += 1;
      } else {
        result.acknowledged += 1;
      }
      continue;
    }

    if (isPermanentClientResponse(response.status, response.body)) {
      await quarantineLearningCommand(
        record.recordKey,
        input.ownerGeneration,
        `HTTP ${response.status} permanently rejected this command.`,
        currentTime,
      );
      result.quarantined += 1;
      continue;
    }

    await scheduleLearningCommandRetry(
      record.recordKey,
      input.ownerGeneration,
      currentTime,
      response.status === 429 ? response.retryAfterMs : 0,
    );
    result.retried += 1;
    break;
  }

  return result;
}
