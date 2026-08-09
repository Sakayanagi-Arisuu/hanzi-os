import type { LessonSessionFormHash, LessonSessionFormV1 } from "./lessonSessionProtocol";
import type { ObjectiveAttemptMethod, ObjectiveAttemptSource } from "./attemptProtocol";
import type { Skill } from "../types";
import {
  isExactAssessmentFormV1,
  MAX_ASSESSMENT_FORM_ITEMS,
  type AssessmentFormV1,
  type AssessmentSessionAuthorityBindingV1,
} from "../assessment/assessmentSessionProtocol";
import {
  ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL,
  type SubmitAssessmentSessionReceiptV1,
} from "../assessment/assessmentSubmissionProtocol";
import type {
  RecordReaderAttemptReceiptV1,
} from "../reader/readerAttemptProtocol";
import {
  READER_METHOD,
  READER_SKILL,
  isExactReaderSessionFormV1,
  type ReaderSessionAuthorityBindingV1,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import {
  MAX_READER_FORM_ITEMS,
} from "../reader/protocolSupport";

export const LEARNING_PROJECTION_PROTOCOL_VERSION = 1 as const;
export const LEARNING_PROJECTION_V2_PROTOCOL_VERSION = 2 as const;
export const LEARNING_PROJECTION_V3_PROTOCOL_VERSION = 3 as const;
export const LEARNING_PROJECTION_V4_PROTOCOL_VERSION = 4 as const;
export const LEARNING_PROJECTION_V2_MEDIA_TYPE =
  "application/vnd.hanzi-os.learning-projection.v2+json" as const;
export const LEARNING_PROJECTION_V3_MEDIA_TYPE =
  "application/vnd.hanzi-os.learning-projection.v3+json" as const;
export const LEARNING_PROJECTION_V4_MEDIA_TYPE =
  "application/vnd.hanzi-os.learning-projection.v4+json" as const;
export const LEARNING_PROJECTION_VERSION_HEADER =
  "x-learning-projection-version" as const;

export type LearningProjectionEnrollmentV1 = {
  enrollmentId: string;
  contentVersion: string;
  courseId: string;
  manifestSha256: string;
  releaseState: "beta" | "published";
  goal: "conversation" | "hsk" | "career" | "travel";
};

/**
 * A server-scored attempt summary. The learner response and answer key are
 * deliberately absent so a projection cannot become an item-bank endpoint.
 */
export type ActiveLessonAttemptProjectionV1 = {
  attemptId: string;
  evidenceId: string;
  activityId: string;
  activityVersion: string;
  source: Extract<ObjectiveAttemptSource, "lesson">;
  method: ObjectiveAttemptMethod;
  skill: Skill;
  outcome: "correct" | "incorrect";
  score: 0 | 100;
  usedHint: boolean;
  priorExposure: boolean;
  gateEligible: boolean;
  occurredAt: string;
};

export type ActiveLessonSessionProjectionV1 = {
  sessionId: string;
  enrollmentId: string;
  contentVersion: string;
  lessonId: string;
  lessonVersion: string;
  expectedEvidenceCount: number;
  form: LessonSessionFormV1;
  formHash: LessonSessionFormHash;
  status: "started";
  startedAt: string;
  attempts: ActiveLessonAttemptProjectionV1[];
};

export type SubmittedLessonProjectionV1 = {
  enrollmentId: string;
  contentVersion: string;
  lessonId: string;
  lessonVersion: string;
  submittedSessionCount: number;
  passedSessionCount: number;
  passed: boolean;
  bestRawScore: number;
  bestGateScore: number;
  lastSubmittedAt: string;
};

/**
 * Descriptive counts only. These are not calibrated mastery probabilities.
 * `masteryEligible*` counts are the first-exposure, policy-eligible subset.
 */
export type ObjectiveEvidenceProjectionV1 = {
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  masteryEligibleCount: number;
  masteryEligibleCorrectCount: number;
};

export type NormalizedLearningProjectionV1 = {
  protocolVersion: 1;
  resetEpoch: number;
  cursor: number;
  contentVersion: string;
  manifestSha256: string;
  enrollment: LearningProjectionEnrollmentV1 | null;
  activeLessonSessions: ActiveLessonSessionProjectionV1[];
  submittedLessons: SubmittedLessonProjectionV1[];
  objectiveEvidence: Record<Skill, ObjectiveEvidenceProjectionV1>;
};

/**
 * A server-recorded assessment attempt without the learner response, answer,
 * or item-level outcome. It is sufficient to resume at the next unanswered
 * form position without turning the projection into an answer-key endpoint.
 */
export type ActiveAssessmentAttemptProjectionV2 = {
  attemptId: string;
  position: number;
  itemId: string;
  itemVersion: string;
  skill: Skill;
  measurementEligible: boolean;
  masteryEligible: false;
  status: "recorded";
  recordedAt: string;
};

export type ActiveAssessmentSessionProjectionV2 =
  AssessmentSessionAuthorityBindingV1 & {
    attempts: ActiveAssessmentAttemptProjectionV2[];
  };

export type LatestAssessmentResultProjectionV2 = Omit<
  SubmitAssessmentSessionReceiptV1,
  "protocolVersion" | "idempotencyKey" | "duplicate"
>;

export type NormalizedLearningProjectionV2 = Omit<
  NormalizedLearningProjectionV1,
  "protocolVersion"
> & {
  protocolVersion: 2;
  activeAssessmentSession: ActiveAssessmentSessionProjectionV2 | null;
  latestAssessmentResult: LatestAssessmentResultProjectionV2 | null;
};

/**
 * A server-recorded Reader attempt that is sufficient to resume the first
 * unanswered position. Transport metadata and the selected option are absent;
 * server-derived outcome data remains bound to the immutable item policy.
 */
export type ActiveReaderAttemptProjectionV3 = Omit<
  RecordReaderAttemptReceiptV1,
  "protocolVersion" | "idempotencyKey" | "duplicate"
>;

export type ActiveReaderSessionProjectionV3 =
  ReaderSessionAuthorityBindingV1 & {
    attempts: ActiveReaderAttemptProjectionV3[];
  };

export type NormalizedLearningProjectionV3 = Omit<
  NormalizedLearningProjectionV2,
  "protocolVersion"
> & {
  protocolVersion: 3;
  activeReaderSession: ActiveReaderSessionProjectionV3 | null;
};

/**
 * V4 adds descriptive breadth counts as a separate, versioned aggregate. The
 * V1-V3 objective evidence shape remains byte-for-byte compatible with older
 * caches and clients.
 */
export type NormalizedLearningProjectionV4 = Omit<
  NormalizedLearningProjectionV3,
  "protocolVersion"
> & {
  protocolVersion: 4;
  gateEligibleCorrectActivityCounts: Record<Skill, number>;
};

export type NormalizedLearningProjection =
  | NormalizedLearningProjectionV1
  | NormalizedLearningProjectionV2
  | NormalizedLearningProjectionV3
  | NormalizedLearningProjectionV4;

export type LearningProjectionParseResult =
  | { ok: true; projection: NormalizedLearningProjectionV1 }
  | { ok: false; reason: string };

export type LearningProjectionV2ParseResult =
  | { ok: true; projection: NormalizedLearningProjectionV2 }
  | { ok: false; reason: string };

export type LearningProjectionV3ParseResult =
  | { ok: true; projection: NormalizedLearningProjectionV3 }
  | { ok: false; reason: string };

export type LearningProjectionV4ParseResult =
  | { ok: true; projection: NormalizedLearningProjectionV4 }
  | { ok: false; reason: string };

export type AnyLearningProjectionParseResult =
  | { ok: true; projection: NormalizedLearningProjection }
  | { ok: false; reason: string };

const SKILLS: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

const OBJECTIVE_METHODS: readonly ObjectiveAttemptMethod[] = [
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
];

export const LEARNING_PROJECTION_SKILLS = SKILLS;

export const emptyObjectiveEvidenceProjection = (): Record<
  Skill,
  ObjectiveEvidenceProjectionV1
> => Object.fromEntries(SKILLS.map((skill) => [skill, {
  attemptCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  masteryEligibleCount: 0,
  masteryEligibleCorrectCount: 0,
}])) as Record<Skill, ObjectiveEvidenceProjectionV1>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isBoundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const isIsoTimestamp = (value: unknown): value is string =>
  isBoundedString(value, 40) && !Number.isNaN(new Date(value).getTime());

const observedAssessmentAccuracy = (correct: number, n: number) => {
  const interval = n === 0
    ? null
    : (() => {
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
      })();
  return {
    status: n === 0 ? "unassessed" : n < 2 ? "insufficient" : "observed",
    observedAccuracy: n === 0 ? null : Math.round((correct / n) * 100),
    confidence95: interval,
  } as const;
};

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
) => Object.keys(value).length === keys.length
  && Object.keys(value).every((key) => keys.includes(key));

const validCountSummary = (
  value: unknown,
): value is ObjectiveEvidenceProjectionV1 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "attemptCount",
      "correctCount",
      "incorrectCount",
      "masteryEligibleCount",
      "masteryEligibleCorrectCount",
    ])
    || !isNonNegativeSafeInteger(value.attemptCount)
    || !isNonNegativeSafeInteger(value.correctCount)
    || !isNonNegativeSafeInteger(value.incorrectCount)
    || !isNonNegativeSafeInteger(value.masteryEligibleCount)
    || !isNonNegativeSafeInteger(value.masteryEligibleCorrectCount)
  ) return false;
  return value.correctCount + value.incorrectCount === value.attemptCount
    && value.masteryEligibleCount <= value.attemptCount
    && value.masteryEligibleCorrectCount <= value.masteryEligibleCount
    && value.masteryEligibleCorrectCount <= value.correctCount;
};

const validLessonForm = (
  value: unknown,
  expectedEvidenceCount: number,
): value is LessonSessionFormV1 => {
  if (
    !isRecord(value)
    || !exactKeys(value, ["schemaVersion", "script", "activities"])
    || value.schemaVersion !== 1
    || (value.script !== "simplified" && value.script !== "traditional")
    || !Array.isArray(value.activities)
    || value.activities.length !== expectedEvidenceCount
  ) return false;
  const activityIds = new Set<string>();
  return value.activities.every((activity, position) => {
    if (
      !isRecord(activity)
      || !exactKeys(activity, [
        "position",
        "activityId",
        "activityVersion",
        "method",
        "skill",
        "requiredForPass",
      ])
      || activity.position !== position
      || !isBoundedString(activity.activityId, 240)
      || !isBoundedString(activity.activityVersion, 160)
      || !OBJECTIVE_METHODS.includes(
        activity.method as ObjectiveAttemptMethod,
      )
      || !SKILLS.includes(activity.skill as Skill)
      || typeof activity.requiredForPass !== "boolean"
      || activityIds.has(activity.activityId)
    ) return false;
    activityIds.add(activity.activityId);
    return true;
  });
};

const validActiveAttempt = (
  value: unknown,
  form: LessonSessionFormV1,
): value is ActiveLessonAttemptProjectionV1 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "attemptId",
      "evidenceId",
      "activityId",
      "activityVersion",
      "source",
      "method",
      "skill",
      "outcome",
      "score",
      "usedHint",
      "priorExposure",
      "gateEligible",
      "occurredAt",
    ])
    || !isBoundedString(value.attemptId, 160)
    || !isBoundedString(value.evidenceId, 160)
    || !isBoundedString(value.activityId, 240)
    || !isBoundedString(value.activityVersion, 160)
    || value.source !== "lesson"
    || !OBJECTIVE_METHODS.includes(value.method as ObjectiveAttemptMethod)
    || !SKILLS.includes(value.skill as Skill)
    || (value.outcome !== "correct" && value.outcome !== "incorrect")
    || !(
      (value.outcome === "correct" && value.score === 100)
      || (value.outcome === "incorrect" && value.score === 0)
    )
    || typeof value.usedHint !== "boolean"
    || typeof value.priorExposure !== "boolean"
    || typeof value.gateEligible !== "boolean"
    || value.gateEligible !== (!value.usedHint && !value.priorExposure)
    || !isIsoTimestamp(value.occurredAt)
  ) return false;
  const activity = form.activities.find((candidate) =>
    candidate.activityId === value.activityId
  );
  return Boolean(
    activity
    && activity.activityVersion === value.activityVersion
    && activity.method === value.method
    && activity.skill === value.skill,
  );
};

const validActiveSession = (
  value: unknown,
  projectionContentVersion: string,
  enrollmentId: string,
): value is ActiveLessonSessionProjectionV1 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "sessionId",
      "enrollmentId",
      "contentVersion",
      "lessonId",
      "lessonVersion",
      "expectedEvidenceCount",
      "form",
      "formHash",
      "status",
      "startedAt",
      "attempts",
    ])
    || !isBoundedString(value.sessionId, 160)
    || value.enrollmentId !== enrollmentId
    || value.contentVersion !== projectionContentVersion
    || !isBoundedString(value.lessonId, 160)
    || !isBoundedString(value.lessonVersion, 160)
    || !isNonNegativeSafeInteger(value.expectedEvidenceCount)
    || value.expectedEvidenceCount < 1
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || value.status !== "started"
    || !isIsoTimestamp(value.startedAt)
    || !Array.isArray(value.attempts)
    || value.attempts.length > value.expectedEvidenceCount
    || !validLessonForm(value.form, value.expectedEvidenceCount)
  ) return false;
  const form = value.form;
  if (!value.attempts.every((attempt) => validActiveAttempt(attempt, form))) {
    return false;
  }
  return new Set(value.attempts.map((attempt) => attempt.attemptId)).size
      === value.attempts.length
    && new Set(value.attempts.map((attempt) => attempt.evidenceId)).size
      === value.attempts.length
    && new Set(value.attempts.map((attempt) => attempt.activityId)).size
      === value.attempts.length;
};

/**
 * Performs strict top-level, aggregate, active-form, and attempt checks before
 * a projection can enter an owner-scoped cache. Exact keys keep raw responses
 * and answer-key fields outside this read contract.
 */
export const parseNormalizedLearningProjection = (
  value: unknown,
): LearningProjectionParseResult => {
  const objectiveEvidence = isRecord(value)
    ? value.objectiveEvidence
    : null;
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "protocolVersion",
      "resetEpoch",
      "cursor",
      "contentVersion",
      "manifestSha256",
      "enrollment",
      "activeLessonSessions",
      "submittedLessons",
      "objectiveEvidence",
    ])
    || value.protocolVersion !== LEARNING_PROJECTION_PROTOCOL_VERSION
    || !isNonNegativeSafeInteger(value.resetEpoch)
    || value.resetEpoch > 2_147_483_647
    || !isNonNegativeSafeInteger(value.cursor)
    || !isBoundedString(value.contentVersion, 160)
    || typeof value.manifestSha256 !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.manifestSha256)
    || !Array.isArray(value.activeLessonSessions)
    || !Array.isArray(value.submittedLessons)
    || !isRecord(objectiveEvidence)
    || !exactKeys(objectiveEvidence, [...SKILLS])
    || !SKILLS.every((skill) => validCountSummary(objectiveEvidence[skill]))
  ) {
    return { ok: false, reason: "Learning projection contract is invalid." };
  }

  if (value.enrollment !== null) {
    if (
      !isRecord(value.enrollment)
      || !exactKeys(value.enrollment, [
        "enrollmentId",
        "contentVersion",
        "courseId",
        "manifestSha256",
        "releaseState",
        "goal",
      ])
      || !isBoundedString(value.enrollment.enrollmentId, 160)
      || value.enrollment.contentVersion !== value.contentVersion
      || !isBoundedString(value.enrollment.courseId, 160)
      || value.enrollment.manifestSha256 !== value.manifestSha256
      || (value.enrollment.releaseState !== "beta"
        && value.enrollment.releaseState !== "published")
      || !["conversation", "hsk", "career", "travel"].includes(
        String(value.enrollment.goal),
      )
    ) {
      return { ok: false, reason: "Learning projection enrollment is invalid." };
    }
  }

  const enrollmentId = value.enrollment === null
    ? null
    : (value.enrollment as LearningProjectionEnrollmentV1).enrollmentId;
  const hasObjectiveEvidence = SKILLS.some((skill) =>
    (objectiveEvidence[skill] as ObjectiveEvidenceProjectionV1).attemptCount > 0
  );
  if (
    value.activeLessonSessions.length > 5
    || (
      enrollmentId === null
      && (
        value.activeLessonSessions.length > 0
        || value.submittedLessons.length > 0
        || hasObjectiveEvidence
      )
    )
    || (
      enrollmentId !== null
      && !value.activeLessonSessions.every((session) =>
        validActiveSession(session, value.contentVersion as string, enrollmentId)
      )
    )
  ) {
    return { ok: false, reason: "Active lesson projection is invalid." };
  }

  const submittedValid = value.submittedLessons.every((summary) => {
    if (
      !isRecord(summary)
      || !exactKeys(summary, [
        "enrollmentId",
        "contentVersion",
        "lessonId",
        "lessonVersion",
        "submittedSessionCount",
        "passedSessionCount",
        "passed",
        "bestRawScore",
        "bestGateScore",
        "lastSubmittedAt",
      ])
      || !isBoundedString(summary.enrollmentId, 160)
      || summary.enrollmentId !== enrollmentId
      || summary.contentVersion !== value.contentVersion
      || !isBoundedString(summary.lessonId, 160)
      || !isBoundedString(summary.lessonVersion, 160)
      || !isNonNegativeSafeInteger(summary.submittedSessionCount)
      || summary.submittedSessionCount < 1
      || !isNonNegativeSafeInteger(summary.passedSessionCount)
      || summary.passedSessionCount > summary.submittedSessionCount
      || typeof summary.passed !== "boolean"
      || summary.passed !== (summary.passedSessionCount > 0)
      || !isNonNegativeSafeInteger(summary.bestRawScore)
      || summary.bestRawScore > 100
      || !isNonNegativeSafeInteger(summary.bestGateScore)
      || summary.bestGateScore > 100
      || !isIsoTimestamp(summary.lastSubmittedAt)
    ) return false;
    return true;
  });
  if (!submittedValid) {
    return { ok: false, reason: "Submitted lesson projection is invalid." };
  }

  return {
    ok: true,
    projection: value as NormalizedLearningProjectionV1,
  };
};

const validAssessmentForm = (
  value: unknown,
  expected: {
    blueprintId: string;
    formVersion: string;
    scoringPolicyVersion: string;
    itemCount: number;
  },
): value is AssessmentFormV1 =>
  isExactAssessmentFormV1(value, expected.itemCount)
  && value.blueprintId === expected.blueprintId
  && value.formVersion === expected.formVersion
  && value.scoringPolicyVersion === expected.scoringPolicyVersion;

const validActiveAssessmentAttempt = (
  value: unknown,
  form: AssessmentFormV1,
): value is ActiveAssessmentAttemptProjectionV2 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "attemptId",
      "position",
      "itemId",
      "itemVersion",
      "skill",
      "measurementEligible",
      "masteryEligible",
      "status",
      "recordedAt",
    ])
    || !isBoundedString(value.attemptId, 160)
    || !isNonNegativeSafeInteger(value.position)
    || !isBoundedString(value.itemId, 240)
    || !isBoundedString(value.itemVersion, 200)
    || !SKILLS.includes(value.skill as Skill)
    || typeof value.measurementEligible !== "boolean"
    || value.masteryEligible !== false
    || value.status !== "recorded"
    || !isIsoTimestamp(value.recordedAt)
  ) return false;
  const item = form.items[value.position];
  return Boolean(
    item
    && item.itemId === value.itemId
    && item.itemVersion === value.itemVersion
    && item.skill === value.skill
    && item.measurementEligible === value.measurementEligible,
  );
};

const validActiveAssessmentSession = (
  value: unknown,
  projection: Pick<
    NormalizedLearningProjectionV2,
    "resetEpoch" | "contentVersion" | "enrollment"
  >,
): value is ActiveAssessmentSessionProjectionV2 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
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
      "attempts",
    ])
    || !isBoundedString(value.sessionId, 160)
    || value.enrollmentId !== projection.enrollment?.enrollmentId
    || value.resetEpoch !== projection.resetEpoch
    || value.contentVersion !== projection.contentVersion
    || !isBoundedString(value.blueprintId, 160)
    || !isBoundedString(value.formVersion, 200)
    || !isBoundedString(value.scoringPolicyVersion, 160)
    || !isNonNegativeSafeInteger(value.expectedItemCount)
    || value.expectedItemCount < 1
    || value.expectedItemCount > MAX_ASSESSMENT_FORM_ITEMS
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || value.status !== "started"
    || !isIsoTimestamp(value.startedAt)
    || !Array.isArray(value.attempts)
    || value.attempts.length > value.expectedItemCount
    || !validAssessmentForm(value.form, {
      blueprintId: value.blueprintId as string,
      formVersion: value.formVersion as string,
      scoringPolicyVersion: value.scoringPolicyVersion as string,
      itemCount: value.expectedItemCount as number,
    })
  ) return false;

  const form = value.form;
  if (!value.attempts.every((attempt) =>
    validActiveAssessmentAttempt(attempt, form)
  )) return false;
  const attempts = value.attempts as ActiveAssessmentAttemptProjectionV2[];
  return new Set(attempts.map((attempt) => attempt.attemptId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.position)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.itemId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.itemVersion)).size
      === attempts.length;
};

const validObservedAssessmentResult = (
  value: unknown,
  expectedSkill?: Skill,
) => {
  const keys = expectedSkill === undefined
    ? [
        "status",
        "correct",
        "n",
        "observedAccuracy",
        "confidence95",
        "masteryEligible",
      ]
    : [
        "status",
        "correct",
        "n",
        "observedAccuracy",
        "confidence95",
        "masteryEligible",
        "skill",
      ];
  if (
    !isRecord(value)
    || !exactKeys(value, keys)
    || !isNonNegativeSafeInteger(value.correct)
    || !isNonNegativeSafeInteger(value.n)
    || value.correct > value.n
    || value.masteryEligible !== false
    || (expectedSkill !== undefined && value.skill !== expectedSkill)
  ) return false;

  const expected = observedAssessmentAccuracy(value.correct, value.n);
  if (
    value.status !== expected.status
    || value.observedAccuracy !== expected.observedAccuracy
  ) return false;
  if (expected.confidence95 === null) return value.confidence95 === null;
  return isRecord(value.confidence95)
    && exactKeys(value.confidence95, ["lower", "upper"])
    && value.confidence95.lower === expected.confidence95.lower
    && value.confidence95.upper === expected.confidence95.upper;
};

const validLatestAssessmentResult = (
  value: unknown,
  projection: Pick<
    NormalizedLearningProjectionV2,
    "resetEpoch" | "contentVersion" | "enrollment"
  >,
): value is LatestAssessmentResultProjectionV2 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
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
    ])
    || !isBoundedString(value.sessionId, 160)
    || value.enrollmentId !== projection.enrollment?.enrollmentId
    || value.resetEpoch !== projection.resetEpoch
    || value.contentVersion !== projection.contentVersion
    || !isBoundedString(value.blueprintId, 160)
    || !isBoundedString(value.formVersion, 200)
    || !isBoundedString(value.scoringPolicyVersion, 160)
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || value.status !== "submitted"
    || value.calibrationStatus !== "uncalibrated"
    || value.confidenceLevel !== ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL
    || value.masteryEligible !== false
    || !validObservedAssessmentResult(value.overall)
    || !Array.isArray(value.skills)
    || value.skills.length !== SKILLS.length
    || !isIsoTimestamp(value.submittedAt)
  ) return false;

  let correct = 0;
  let evidence = 0;
  for (const [index, skill] of SKILLS.entries()) {
    const result = value.skills[index];
    if (!validObservedAssessmentResult(result, skill)) return false;
    correct += (result as { correct: number }).correct;
    evidence += (result as { n: number }).n;
  }
  const overall = value.overall as { correct: number; n: number };
  return overall.correct === correct && overall.n === evidence;
};

const validReaderForm = (
  value: unknown,
  expected: {
    storyId: string;
    storyVersion: string;
    formVersion: string;
    formSchemaVersion: number;
    script: "simplified" | "traditional";
    supportMode: "assisted" | "unassisted";
    supportPolicyVersion: string;
    itemCount: number;
  },
): value is ReaderSessionFormV1 =>
  expected.formSchemaVersion === 1
  && isExactReaderSessionFormV1(value, expected.itemCount)
  && value.storyId === expected.storyId
  && value.storyVersion === expected.storyVersion
  && value.formVersion === expected.formVersion
  && value.formSchemaVersion === expected.formSchemaVersion
  && value.script === expected.script
  && value.supportMode === expected.supportMode
  && value.supportPolicyVersion === expected.supportPolicyVersion;

const validActiveReaderAttempt = (
  value: unknown,
  session: ReaderSessionAuthorityBindingV1,
): value is ActiveReaderAttemptProjectionV3 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "attemptId",
      "evidenceId",
      "sessionId",
      "resetEpoch",
      "contentVersion",
      "formHash",
      "position",
      "itemId",
      "itemVersion",
      "method",
      "skill",
      "script",
      "supportMode",
      "supportPolicyVersion",
      "answerExposure",
      "priorExposure",
      "masteryEligible",
      "outcome",
      "score",
      "verification",
      "status",
      "recordedAt",
    ])
    || !isBoundedString(value.attemptId, 160)
    || !isBoundedString(value.evidenceId, 160)
    || value.sessionId !== session.sessionId
    || value.resetEpoch !== session.resetEpoch
    || value.contentVersion !== session.contentVersion
    || value.formHash !== session.formHash
    || !isNonNegativeSafeInteger(value.position)
    || value.position >= session.expectedItemCount
    || !isBoundedString(value.itemId, 240)
    || !isBoundedString(value.itemVersion, 200)
    || value.method !== READER_METHOD
    || value.skill !== READER_SKILL
    || value.script !== session.script
    || value.supportMode !== session.supportMode
    || value.supportPolicyVersion !== session.supportPolicyVersion
    || typeof value.priorExposure !== "boolean"
    || typeof value.masteryEligible !== "boolean"
    || (value.outcome !== "correct" && value.outcome !== "incorrect")
    || !(
      (value.outcome === "correct" && value.score === 100)
      || (value.outcome === "incorrect" && value.score === 0)
    )
    || value.verification !== "server-objective"
    || value.status !== "recorded"
    || !isIsoTimestamp(value.recordedAt)
    || Date.parse(value.recordedAt) < Date.parse(session.startedAt)
  ) return false;

  const item = session.form.items[value.position];
  return Boolean(
    item
    && item.position === value.position
    && item.itemId === value.itemId
    && item.itemVersion === value.itemVersion
    && item.method === value.method
    && item.skill === value.skill
    && item.answerExposure === value.answerExposure
    && item.priorExposure === value.priorExposure
    && item.masteryEligible === value.masteryEligible,
  );
};

const validActiveReaderSession = (
  value: unknown,
  projection: Pick<
    NormalizedLearningProjectionV3,
    "resetEpoch" | "contentVersion" | "enrollment"
  >,
): value is ActiveReaderSessionProjectionV3 => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "sessionId",
      "enrollmentId",
      "resetEpoch",
      "contentVersion",
      "storyId",
      "storyVersion",
      "formVersion",
      "formSchemaVersion",
      "script",
      "supportMode",
      "supportPolicyVersion",
      "expectedItemCount",
      "form",
      "formHash",
      "status",
      "startedAt",
      "attempts",
    ])
    || !isBoundedString(value.sessionId, 160)
    || value.enrollmentId !== projection.enrollment?.enrollmentId
    || value.resetEpoch !== projection.resetEpoch
    || value.contentVersion !== projection.contentVersion
    || !isBoundedString(value.storyId, 160)
    || !isBoundedString(value.storyVersion, 200)
    || !isBoundedString(value.formVersion, 200)
    || value.formSchemaVersion !== 1
    || (value.script !== "simplified" && value.script !== "traditional")
    || (value.supportMode !== "assisted"
      && value.supportMode !== "unassisted")
    || !isBoundedString(value.supportPolicyVersion, 160)
    || !isNonNegativeSafeInteger(value.expectedItemCount)
    || value.expectedItemCount < 1
    || value.expectedItemCount > MAX_READER_FORM_ITEMS
    || typeof value.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(value.formHash)
    || value.status !== "started"
    || !isIsoTimestamp(value.startedAt)
    || !Array.isArray(value.attempts)
    || value.attempts.length > value.expectedItemCount
    || !validReaderForm(value.form, {
      storyId: value.storyId as string,
      storyVersion: value.storyVersion as string,
      formVersion: value.formVersion as string,
      formSchemaVersion: value.formSchemaVersion as number,
      script: value.script as "simplified" | "traditional",
      supportMode: value.supportMode as "assisted" | "unassisted",
      supportPolicyVersion: value.supportPolicyVersion as string,
      itemCount: value.expectedItemCount as number,
    })
  ) return false;

  const session = value as unknown as ReaderSessionAuthorityBindingV1 & {
    attempts: unknown[];
  };
  if (!session.attempts.every((attempt) =>
    validActiveReaderAttempt(attempt, session)
  )) return false;

  const attempts = session.attempts as ActiveReaderAttemptProjectionV3[];
  return new Set(attempts.map((attempt) => attempt.attemptId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.evidenceId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.position)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.itemId)).size
      === attempts.length
    && new Set(attempts.map((attempt) => attempt.itemVersion)).size
      === attempts.length;
};

export const toNormalizedLearningProjectionV1 = (
  projection:
    | NormalizedLearningProjectionV2
    | NormalizedLearningProjectionV3
    | NormalizedLearningProjectionV4,
): NormalizedLearningProjectionV1 => ({
  protocolVersion: LEARNING_PROJECTION_PROTOCOL_VERSION,
  resetEpoch: projection.resetEpoch,
  cursor: projection.cursor,
  contentVersion: projection.contentVersion,
  manifestSha256: projection.manifestSha256,
  enrollment: projection.enrollment,
  activeLessonSessions: projection.activeLessonSessions,
  submittedLessons: projection.submittedLessons,
  objectiveEvidence: projection.objectiveEvidence,
});

export const toNormalizedLearningProjectionV2 = (
  projection: NormalizedLearningProjectionV3 | NormalizedLearningProjectionV4,
): NormalizedLearningProjectionV2 => ({
  protocolVersion: LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
  resetEpoch: projection.resetEpoch,
  cursor: projection.cursor,
  contentVersion: projection.contentVersion,
  manifestSha256: projection.manifestSha256,
  enrollment: projection.enrollment,
  activeLessonSessions: projection.activeLessonSessions,
  submittedLessons: projection.submittedLessons,
  objectiveEvidence: projection.objectiveEvidence,
  activeAssessmentSession: projection.activeAssessmentSession,
  latestAssessmentResult: projection.latestAssessmentResult,
});

export const toNormalizedLearningProjectionV3 = (
  projection: NormalizedLearningProjectionV4,
): NormalizedLearningProjectionV3 => ({
  protocolVersion: LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
  resetEpoch: projection.resetEpoch,
  cursor: projection.cursor,
  contentVersion: projection.contentVersion,
  manifestSha256: projection.manifestSha256,
  enrollment: projection.enrollment,
  activeLessonSessions: projection.activeLessonSessions,
  submittedLessons: projection.submittedLessons,
  objectiveEvidence: projection.objectiveEvidence,
  activeAssessmentSession: projection.activeAssessmentSession,
  latestAssessmentResult: projection.latestAssessmentResult,
  activeReaderSession: projection.activeReaderSession,
});

/**
 * V2 is deliberately a separate strict contract. Keeping the V1 parser exact
 * means an older bundle will reject a V2 body instead of silently accepting
 * assessment fields it does not understand.
 */
export const parseNormalizedLearningProjectionV2 = (
  value: unknown,
): LearningProjectionV2ParseResult => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "protocolVersion",
      "resetEpoch",
      "cursor",
      "contentVersion",
      "manifestSha256",
      "enrollment",
      "activeLessonSessions",
      "submittedLessons",
      "objectiveEvidence",
      "activeAssessmentSession",
      "latestAssessmentResult",
    ])
    || value.protocolVersion !== LEARNING_PROJECTION_V2_PROTOCOL_VERSION
  ) {
    return { ok: false, reason: "Learning projection V2 contract is invalid." };
  }

  const core = parseNormalizedLearningProjection({
    protocolVersion: LEARNING_PROJECTION_PROTOCOL_VERSION,
    resetEpoch: value.resetEpoch,
    cursor: value.cursor,
    contentVersion: value.contentVersion,
    manifestSha256: value.manifestSha256,
    enrollment: value.enrollment,
    activeLessonSessions: value.activeLessonSessions,
    submittedLessons: value.submittedLessons,
    objectiveEvidence: value.objectiveEvidence,
  });
  if (!core.ok) return { ok: false, reason: core.reason };

  const projection = value as NormalizedLearningProjectionV2;
  if (projection.enrollment === null) {
    if (
      projection.activeAssessmentSession !== null
      || projection.latestAssessmentResult !== null
    ) {
      return {
        ok: false,
        reason: "Assessment projection requires an exact released enrollment.",
      };
    }
  } else {
    if (
      projection.activeAssessmentSession !== null
      && !validActiveAssessmentSession(
        projection.activeAssessmentSession,
        projection,
      )
    ) {
      return { ok: false, reason: "Active assessment projection is invalid." };
    }
    if (
      projection.latestAssessmentResult !== null
      && !validLatestAssessmentResult(
        projection.latestAssessmentResult,
        projection,
      )
    ) {
      return { ok: false, reason: "Latest assessment result is invalid." };
    }
    if (
      projection.activeAssessmentSession !== null
      && projection.latestAssessmentResult !== null
      && projection.activeAssessmentSession.sessionId
        === projection.latestAssessmentResult.sessionId
    ) {
      return {
        ok: false,
        reason: "One assessment session cannot be both active and submitted.",
      };
    }
  }
  return { ok: true, projection };
};

/**
 * V3 adds one immutable Reader resume aggregate while preserving the exact V2
 * assessment contract. Older parsers continue to reject the extra field.
 */
export const parseNormalizedLearningProjectionV3 = (
  value: unknown,
): LearningProjectionV3ParseResult => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "protocolVersion",
      "resetEpoch",
      "cursor",
      "contentVersion",
      "manifestSha256",
      "enrollment",
      "activeLessonSessions",
      "submittedLessons",
      "objectiveEvidence",
      "activeAssessmentSession",
      "latestAssessmentResult",
      "activeReaderSession",
    ])
    || value.protocolVersion !== LEARNING_PROJECTION_V3_PROTOCOL_VERSION
  ) {
    return { ok: false, reason: "Learning projection V3 contract is invalid." };
  }

  const v2 = parseNormalizedLearningProjectionV2({
    protocolVersion: LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
    resetEpoch: value.resetEpoch,
    cursor: value.cursor,
    contentVersion: value.contentVersion,
    manifestSha256: value.manifestSha256,
    enrollment: value.enrollment,
    activeLessonSessions: value.activeLessonSessions,
    submittedLessons: value.submittedLessons,
    objectiveEvidence: value.objectiveEvidence,
    activeAssessmentSession: value.activeAssessmentSession,
    latestAssessmentResult: value.latestAssessmentResult,
  });
  if (!v2.ok) return { ok: false, reason: v2.reason };

  const projection = value as NormalizedLearningProjectionV3;
  if (projection.enrollment === null) {
    if (projection.activeReaderSession !== null) {
      return {
        ok: false,
        reason: "Reader projection requires an exact released enrollment.",
      };
    }
  } else if (
    projection.activeReaderSession !== null
    && !validActiveReaderSession(
      projection.activeReaderSession,
      projection,
    )
  ) {
    return { ok: false, reason: "Active Reader projection is invalid." };
  }

  return { ok: true, projection };
};

/**
 * V4 carries one strict per-skill breadth aggregate. It is intentionally a new
 * contract instead of changing V1-V3 in place, so old clients keep receiving
 * and accepting the exact representation they requested.
 */
export const parseNormalizedLearningProjectionV4 = (
  value: unknown,
): LearningProjectionV4ParseResult => {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "protocolVersion",
      "resetEpoch",
      "cursor",
      "contentVersion",
      "manifestSha256",
      "enrollment",
      "activeLessonSessions",
      "submittedLessons",
      "objectiveEvidence",
      "activeAssessmentSession",
      "latestAssessmentResult",
      "activeReaderSession",
      "gateEligibleCorrectActivityCounts",
    ])
    || value.protocolVersion !== LEARNING_PROJECTION_V4_PROTOCOL_VERSION
    || !isRecord(value.gateEligibleCorrectActivityCounts)
    || !exactKeys(value.gateEligibleCorrectActivityCounts, [...SKILLS])
  ) {
    return { ok: false, reason: "Learning projection V4 contract is invalid." };
  }

  const v3 = parseNormalizedLearningProjectionV3({
    protocolVersion: LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
    resetEpoch: value.resetEpoch,
    cursor: value.cursor,
    contentVersion: value.contentVersion,
    manifestSha256: value.manifestSha256,
    enrollment: value.enrollment,
    activeLessonSessions: value.activeLessonSessions,
    submittedLessons: value.submittedLessons,
    objectiveEvidence: value.objectiveEvidence,
    activeAssessmentSession: value.activeAssessmentSession,
    latestAssessmentResult: value.latestAssessmentResult,
    activeReaderSession: value.activeReaderSession,
  });
  if (!v3.ok) return { ok: false, reason: v3.reason };

  for (const skill of SKILLS) {
    const count = value.gateEligibleCorrectActivityCounts[skill];
    if (
      !isNonNegativeSafeInteger(count)
      || count > v3.projection.objectiveEvidence[skill].correctCount
    ) {
      return {
        ok: false,
        reason: "Learning projection V4 breadth aggregate is invalid.",
      };
    }
  }
  return {
    ok: true,
    projection: value as NormalizedLearningProjectionV4,
  };
};

export const parseAnyNormalizedLearningProjection = (
  value: unknown,
): AnyLearningProjectionParseResult => {
  if (isRecord(value) && value.protocolVersion === 4) {
    return parseNormalizedLearningProjectionV4(value);
  }
  if (isRecord(value) && value.protocolVersion === 3) {
    return parseNormalizedLearningProjectionV3(value);
  }
  if (isRecord(value) && value.protocolVersion === 2) {
    return parseNormalizedLearningProjectionV2(value);
  }
  return parseNormalizedLearningProjection(value);
};
