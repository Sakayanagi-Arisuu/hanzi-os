import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
} from "../data/curriculum";
import {
  emptyObjectiveEvidenceProjection,
  LEARNING_PROJECTION_PROTOCOL_VERSION,
  LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
  LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
  type ActiveAssessmentAttemptProjectionV2,
  type ActiveAssessmentSessionProjectionV2,
  type ActiveLessonAttemptProjectionV1,
  type ActiveLessonSessionProjectionV1,
  type ActiveReaderAttemptProjectionV3,
  type ActiveReaderSessionProjectionV3,
  type LatestAssessmentResultProjectionV2,
  type LearningProjectionEnrollmentV1,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
  type SubmittedLessonProjectionV1,
} from "../learning/projectionProtocol";
import type { Skill } from "../types";
import {
  ASSESSMENT_SESSION_FORM_SCHEMA_VERSION,
  hashAssessmentForm,
  isExactAssessmentFormV1,
  MAX_ASSESSMENT_FORM_ITEMS,
  type AssessmentFormV1,
} from "../assessment/assessmentSessionProtocol";
import {
  ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL,
} from "../assessment/assessmentSubmissionProtocol";
import {
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "../content/currentPackage";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  promotedCourseReleaseState,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import type { D1Database, D1RunResult } from "./d1";
import {
  readCurrentLearningResetEpoch,
} from "./learningResetEpoch";
import { validateStoredLessonSessionForm } from "./lessonSessionFormValidation";
import {
  NORMALIZED_LEARNING_CHANGE_ENTITIES,
} from "./normalizedLearningChange";
import {
  CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
  FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
  isIssuableAuthoritativeAssessmentItem,
  type AuthoritativeAssessmentBlueprint,
  type AuthoritativeAssessmentItem,
} from "./authoritativeAssessmentItemBank";
import {
  ASSESSMENT_RESULT_SKILLS,
  assessmentObservedResult,
} from "./assessmentScoring";
import {
  READER_METHOD,
  READER_SESSION_FORM_SCHEMA_VERSION,
  READER_SKILL,
  hashReaderSessionForm,
  isExactReaderSessionFormV1,
  type ReaderSessionFormHash,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import {
  MAX_READER_FORM_ITEMS,
  readerPolicyAllowsMastery,
  type ReaderScript,
  type ReaderSupportMode,
} from "../reader/protocolSupport";
import { canonicalStringify } from "../sync/document";
import {
  READER_OBJECTIVE_SCORING_VERSION,
} from "./readerRepository";
import {
  CURRENT_AUTHORITATIVE_READER_STORIES,
  authoritativeReaderItemByVersion,
  readerPresentationForItem,
  type AuthoritativeReaderStory,
} from "./authoritativeReaderItemBank";

const MAX_RESET_READ_ATTEMPTS = 2;
const MAX_ACTIVE_SESSIONS = 5;
const MAX_ACTIVE_ATTEMPTS = 200;
const MAX_ACTIVE_ASSESSMENT_SESSIONS = 1;
const MAX_ACTIVE_ASSESSMENT_ATTEMPTS = MAX_ASSESSMENT_FORM_ITEMS;
const MAX_ACTIVE_READER_SESSIONS = 1;
const MAX_ACTIVE_READER_ATTEMPTS = MAX_READER_FORM_ITEMS;
const MAX_READER_EXPOSURE_HISTORY = 10_000;
const NORMALIZED_CHANGE_ENTITY_PLACEHOLDERS =
  NORMALIZED_LEARNING_CHANGE_ENTITIES.map(() => "?").join(", ");

const RELEASED_LESSON_BY_ID = new Map(
  RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]),
);

const OBJECTIVE_METHODS = new Set([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
]);

const SKILLS = new Set<Skill>([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);

export class LearningProjectionContentUnavailableError extends Error {
  readonly code = "LEARNING_PROJECTION_CONTENT_UNAVAILABLE";

  constructor(message = "The current content package is not released for learning projections.") {
    super(message);
    this.name = "LearningProjectionContentUnavailableError";
  }
}

export class LearningProjectionIntegrityError extends Error {
  readonly code = "LEARNING_PROJECTION_INTEGRITY_ERROR";

  constructor(message = "Stored normalized learning data cannot form a safe projection.") {
    super(message);
    this.name = "LearningProjectionIntegrityError";
  }
}

export class LearningProjectionResetRaceError extends Error {
  readonly code = "LEARNING_PROJECTION_RESET_RACE";

  constructor() {
    super("The learning reset epoch changed while the projection was being read.");
    this.name = "LearningProjectionResetRaceError";
  }
}

type ResetEpochReader = (
  database: D1Database,
  userId: string,
) => Promise<number>;

type EnrollmentRow = {
  enrollmentId: string;
  contentVersion: string;
  courseId: string;
  manifestSha256: string;
  releaseState: string;
  goal: string;
};

type CursorRow = { cursor: number };

type ActiveSessionRow = {
  sessionId: string;
  enrollmentId: string;
  contentVersion: string;
  lessonId: string;
  lessonVersion: string;
  expectedEvidenceCount: number;
  formSchemaVersion: number | null;
  formScript: string | null;
  formManifestJson: string | null;
  formManifestHash: string | null;
  startedAt: number;
};

type ActiveAttemptRow = {
  attemptId: string;
  evidenceId: string | null;
  sessionId: string;
  activityId: string;
  activityVersion: string;
  source: string;
  method: string;
  skill: string;
  attemptOutcome: string;
  evidenceOutcome: string | null;
  attemptScore: number | null;
  evidenceScore: number | null;
  usedHint: number;
  priorExposure: number;
  masteryEligible: number | null;
  verified: number | null;
  occurredAt: number;
};

type SubmittedLessonRow = {
  enrollmentId: string;
  contentVersion: string;
  lessonId: string;
  lessonVersion: string;
  submittedSessionCount: number;
  passedSessionCount: number;
  bestRawScore: number | null;
  bestGateScore: number | null;
  lastSubmittedAt: number | null;
};

type EvidenceSummaryRow = {
  skill: string;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  masteryEligibleCount: number;
  masteryEligibleCorrectCount: number;
};

type ActiveAssessmentSessionRow = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  expectedItemCount: number;
  formSchemaVersion: number;
  formManifestJson: string;
  formHash: string;
  startedAt: number;
};

type ActiveAssessmentAttemptRow = {
  attemptId: string;
  sessionId: string;
  position: number;
  itemId: string;
  itemVersion: string;
  skill: string;
  measurementEligible: number;
  recordedAt: number;
};

type LatestAssessmentSessionRow = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  expectedItemCount: number;
  formSchemaVersion: number;
  formManifestJson: string;
  formHash: string;
  evidenceCount: number;
  correctCount: number;
  observedAccuracy: number | null;
  confidenceLower: number | null;
  confidenceUpper: number | null;
  submittedAt: number;
};

type AssessmentSkillResultRow = {
  sessionId: string;
  resetEpoch: number;
  contentVersion: string;
  skill: string;
  status: string;
  correctCount: number;
  evidenceCount: number;
  observedAccuracy: number | null;
  confidenceLower: number | null;
  confidenceUpper: number | null;
  masteryEligible: number;
  scoringPolicyVersion: string;
};

type ActiveReaderSessionRow = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  storyId: string;
  storyVersion: string;
  formVersion: string;
  formSchemaVersion: number;
  formManifestJson: string;
  formHash: string;
  script: string;
  supportMode: string;
  supportPolicyVersion: string;
  expectedItemCount: number;
  startedAt: number;
};

type ActiveReaderExposureRow = {
  sessionId: string;
  claimSessionId: string;
  claimResetEpoch: number;
  contentVersion: string;
  storyId: string;
  itemId: string;
  itemVersion: string;
  exposureGroupId: string;
  equivalentGroupId: string;
  exposedAt: number;
};

type ActiveReaderAttemptRow = {
  attemptId: string;
  evidenceId: string | null;
  sessionId: string;
  attemptEnrollmentId: string;
  attemptLessonSessionId: string | null;
  evidenceLessonSessionId: string | null;
  resetEpoch: number;
  contentVersion: string;
  formHash: string;
  position: number;
  itemId: string;
  itemVersion: string;
  activityId: string;
  activityVersion: string;
  source: string;
  method: string;
  skill: string;
  outcome: string;
  score: number | null;
  usedHint: number;
  priorExposure: number;
  requiredForPass: number;
  scoringVersion: string;
  occurredAt: number;
  receivedAt: number;
  evidenceRowCount: number;
  evidenceEnrollmentId: string | null;
  evidencePolicyVersion: string | null;
  evidenceActivityId: string | null;
  evidenceActivityVersion: string | null;
  evidenceSource: string | null;
  evidenceMethod: string | null;
  evidenceSkill: string | null;
  evidenceOutcome: string | null;
  evidenceScore: number | null;
  evidenceVerified: number | null;
  evidenceMasteryEligible: number | null;
  evidenceMetadataJson: string | null;
  evidenceOccurredAt: number | null;
  evidenceRecordedAt: number | null;
};

type StoredAssessmentFormRow = Pick<
  ActiveAssessmentSessionRow,
  | "blueprintId"
  | "formVersion"
  | "scoringPolicyVersion"
  | "expectedItemCount"
  | "formSchemaVersion"
  | "formManifestJson"
  | "formHash"
>;

const rows = <T>(result: D1RunResult<T>, label: string): T[] => {
  if (!result.success || !Array.isArray(result.results)) {
    throw new LearningProjectionIntegrityError(
      `Unable to read ${label} for the normalized learning projection.`,
    );
  }
  return result.results;
};

const safeInteger = (value: unknown, minimum = 0) =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= minimum;

const sameStringArray = (left: unknown, right: readonly string[]) =>
  Array.isArray(left)
  && left.length === right.length
  && left.every((value, index) => value === right[index]);

const storedEstimateMatches = (
  row: {
    status?: string;
    correctCount: number;
    evidenceCount: number;
    observedAccuracy: number | null;
    confidenceLower: number | null;
    confidenceUpper: number | null;
  },
) => {
  if (
    !safeInteger(row.correctCount)
    || !safeInteger(row.evidenceCount)
    || row.correctCount > row.evidenceCount
  ) return false;
  const expected = assessmentObservedResult(
    row.correctCount,
    row.evidenceCount,
  );
  return (row.status === undefined || row.status === expected.status)
    && row.observedAccuracy === expected.observedAccuracy
    && row.confidenceLower === (expected.confidence95?.lower ?? null)
    && row.confidenceUpper === (expected.confidence95?.upper ?? null);
};

const timestamp = (value: unknown, label: string) => {
  if (!safeInteger(value)) {
    throw new LearningProjectionIntegrityError(`${label} timestamp is invalid.`);
  }
  const date = new Date(value as number);
  if (Number.isNaN(date.getTime())) {
    throw new LearningProjectionIntegrityError(`${label} timestamp is invalid.`);
  }
  return date.toISOString();
};

const boundedStoredIdentifier = (
  value: unknown,
  maximum: number,
): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && value === value.trim()
  && !value.includes("\0");

const readerEvidencePolicyVersion = (supportPolicyVersion: string) =>
  `${supportPolicyVersion}:${READER_OBJECTIVE_SCORING_VERSION}`;

const readerEvidenceMetadata = (
  session: ActiveReaderSessionRow,
  item: ReaderSessionFormV1["items"][number],
) => ({
  readerSessionId: session.sessionId,
  storyId: session.storyId,
  storyVersion: session.storyVersion,
  formVersion: session.formVersion,
  formHash: session.formHash,
  position: item.position,
  script: session.script,
  supportMode: session.supportMode,
  supportPolicyVersion: session.supportPolicyVersion,
  answerExposure: item.answerExposure,
  priorExposure: item.priorExposure,
});

const assertReleasedLessonBinding = (
  lessonId: string,
  lessonVersion: string,
) => {
  const lesson = RELEASED_LESSON_BY_ID.get(lessonId);
  if (
    !lesson
    || lesson.contentVersion !== CONTENT_VERSION
    || lessonVersion !== `${lesson.contentVersion}:${lesson.id}:1`
  ) {
    throw new LearningProjectionIntegrityError(
      "A normalized session is not bound to an exact current released lesson.",
    );
  }
};

const eligibleEnrollmentSql = `
  enrollment.user_id = ?
  AND enrollment.course_version_id = ?
  AND enrollment.status = 'active'
  AND course.id = enrollment.course_version_id
  AND course.id = ?
  AND course.manifest_hash = ?
  AND course.release_state = ?
  AND course.linguistic_review_status = 'approved'`;

const eligibleEnrollmentBindings = (
  userId: string,
  releaseState: "beta" | "published",
) => [
  userId,
  CONTENT_VERSION,
  CONTENT_VERSION,
  CURRENT_CONTENT_MANIFEST_SHA256,
  releaseState,
];

export class LearningProjectionRepository {
  constructor(
    private readonly database: D1Database,
    private readonly releasePolicy: ContentReleasePolicy =
      CURRENT_CONTENT_RELEASE_POLICY,
    private readonly readResetEpoch: ResetEpochReader =
      readCurrentLearningResetEpoch,
    private readonly assessmentItems: readonly AuthoritativeAssessmentItem[] =
      CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
    private readonly assessmentBlueprint: AuthoritativeAssessmentBlueprint =
      FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
    private readonly readerStories: readonly AuthoritativeReaderStory[] =
      CURRENT_AUTHORITATIVE_READER_STORIES,
  ) {}

  async read(userId: string): Promise<NormalizedLearningProjectionV1> {
    return this.readConsistently(
      userId,
      (resetEpoch, releaseState) =>
        this.readAtEpoch(userId, resetEpoch, releaseState, 1),
    );
  }

  async readV2(userId: string): Promise<NormalizedLearningProjectionV2> {
    return this.readConsistently(
      userId,
      (resetEpoch, releaseState) =>
        this.readAtEpoch(userId, resetEpoch, releaseState, 2),
    );
  }

  async readV3(userId: string): Promise<NormalizedLearningProjectionV3> {
    return this.readConsistently(
      userId,
      (resetEpoch, releaseState) =>
        this.readAtEpoch(userId, resetEpoch, releaseState, 3),
    );
  }

  private async readConsistently<T>(
    userId: string,
    readAtEpoch: (
      resetEpoch: number,
      releaseState: "beta" | "published",
    ) => Promise<T>,
  ): Promise<T> {
    const releaseState = promotedCourseReleaseState(this.releasePolicy);
    if (
      !isPromotedContentReleasePolicy(this.releasePolicy)
      || releaseState === null
    ) {
      throw new LearningProjectionContentUnavailableError();
    }

    for (let readAttempt = 0; readAttempt < MAX_RESET_READ_ATTEMPTS; readAttempt += 1) {
      const resetEpoch = await this.readResetEpoch(this.database, userId);
      try {
        const projection = await readAtEpoch(resetEpoch, releaseState);
        const confirmedEpoch = await this.readResetEpoch(this.database, userId);
        if (confirmedEpoch === resetEpoch) return projection;
      } catch (error) {
        const confirmedEpoch = await this.readResetEpoch(this.database, userId);
        if (confirmedEpoch === resetEpoch) throw error;
      }
    }

    throw new LearningProjectionResetRaceError();
  }

  private async readAtEpoch(
    userId: string,
    resetEpoch: number,
    releaseState: "beta" | "published",
    protocolVersion: 1,
  ): Promise<NormalizedLearningProjectionV1>;
  private async readAtEpoch(
    userId: string,
    resetEpoch: number,
    releaseState: "beta" | "published",
    protocolVersion: 2,
  ): Promise<NormalizedLearningProjectionV2>;
  private async readAtEpoch(
    userId: string,
    resetEpoch: number,
    releaseState: "beta" | "published",
    protocolVersion: 3,
  ): Promise<NormalizedLearningProjectionV3>;
  private async readAtEpoch(
    userId: string,
    resetEpoch: number,
    releaseState: "beta" | "published",
    protocolVersion: 1 | 2 | 3,
  ): Promise<
    | NormalizedLearningProjectionV1
    | NormalizedLearningProjectionV2
    | NormalizedLearningProjectionV3
  > {
    const includeAssessment = protocolVersion >= 2;
    const includeReader = protocolVersion >= 3;
    const enrollmentBindings = eligibleEnrollmentBindings(userId, releaseState);
    const results = await this.database.batch([
      this.database.prepare(
        `SELECT enrollment.id AS enrollmentId,
                enrollment.course_version_id AS contentVersion,
                course.course_id AS courseId,
                course.manifest_hash AS manifestSha256,
                course.release_state AS releaseState,
                enrollment.goal AS goal
         FROM enrollments enrollment
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE ${eligibleEnrollmentSql}
         LIMIT 1`,
      ).bind(...enrollmentBindings),
      this.database.prepare(
        `SELECT COALESCE(MAX(change.seq), 0) AS cursor
         FROM sync_changes change
         WHERE change.user_id = ?
           AND (
             (
               change.reset_epoch = ?
               AND change.entity_type IN (${NORMALIZED_CHANGE_ENTITY_PLACEHOLDERS})
             )
             OR (
               change.entity_type = 'learning_document'
               AND json_extract(change.payload_json, '$.kind') = 'reset'
               AND (change.reset_epoch = ? OR change.reset_epoch IS NULL)
             )
           )`,
      ).bind(
        userId,
        resetEpoch,
        ...NORMALIZED_LEARNING_CHANGE_ENTITIES,
        resetEpoch,
      ),
      this.database.prepare(
        `SELECT session.id AS sessionId,
                session.enrollment_id AS enrollmentId,
                session.content_version AS contentVersion,
                session.lesson_id AS lessonId,
                session.lesson_version AS lessonVersion,
                session.expected_evidence_count AS expectedEvidenceCount,
                session.form_schema_version AS formSchemaVersion,
                session.form_script AS formScript,
                session.form_manifest_json AS formManifestJson,
                session.form_manifest_hash AS formManifestHash,
                session.started_at AS startedAt
         FROM lesson_sessions session
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE session.user_id = ?
           AND session.reset_epoch = ?
           AND session.status = 'started'
           AND session.content_version = ?
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, session.id ASC
         LIMIT ?`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
        MAX_ACTIVE_SESSIONS + 1,
      ),
      this.database.prepare(
        `SELECT attempt.id AS attemptId,
                evidence.id AS evidenceId,
                attempt.session_id AS sessionId,
                attempt.activity_id AS activityId,
                attempt.activity_version AS activityVersion,
                attempt.source AS source,
                attempt.method AS method,
                attempt.skill AS skill,
                attempt.outcome AS attemptOutcome,
                evidence.outcome AS evidenceOutcome,
                attempt.score AS attemptScore,
                evidence.score AS evidenceScore,
                attempt.used_hint AS usedHint,
                attempt.prior_exposure AS priorExposure,
                evidence.mastery_eligible AS masteryEligible,
                evidence.verified AS verified,
                attempt.occurred_at AS occurredAt
         FROM learning_attempts attempt
         INNER JOIN lesson_sessions session
           ON session.user_id = attempt.user_id
          AND session.id = attempt.session_id
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         LEFT JOIN learning_evidence evidence
           ON evidence.user_id = attempt.user_id
          AND evidence.attempt_id = attempt.id
          AND evidence.reset_epoch = attempt.reset_epoch
          AND evidence.policy_version = attempt.scoring_version
          AND evidence.skill = attempt.skill
         WHERE attempt.user_id = ?
           AND attempt.reset_epoch = ?
           AND attempt.content_version = ?
           AND attempt.source = 'lesson'
           AND session.reset_epoch = attempt.reset_epoch
           AND session.status = 'started'
           AND session.content_version = attempt.content_version
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, attempt.occurred_at ASC, attempt.id ASC
         LIMIT ?`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
        MAX_ACTIVE_ATTEMPTS + 1,
      ),
      this.database.prepare(
        `SELECT session.enrollment_id AS enrollmentId,
                session.content_version AS contentVersion,
                session.lesson_id AS lessonId,
                session.lesson_version AS lessonVersion,
                COUNT(*) AS submittedSessionCount,
                SUM(CASE WHEN session.passed = 1 THEN 1 ELSE 0 END) AS passedSessionCount,
                MAX(session.raw_score) AS bestRawScore,
                MAX(session.gate_score) AS bestGateScore,
                MAX(session.submitted_at) AS lastSubmittedAt
         FROM lesson_sessions session
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE session.user_id = ?
           AND session.reset_epoch = ?
           AND session.status = 'submitted'
           AND session.content_version = ?
           AND ${eligibleEnrollmentSql}
         GROUP BY session.enrollment_id, session.content_version,
                  session.lesson_id, session.lesson_version
         ORDER BY session.lesson_id ASC, session.lesson_version ASC`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
      ),
      this.database.prepare(
        `SELECT evidence.skill AS skill,
                COUNT(*) AS attemptCount,
                SUM(CASE WHEN evidence.outcome = 'correct' THEN 1 ELSE 0 END) AS correctCount,
                SUM(CASE WHEN evidence.outcome = 'incorrect' THEN 1 ELSE 0 END) AS incorrectCount,
                SUM(CASE WHEN evidence.mastery_eligible = 1 THEN 1 ELSE 0 END) AS masteryEligibleCount,
                SUM(CASE WHEN evidence.mastery_eligible = 1 AND evidence.outcome = 'correct' THEN 1 ELSE 0 END) AS masteryEligibleCorrectCount
         FROM learning_evidence evidence
         INNER JOIN learning_attempts attempt
           ON attempt.user_id = evidence.user_id
          AND attempt.id = evidence.attempt_id
          AND attempt.reset_epoch = evidence.reset_epoch
          AND attempt.content_version = evidence.content_version
          AND attempt.activity_id = evidence.activity_id
          AND attempt.activity_version = evidence.activity_version
          AND attempt.source = evidence.source
          AND attempt.method = evidence.method
          AND attempt.skill = evidence.skill
          AND attempt.outcome = evidence.outcome
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = evidence.user_id
          AND enrollment.id = evidence.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE evidence.user_id = ?
           AND evidence.reset_epoch = ?
           AND evidence.content_version = ?
           AND evidence.attempt_id IS NOT NULL
           AND evidence.verified = 1
           AND evidence.source IN ('lesson', 'reader')
           AND evidence.method IN (
             'meaning-selection',
             'phonology-recognition',
             'listening-selection',
             'typed-character-recall',
             'reading-comprehension'
           )
           AND evidence.outcome IN ('correct', 'incorrect')
           AND ${eligibleEnrollmentSql}
         GROUP BY evidence.skill
         ORDER BY evidence.skill ASC`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
      ),
      ...(includeAssessment ? [
      this.database.prepare(
        `SELECT session.id AS sessionId,
                session.enrollment_id AS enrollmentId,
                session.reset_epoch AS resetEpoch,
                session.content_version AS contentVersion,
                session.blueprint_id AS blueprintId,
                session.form_version AS formVersion,
                session.scoring_policy_version AS scoringPolicyVersion,
                session.expected_item_count AS expectedItemCount,
                session.form_schema_version AS formSchemaVersion,
                session.form_manifest_json AS formManifestJson,
                session.form_manifest_hash AS formHash,
                session.started_at AS startedAt
         FROM assessment_sessions session
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE session.user_id = ?
           AND session.reset_epoch = ?
           AND session.status = 'started'
           AND session.content_version = ?
           AND session.blueprint_id = ?
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, session.id ASC
         LIMIT ?`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        this.assessmentBlueprint.id,
        ...enrollmentBindings,
        MAX_ACTIVE_ASSESSMENT_SESSIONS + 1,
      ),
      this.database.prepare(
        `SELECT attempt.id AS attemptId,
                attempt.session_id AS sessionId,
                attempt.position AS position,
                attempt.item_id AS itemId,
                attempt.item_version AS itemVersion,
                attempt.skill AS skill,
                attempt.measurement_eligible AS measurementEligible,
                attempt.received_at AS recordedAt
         FROM assessment_attempts attempt
         INNER JOIN assessment_sessions session
           ON session.user_id = attempt.user_id
          AND session.id = attempt.session_id
          AND session.reset_epoch = attempt.reset_epoch
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE attempt.user_id = ?
           AND attempt.reset_epoch = ?
           AND attempt.content_version = ?
           AND session.status = 'started'
           AND session.content_version = attempt.content_version
           AND session.blueprint_id = ?
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, attempt.position ASC, attempt.id ASC
         LIMIT ?`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        this.assessmentBlueprint.id,
        ...enrollmentBindings,
        MAX_ACTIVE_ASSESSMENT_ATTEMPTS + 1,
      ),
      this.database.prepare(
        `SELECT session.id AS sessionId,
                session.enrollment_id AS enrollmentId,
                session.reset_epoch AS resetEpoch,
                session.content_version AS contentVersion,
                session.blueprint_id AS blueprintId,
                session.form_version AS formVersion,
                session.scoring_policy_version AS scoringPolicyVersion,
                session.expected_item_count AS expectedItemCount,
                session.form_schema_version AS formSchemaVersion,
                session.form_manifest_json AS formManifestJson,
                session.form_manifest_hash AS formHash,
                session.measurement_evidence_count AS evidenceCount,
                session.measurement_correct_count AS correctCount,
                session.observed_accuracy AS observedAccuracy,
                session.confidence_lower AS confidenceLower,
                session.confidence_upper AS confidenceUpper,
                session.terminal_at AS submittedAt
         FROM assessment_sessions session
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course ON course.id = enrollment.course_version_id
         WHERE session.user_id = ?
           AND session.reset_epoch = ?
           AND session.status = 'submitted'
           AND session.content_version = ?
           AND session.blueprint_id = ?
           AND ${eligibleEnrollmentSql}
         ORDER BY session.terminal_at DESC, session.id DESC
         LIMIT 1`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        this.assessmentBlueprint.id,
        ...enrollmentBindings,
      ),
      this.database.prepare(
        `SELECT result.session_id AS sessionId,
                result.reset_epoch AS resetEpoch,
                result.content_version AS contentVersion,
                result.skill AS skill,
                result.status AS status,
                result.correct_count AS correctCount,
                result.evidence_count AS evidenceCount,
                result.observed_accuracy AS observedAccuracy,
                result.confidence_lower AS confidenceLower,
                result.confidence_upper AS confidenceUpper,
                result.mastery_eligible AS masteryEligible,
                result.scoring_policy_version AS scoringPolicyVersion
         FROM assessment_skill_results result
         WHERE result.user_id = ?
           AND result.reset_epoch = ?
           AND result.content_version = ?
           AND result.session_id = (
             SELECT session.id
             FROM assessment_sessions session
             INNER JOIN enrollments enrollment
               ON enrollment.user_id = session.user_id
              AND enrollment.id = session.enrollment_id
             INNER JOIN course_versions course ON course.id = enrollment.course_version_id
              WHERE session.user_id = ?
                AND session.reset_epoch = ?
                AND session.status = 'submitted'
                AND session.content_version = ?
                AND session.blueprint_id = ?
                AND ${eligibleEnrollmentSql}
             ORDER BY session.terminal_at DESC, session.id DESC
             LIMIT 1
           )
         ORDER BY CASE result.skill
           WHEN 'pronunciation' THEN 0
           WHEN 'listening' THEN 1
           WHEN 'speaking' THEN 2
           WHEN 'reading' THEN 3
           WHEN 'writing' THEN 4
           WHEN 'vocabulary' THEN 5
           WHEN 'grammar' THEN 6
           ELSE 7
         END
         LIMIT 8`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        userId,
        resetEpoch,
        CONTENT_VERSION,
        this.assessmentBlueprint.id,
        ...enrollmentBindings,
      ),
      ] : []),
      ...(includeReader ? [
      this.database.prepare(
        `SELECT session.id AS sessionId,
                session.enrollment_id AS enrollmentId,
                session.reset_epoch AS resetEpoch,
                session.content_version AS contentVersion,
                session.story_id AS storyId,
                session.story_version AS storyVersion,
                session.form_version AS formVersion,
                session.form_schema_version AS formSchemaVersion,
                session.form_manifest_json AS formManifestJson,
                session.form_manifest_hash AS formHash,
                session.script AS script,
                session.support_mode AS supportMode,
                session.support_policy_version AS supportPolicyVersion,
                session.expected_item_count AS expectedItemCount,
                session.started_at AS startedAt
         FROM reader_sessions session
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         WHERE session.user_id = ?
           AND session.reset_epoch = ?
           AND session.status = 'started'
           AND session.content_version = ?
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, session.id ASC
         LIMIT ?`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
        MAX_ACTIVE_READER_SESSIONS + 1,
      ),
      this.database.prepare(
        `SELECT session.id AS sessionId,
                exposure.session_id AS claimSessionId,
                exposure.reset_epoch AS claimResetEpoch,
                exposure.content_version AS contentVersion,
                exposure.story_id AS storyId,
                exposure.item_id AS itemId,
                exposure.item_version AS itemVersion,
                exposure.exposure_group_id AS exposureGroupId,
                exposure.equivalent_group_id AS equivalentGroupId,
                exposure.exposed_at AS exposedAt
         FROM reader_sessions session
         INNER JOIN reader_item_exposures exposure
           ON exposure.user_id = session.user_id
          AND exposure.content_version = session.content_version
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         WHERE session.user_id = ?
           AND session.reset_epoch = ?
           AND session.content_version = ?
           AND session.status = 'started'
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, exposure.exposed_at ASC,
                  exposure.session_id ASC, exposure.item_version ASC
         LIMIT ?`,
      ).bind(
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
        MAX_READER_EXPOSURE_HISTORY + 1,
      ),
      this.database.prepare(
        `SELECT binding.attempt_id AS attemptId,
                evidence.id AS evidenceId,
                binding.session_id AS sessionId,
                attempt.enrollment_id AS attemptEnrollmentId,
                attempt.session_id AS attemptLessonSessionId,
                evidence.session_id AS evidenceLessonSessionId,
                binding.reset_epoch AS resetEpoch,
                attempt.content_version AS contentVersion,
                binding.form_manifest_hash AS formHash,
                binding.position AS position,
                binding.item_id AS itemId,
                binding.item_version AS itemVersion,
                attempt.activity_id AS activityId,
                attempt.activity_version AS activityVersion,
                attempt.source AS source,
                attempt.method AS method,
                attempt.skill AS skill,
                attempt.outcome AS outcome,
                attempt.score AS score,
                attempt.used_hint AS usedHint,
                attempt.prior_exposure AS priorExposure,
                attempt.required_for_pass AS requiredForPass,
                attempt.scoring_version AS scoringVersion,
                attempt.occurred_at AS occurredAt,
                attempt.received_at AS receivedAt,
                (
                  SELECT COUNT(*) FROM learning_evidence evidence_all
                  WHERE evidence_all.user_id = attempt.user_id
                    AND evidence_all.attempt_id = attempt.id
                    AND evidence_all.reset_epoch = attempt.reset_epoch
                ) AS evidenceRowCount,
                evidence.enrollment_id AS evidenceEnrollmentId,
                evidence.policy_version AS evidencePolicyVersion,
                evidence.activity_id AS evidenceActivityId,
                evidence.activity_version AS evidenceActivityVersion,
                evidence.source AS evidenceSource,
                evidence.method AS evidenceMethod,
                evidence.skill AS evidenceSkill,
                evidence.outcome AS evidenceOutcome,
                evidence.score AS evidenceScore,
                evidence.verified AS evidenceVerified,
                evidence.mastery_eligible AS evidenceMasteryEligible,
                evidence.metadata_json AS evidenceMetadataJson,
                evidence.occurred_at AS evidenceOccurredAt,
                evidence.recorded_at AS evidenceRecordedAt
         FROM reader_session_attempts binding
         INNER JOIN reader_sessions session
           ON session.user_id = binding.user_id
          AND session.id = binding.session_id
          AND session.reset_epoch = binding.reset_epoch
         INNER JOIN learning_attempts attempt
           ON attempt.user_id = binding.user_id
          AND attempt.id = binding.attempt_id
          AND attempt.reset_epoch = binding.reset_epoch
          AND attempt.content_version = session.content_version
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = session.user_id
          AND enrollment.id = session.enrollment_id
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         LEFT JOIN learning_evidence evidence
           ON evidence.user_id = attempt.user_id
          AND evidence.attempt_id = attempt.id
          AND evidence.reset_epoch = attempt.reset_epoch
          AND evidence.policy_version =
                session.support_policy_version || ':' || ?
          AND evidence.skill = 'reading'
         WHERE binding.user_id = ?
           AND binding.reset_epoch = ?
           AND session.status = 'started'
           AND session.content_version = ?
           AND ${eligibleEnrollmentSql}
         ORDER BY session.started_at DESC, binding.position ASC,
                  binding.attempt_id ASC
         LIMIT ?`,
      ).bind(
        READER_OBJECTIVE_SCORING_VERSION,
        userId,
        resetEpoch,
        CONTENT_VERSION,
        ...enrollmentBindings,
        MAX_ACTIVE_READER_ATTEMPTS + 1,
      ),
      ] : []),
    ]);

    const expectedResultCount = 6
      + (includeAssessment ? 4 : 0)
      + (includeReader ? 3 : 0);
    if (results.length !== expectedResultCount) {
      throw new LearningProjectionIntegrityError(
        "The projection query returned an incomplete result set.",
      );
    }

    const enrollmentRows = rows(results[0], "the current enrollment") as EnrollmentRow[];
    const cursorRows = rows(results[1], "the projection cursor") as CursorRow[];
    const activeRows = rows(results[2], "active lesson sessions") as ActiveSessionRow[];
    const attemptRows = rows(results[3], "active lesson attempts") as ActiveAttemptRow[];
    const submittedRows = rows(results[4], "submitted lesson sessions") as SubmittedLessonRow[];
    const evidenceRows = rows(results[5], "objective evidence counts") as EvidenceSummaryRow[];
    const activeAssessmentRows = includeAssessment
      ? rows(
          results[6],
          "the active assessment session",
        ) as ActiveAssessmentSessionRow[]
      : [];
    const assessmentAttemptRows = includeAssessment
      ? rows(
          results[7],
          "active assessment attempts",
        ) as ActiveAssessmentAttemptRow[]
      : [];
    const latestAssessmentRows = includeAssessment
      ? rows(
          results[8],
          "the latest assessment result",
        ) as LatestAssessmentSessionRow[]
      : [];
    const assessmentSkillRows = includeAssessment
      ? rows(
          results[9],
          "assessment skill results",
        ) as AssessmentSkillResultRow[]
      : [];
    const readerResultOffset = includeAssessment ? 10 : 6;
    const activeReaderRows = includeReader
      ? rows(
          results[readerResultOffset],
          "the active Reader session",
        ) as ActiveReaderSessionRow[]
      : [];
    const readerExposureRows = includeReader
      ? rows(
          results[readerResultOffset + 1],
          "active Reader exposure claims",
        ) as ActiveReaderExposureRow[]
      : [];
    const readerAttemptRows = includeReader
      ? rows(
          results[readerResultOffset + 2],
          "active Reader attempts",
        ) as ActiveReaderAttemptRow[]
      : [];

    if (enrollmentRows.length > 1 || cursorRows.length !== 1) {
      throw new LearningProjectionIntegrityError(
        "The current enrollment or projection cursor is ambiguous.",
      );
    }
    const cursor = cursorRows[0]?.cursor;
    if (!safeInteger(cursor)) {
      throw new LearningProjectionIntegrityError("Projection cursor is invalid.");
    }

    const enrollment = this.projectEnrollment(enrollmentRows[0] ?? null);
    if (!enrollment) {
      if (
        activeRows.length
        || attemptRows.length
        || submittedRows.length
        || evidenceRows.length
        || activeAssessmentRows.length
        || assessmentAttemptRows.length
        || latestAssessmentRows.length
        || assessmentSkillRows.length
        || activeReaderRows.length
        || readerExposureRows.length
        || readerAttemptRows.length
      ) {
        throw new LearningProjectionIntegrityError(
          "Projection rows escaped the exact current enrollment boundary.",
        );
      }
      const emptyProjection = {
        protocolVersion: LEARNING_PROJECTION_PROTOCOL_VERSION,
        resetEpoch,
        cursor,
        contentVersion: CONTENT_VERSION,
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        enrollment: null,
        activeLessonSessions: [],
        submittedLessons: [],
        objectiveEvidence: emptyObjectiveEvidenceProjection(),
      } satisfies NormalizedLearningProjectionV1;
      if (!includeAssessment) return emptyProjection;
      const emptyV2 = {
        ...emptyProjection,
        protocolVersion: LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
        activeAssessmentSession: null,
        latestAssessmentResult: null,
      } satisfies NormalizedLearningProjectionV2;
      if (!includeReader) return emptyV2;
      return {
        ...emptyV2,
        protocolVersion: LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
        activeReaderSession: null,
      };
    }

    const activeLessonSessions = await this.projectActiveSessions(
      activeRows,
      attemptRows,
      enrollment,
    );
    const submittedLessons = submittedRows.map((row) =>
      this.projectSubmittedLesson(row, enrollment)
    );
    const objectiveEvidence = emptyObjectiveEvidenceProjection();
    for (const row of evidenceRows) {
      if (
        !SKILLS.has(row.skill as Skill)
        || !safeInteger(row.attemptCount)
        || !safeInteger(row.correctCount)
        || !safeInteger(row.incorrectCount)
        || !safeInteger(row.masteryEligibleCount)
        || !safeInteger(row.masteryEligibleCorrectCount)
        || row.correctCount + row.incorrectCount !== row.attemptCount
        || row.masteryEligibleCount > row.attemptCount
        || row.masteryEligibleCorrectCount > row.masteryEligibleCount
        || row.masteryEligibleCorrectCount > row.correctCount
      ) {
        throw new LearningProjectionIntegrityError(
          "Objective evidence aggregate is invalid.",
        );
      }
      objectiveEvidence[row.skill as Skill] = {
        attemptCount: row.attemptCount,
        correctCount: row.correctCount,
        incorrectCount: row.incorrectCount,
        masteryEligibleCount: row.masteryEligibleCount,
        masteryEligibleCorrectCount: row.masteryEligibleCorrectCount,
      };
    }

    const legacyProjection = {
      protocolVersion: LEARNING_PROJECTION_PROTOCOL_VERSION,
      resetEpoch,
      cursor,
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      enrollment,
      activeLessonSessions,
      submittedLessons,
      objectiveEvidence,
    } satisfies NormalizedLearningProjectionV1;
    if (!includeAssessment) return legacyProjection;

    const activeAssessmentSession = await this.projectActiveAssessmentSession(
      activeAssessmentRows,
      assessmentAttemptRows,
      enrollment,
      resetEpoch,
    );
    const latestAssessmentResult = await this.projectLatestAssessmentResult(
      latestAssessmentRows,
      assessmentSkillRows,
      enrollment,
      resetEpoch,
    );

    const v2Projection = {
      ...legacyProjection,
      protocolVersion: LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
      activeAssessmentSession,
      latestAssessmentResult,
    } satisfies NormalizedLearningProjectionV2;
    if (!includeReader) return v2Projection;

    const activeReaderSession = await this.projectActiveReaderSession(
      activeReaderRows,
      readerExposureRows,
      readerAttemptRows,
      enrollment,
      resetEpoch,
    );
    return {
      ...v2Projection,
      protocolVersion: LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
      activeReaderSession,
    };
  }

  private async validateStoredReaderForm(
    row: ActiveReaderSessionRow,
  ): Promise<ReaderSessionFormV1> {
    if (
      row.formSchemaVersion !== READER_SESSION_FORM_SCHEMA_VERSION
      || !boundedStoredIdentifier(row.storyId, 160)
      || !boundedStoredIdentifier(row.storyVersion, 200)
      || !boundedStoredIdentifier(row.formVersion, 200)
      || (
        row.script !== "simplified"
        && row.script !== "traditional"
      )
      || (
        row.supportMode !== "assisted"
        && row.supportMode !== "unassisted"
      )
      || !boundedStoredIdentifier(row.supportPolicyVersion, 160)
      || !safeInteger(row.expectedItemCount, 1)
      || row.expectedItemCount > MAX_READER_FORM_ITEMS
      || !/^sha256:[a-f0-9]{64}$/u.test(row.formHash)
    ) {
      throw new LearningProjectionIntegrityError(
        "An active Reader form has invalid authority metadata.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.formManifestJson) as unknown;
    } catch {
      throw new LearningProjectionIntegrityError(
        "An active Reader form is not valid JSON.",
      );
    }
    if (
      !isExactReaderSessionFormV1(parsed, row.expectedItemCount)
      || parsed.storyId !== row.storyId
      || parsed.storyVersion !== row.storyVersion
      || parsed.formVersion !== row.formVersion
      || parsed.formSchemaVersion !== row.formSchemaVersion
      || parsed.script !== row.script
      || parsed.supportMode !== row.supportMode
      || parsed.supportPolicyVersion !== row.supportPolicyVersion
    ) {
      throw new LearningProjectionIntegrityError(
        "An active Reader form is not the exact stored answer-free contract.",
      );
    }
    const formHash = await hashReaderSessionForm(parsed);
    if (formHash !== row.formHash) {
      throw new LearningProjectionIntegrityError(
        "An active Reader form hash is invalid.",
      );
    }
    return parsed;
  }

  private async projectActiveReaderSession(
    sessionRows: ActiveReaderSessionRow[],
    exposureRows: ActiveReaderExposureRow[],
    attemptRows: ActiveReaderAttemptRow[],
    enrollment: LearningProjectionEnrollmentV1,
    resetEpoch: number,
  ): Promise<ActiveReaderSessionProjectionV3 | null> {
    if (sessionRows.length > MAX_ACTIVE_READER_SESSIONS) {
      throw new LearningProjectionIntegrityError(
        "More than one active Reader session cannot be projected safely.",
      );
    }
    if (exposureRows.length > MAX_READER_EXPOSURE_HISTORY) {
      throw new LearningProjectionIntegrityError(
        "The Reader exposure-history projection exceeded its bound.",
      );
    }
    if (attemptRows.length > MAX_ACTIVE_READER_ATTEMPTS) {
      throw new LearningProjectionIntegrityError(
        "The active Reader attempt projection exceeded its bound.",
      );
    }
    const row = sessionRows[0];
    if (!row) {
      if (exposureRows.length || attemptRows.length) {
        throw new LearningProjectionIntegrityError(
          "Reader graph rows escaped their active session boundary.",
        );
      }
      return null;
    }
    if (
      !boundedStoredIdentifier(row.sessionId, 160)
      || row.enrollmentId !== enrollment.enrollmentId
      || row.resetEpoch !== resetEpoch
      || row.contentVersion !== CONTENT_VERSION
    ) {
      throw new LearningProjectionIntegrityError(
        "The active Reader session binding is invalid.",
      );
    }
    const form = await this.validateStoredReaderForm(row);
    const startedAt = timestamp(row.startedAt, "Reader session start");

    if (exposureRows.some((exposure) =>
      exposure.sessionId !== row.sessionId
      || exposure.contentVersion !== CONTENT_VERSION
      || !boundedStoredIdentifier(exposure.claimSessionId, 160)
      || !safeInteger(exposure.claimResetEpoch)
      || !boundedStoredIdentifier(exposure.storyId, 160)
      || !boundedStoredIdentifier(exposure.itemId, 240)
      || !boundedStoredIdentifier(exposure.itemVersion, 200)
      || !boundedStoredIdentifier(exposure.exposureGroupId, 240)
      || !boundedStoredIdentifier(exposure.equivalentGroupId, 240)
      || !safeInteger(exposure.exposedAt)
      || exposure.exposedAt > row.startedAt
    )) {
      throw new LearningProjectionIntegrityError(
        "A Reader exposure-history claim is invalid.",
      );
    }
    const readerBank = authoritativeReaderItemByVersion(this.readerStories);
    for (const item of form.items) {
      const binding = readerBank.get(item.itemVersion);
      if (
        !binding
        || binding.story.id !== row.storyId
        || binding.story.storyVersion !== row.storyVersion
        || binding.story.formVersion !== row.formVersion
        || binding.story.script !== row.script
        || binding.story.supportPolicyVersion !== row.supportPolicyVersion
        || canonicalStringify(readerPresentationForItem(
          binding.item,
          item.position,
          row.supportMode as ReaderSupportMode,
          item.priorExposure,
        )) !== canonicalStringify(item)
      ) {
        throw new LearningProjectionIntegrityError(
          "A Reader form item is not bound to its authoritative presentation.",
        );
      }
      const matchingClaims = exposureRows.filter((exposure) =>
        exposure.exposureGroupId === binding.item.exposureGroupId
        || exposure.equivalentGroupId === binding.item.equivalentGroupId
      );
      if (matchingClaims.length !== 1) {
        throw new LearningProjectionIntegrityError(
          "A Reader form item lacks one exact exposure-history claim.",
        );
      }
      const claim = matchingClaims[0]!;
      if (item.priorExposure) {
        if (claim.claimSessionId === row.sessionId) {
          throw new LearningProjectionIntegrityError(
            "A prior Reader exposure cannot originate from the current session.",
          );
        }
      } else if (
        claim.claimSessionId !== row.sessionId
        || claim.claimResetEpoch !== resetEpoch
        || claim.storyId !== row.storyId
        || claim.itemId !== item.itemId
        || claim.itemVersion !== item.itemVersion
        || claim.exposedAt !== row.startedAt
      ) {
        throw new LearningProjectionIntegrityError(
          "A first-exposure Reader item lacks its current-session claim.",
        );
      }
    }

    if (attemptRows.some((attempt) => attempt.sessionId !== row.sessionId)) {
      throw new LearningProjectionIntegrityError(
        "A Reader attempt escaped its active session boundary.",
      );
    }
    const attempts: ActiveReaderAttemptProjectionV3[] = [];
    for (const attemptRow of attemptRows) {
      const formItem = form.items[attemptRow.position];
      if (!formItem) {
        throw new LearningProjectionIntegrityError(
          "A Reader attempt position is outside its issued form.",
        );
      }
      attempts.push(this.projectActiveReaderAttempt(
        attemptRow,
        row,
        formItem,
        startedAt,
      ));
    }
    if (
      new Set(attempts.map((attempt) => attempt.attemptId)).size
        !== attempts.length
      || new Set(attempts.map((attempt) => attempt.evidenceId)).size
        !== attempts.length
      || new Set(attempts.map((attempt) => attempt.position)).size
        !== attempts.length
      || new Set(attempts.map((attempt) => attempt.itemId)).size
        !== attempts.length
      || new Set(attempts.map((attempt) => attempt.itemVersion)).size
        !== attempts.length
    ) {
      throw new LearningProjectionIntegrityError(
        "Active Reader attempts are not uniquely bound to the form.",
      );
    }

    return {
      sessionId: row.sessionId,
      enrollmentId: row.enrollmentId,
      resetEpoch: row.resetEpoch,
      contentVersion: row.contentVersion,
      storyId: row.storyId,
      storyVersion: row.storyVersion,
      formVersion: row.formVersion,
      formSchemaVersion: READER_SESSION_FORM_SCHEMA_VERSION,
      script: row.script as ReaderScript,
      supportMode: row.supportMode as ReaderSupportMode,
      supportPolicyVersion: row.supportPolicyVersion,
      expectedItemCount: row.expectedItemCount,
      form,
      formHash: row.formHash as ReaderSessionFormHash,
      status: "started",
      startedAt,
      attempts,
    };
  }

  private projectActiveReaderAttempt(
    row: ActiveReaderAttemptRow,
    session: ActiveReaderSessionRow,
    formItem: ReaderSessionFormV1["items"][number],
    sessionStartedAt: string,
  ): ActiveReaderAttemptProjectionV3 {
    const expectedActivityId = `${session.storyId}:${formItem.itemId}`;
    const expectedEvidencePolicyVersion = readerEvidencePolicyVersion(
      session.supportPolicyVersion,
    );
    const expectedMasteryEligible = readerPolicyAllowsMastery({
      supportMode: session.supportMode as ReaderSupportMode,
      answerExposure: formItem.answerExposure,
      priorExposure: formItem.priorExposure,
    });
    const outcomeValid =
      (row.outcome === "correct" && row.score === 100)
      || (row.outcome === "incorrect" && row.score === 0);
    const recordedAt = timestamp(row.receivedAt, "Reader attempt receipt");
    timestamp(row.occurredAt, "Reader attempt");
    if (
      !boundedStoredIdentifier(row.attemptId, 160)
      || !boundedStoredIdentifier(row.evidenceId, 160)
      || row.attemptEnrollmentId !== session.enrollmentId
      || row.attemptLessonSessionId !== null
      || row.evidenceLessonSessionId !== null
      || row.resetEpoch !== session.resetEpoch
      || row.contentVersion !== session.contentVersion
      || row.formHash !== session.formHash
      || row.position !== formItem.position
      || row.itemId !== formItem.itemId
      || row.itemVersion !== formItem.itemVersion
      || row.activityId !== expectedActivityId
      || row.activityVersion !== formItem.itemVersion
      || row.source !== "reader"
      || row.method !== READER_METHOD
      || row.skill !== READER_SKILL
      || !outcomeValid
      || row.usedHint !== (session.supportMode === "assisted" ? 1 : 0)
      || row.priorExposure !== (formItem.priorExposure ? 1 : 0)
      || row.requiredForPass !== 0
      || row.scoringVersion !== READER_OBJECTIVE_SCORING_VERSION
      || row.evidenceRowCount !== 1
      || row.evidenceEnrollmentId !== session.enrollmentId
      || row.evidencePolicyVersion !== expectedEvidencePolicyVersion
      || row.evidenceActivityId !== expectedActivityId
      || row.evidenceActivityVersion !== formItem.itemVersion
      || row.evidenceSource !== "reader"
      || row.evidenceMethod !== READER_METHOD
      || row.evidenceSkill !== READER_SKILL
      || row.evidenceOutcome !== row.outcome
      || row.evidenceScore !== row.score
      || row.evidenceVerified !== 1
      || row.evidenceMasteryEligible !== (expectedMasteryEligible ? 1 : 0)
      || row.evidenceMetadataJson !== canonicalStringify(
        readerEvidenceMetadata(session, formItem),
      )
      || row.evidenceOccurredAt !== row.occurredAt
      || row.evidenceRecordedAt !== row.receivedAt
      || Date.parse(recordedAt) < Date.parse(sessionStartedAt)
    ) {
      throw new LearningProjectionIntegrityError(
        "An active Reader attempt is not an exact objective evidence pair.",
      );
    }
    if (formItem.masteryEligible !== expectedMasteryEligible) {
      throw new LearningProjectionIntegrityError(
        "An active Reader item has inconsistent mastery policy.",
      );
    }
    return {
      attemptId: row.attemptId,
      evidenceId: row.evidenceId,
      sessionId: session.sessionId,
      resetEpoch: session.resetEpoch,
      contentVersion: session.contentVersion,
      formHash: session.formHash as ReaderSessionFormHash,
      position: formItem.position,
      itemId: formItem.itemId,
      itemVersion: formItem.itemVersion,
      method: READER_METHOD,
      skill: READER_SKILL,
      script: session.script as ReaderScript,
      supportMode: session.supportMode as ReaderSupportMode,
      supportPolicyVersion: session.supportPolicyVersion,
      answerExposure: formItem.answerExposure,
      priorExposure: formItem.priorExposure,
      masteryEligible: expectedMasteryEligible,
      outcome: row.outcome as ActiveReaderAttemptProjectionV3["outcome"],
      score: row.score as ActiveReaderAttemptProjectionV3["score"],
      verification: "server-objective",
      status: "recorded",
      recordedAt,
    };
  }

  private async validateStoredAssessmentForm(
    row: StoredAssessmentFormRow,
  ): Promise<AssessmentFormV1> {
    if (
      row.formSchemaVersion !== ASSESSMENT_SESSION_FORM_SCHEMA_VERSION
      || row.blueprintId !== this.assessmentBlueprint.id
      || row.formVersion !== this.assessmentBlueprint.formVersion
      || row.scoringPolicyVersion !== this.assessmentBlueprint.scoringPolicyVersion
      || row.expectedItemCount !== this.assessmentBlueprint.itemCount
      || !/^sha256:[a-f0-9]{64}$/u.test(row.formHash)
    ) {
      throw new LearningProjectionIntegrityError(
        "An active assessment form is not bound to the current blueprint.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.formManifestJson) as unknown;
    } catch {
      throw new LearningProjectionIntegrityError(
        "An active assessment form is not valid JSON.",
      );
    }
    if (
      !isExactAssessmentFormV1(parsed, row.expectedItemCount)
      || parsed.blueprintId !== row.blueprintId
      || parsed.formVersion !== row.formVersion
      || parsed.scoringPolicyVersion !== row.scoringPolicyVersion
    ) {
      throw new LearningProjectionIntegrityError(
        "An active assessment form has an invalid manifest.",
      );
    }

    const bankByVersion = new Map(
      this.assessmentItems.map((item) => [item.itemVersion, item]),
    );
    for (const candidate of parsed.items) {
      const item = bankByVersion.get(candidate.itemVersion);
      if (
        !item
        || !isIssuableAuthoritativeAssessmentItem(
          item,
          this.assessmentBlueprint,
        )
        || candidate.itemId !== item.id
        || candidate.skill !== item.skill
        || candidate.construct !== item.construct
        || candidate.modality !== item.modality
        || candidate.measurementEligible !== item.measurementEligible
        || (
          candidate.modality === "synthetic-tts-selection"
          && candidate.measurementEligible !== false
        )
        || candidate.prompt !== item.prompt
        || candidate.meta !== item.meta
        || !sameStringArray(candidate.options, item.options)
        || candidate.stimulusText !== item.stimulusText
      ) {
        throw new LearningProjectionIntegrityError(
          "An active assessment form is not bound to the authoritative item bank.",
        );
      }
    }

    const form: AssessmentFormV1 = parsed;
    if (await hashAssessmentForm(form) !== row.formHash) {
      throw new LearningProjectionIntegrityError(
        "An active assessment form hash does not match its manifest.",
      );
    }
    return form;
  }

  private async projectActiveAssessmentSession(
    activeRows: ActiveAssessmentSessionRow[],
    attemptRows: ActiveAssessmentAttemptRow[],
    enrollment: LearningProjectionEnrollmentV1,
    resetEpoch: number,
  ): Promise<ActiveAssessmentSessionProjectionV2 | null> {
    if (activeRows.length > MAX_ACTIVE_ASSESSMENT_SESSIONS) {
      throw new LearningProjectionIntegrityError(
        "More than one assessment session is active in the current reset epoch.",
      );
    }
    if (attemptRows.length > MAX_ACTIVE_ASSESSMENT_ATTEMPTS) {
      throw new LearningProjectionIntegrityError(
        "The active assessment-attempt projection exceeded its bound.",
      );
    }
    const row = activeRows[0];
    if (!row) {
      if (attemptRows.length) {
        throw new LearningProjectionIntegrityError(
          "An assessment attempt has no active assessment session.",
        );
      }
      return null;
    }
    if (
      !row.sessionId
      || row.enrollmentId !== enrollment.enrollmentId
      || row.resetEpoch !== resetEpoch
      || row.contentVersion !== CONTENT_VERSION
      || !safeInteger(row.expectedItemCount, 1)
      || row.expectedItemCount > MAX_ACTIVE_ASSESSMENT_ATTEMPTS
    ) {
      throw new LearningProjectionIntegrityError(
        "The active assessment-session binding is invalid.",
      );
    }
    const form = await this.validateStoredAssessmentForm(row);
    if (attemptRows.length > row.expectedItemCount) {
      throw new LearningProjectionIntegrityError(
        "An active assessment session contains too many attempts.",
      );
    }

    const attempts: ActiveAssessmentAttemptProjectionV2[] = [];
    const attemptIds = new Set<string>();
    const positions = new Set<number>();
    for (const attempt of attemptRows) {
      const item = form.items[attempt.position];
      if (
        !attempt.attemptId
        || attempt.sessionId !== row.sessionId
        || !safeInteger(attempt.position)
        || !item
        || attempt.itemId !== item.itemId
        || attempt.itemVersion !== item.itemVersion
        || attempt.skill !== item.skill
        || (attempt.measurementEligible !== 0 && attempt.measurementEligible !== 1)
        || (attempt.measurementEligible === 1) !== item.measurementEligible
        || attemptIds.has(attempt.attemptId)
        || positions.has(attempt.position)
      ) {
        throw new LearningProjectionIntegrityError(
          "An active assessment attempt is not part of its immutable form.",
        );
      }
      attemptIds.add(attempt.attemptId);
      positions.add(attempt.position);
      attempts.push({
        attemptId: attempt.attemptId,
        position: attempt.position,
        itemId: attempt.itemId,
        itemVersion: attempt.itemVersion,
        skill: attempt.skill as Skill,
        measurementEligible: attempt.measurementEligible === 1,
        masteryEligible: false,
        status: "recorded",
        recordedAt: timestamp(attempt.recordedAt, "Assessment attempt receipt"),
      });
    }

    return {
      sessionId: row.sessionId,
      enrollmentId: row.enrollmentId,
      resetEpoch: row.resetEpoch,
      contentVersion: row.contentVersion,
      blueprintId: row.blueprintId,
      formVersion: row.formVersion,
      scoringPolicyVersion: row.scoringPolicyVersion,
      expectedItemCount: row.expectedItemCount,
      form,
      formHash: row.formHash as ActiveAssessmentSessionProjectionV2["formHash"],
      status: "started",
      startedAt: timestamp(row.startedAt, "Assessment session start"),
      attempts,
    };
  }

  private async projectLatestAssessmentResult(
    latestRows: LatestAssessmentSessionRow[],
    skillRows: AssessmentSkillResultRow[],
    enrollment: LearningProjectionEnrollmentV1,
    resetEpoch: number,
  ): Promise<LatestAssessmentResultProjectionV2 | null> {
    if (latestRows.length > 1) {
      throw new LearningProjectionIntegrityError(
        "The latest assessment result is ambiguous.",
      );
    }
    const row = latestRows[0];
    if (!row) {
      if (skillRows.length) {
        throw new LearningProjectionIntegrityError(
          "Assessment skill results have no submitted session.",
        );
      }
      return null;
    }
    if (
      !row.sessionId
      || row.enrollmentId !== enrollment.enrollmentId
      || row.resetEpoch !== resetEpoch
      || row.contentVersion !== CONTENT_VERSION
      || row.blueprintId !== this.assessmentBlueprint.id
      || row.formVersion !== this.assessmentBlueprint.formVersion
      || row.scoringPolicyVersion !== this.assessmentBlueprint.scoringPolicyVersion
      || !/^sha256:[a-f0-9]{64}$/u.test(row.formHash)
      || !storedEstimateMatches(row)
      || skillRows.length !== ASSESSMENT_RESULT_SKILLS.length
    ) {
      throw new LearningProjectionIntegrityError(
        "The latest assessment aggregate is invalid.",
      );
    }

    const submittedForm = await this.validateStoredAssessmentForm(row);
    const expectedEvidenceBySkill = new Map<Skill, number>(
      ASSESSMENT_RESULT_SKILLS.map((skill) => [skill, 0]),
    );
    let expectedEvidenceCount = 0;
    for (const item of submittedForm.items) {
      if (!item.measurementEligible) continue;
      expectedEvidenceCount += 1;
      expectedEvidenceBySkill.set(
        item.skill,
        (expectedEvidenceBySkill.get(item.skill) ?? 0) + 1,
      );
    }
    if (row.evidenceCount !== expectedEvidenceCount) {
      throw new LearningProjectionIntegrityError(
        "Assessment evidence count does not match the submitted form.",
      );
    }

    const skills: LatestAssessmentResultProjectionV2["skills"] = [];
    let summedCorrect = 0;
    let summedEvidence = 0;
    for (const [index, skill] of ASSESSMENT_RESULT_SKILLS.entries()) {
      const result = skillRows[index];
      if (
        !result
        || result.sessionId !== row.sessionId
        || result.resetEpoch !== resetEpoch
        || result.contentVersion !== CONTENT_VERSION
        || result.skill !== skill
        || result.masteryEligible !== 0
        || result.scoringPolicyVersion !== row.scoringPolicyVersion
        || !storedEstimateMatches(result)
        || result.evidenceCount !== expectedEvidenceBySkill.get(skill)
      ) {
        throw new LearningProjectionIntegrityError(
          "An assessment skill result is invalid.",
        );
      }
      const observed = assessmentObservedResult(
        result.correctCount,
        result.evidenceCount,
      );
      skills.push({ skill, ...observed });
      summedCorrect += result.correctCount;
      summedEvidence += result.evidenceCount;
    }
    if (
      summedCorrect !== row.correctCount
      || summedEvidence !== row.evidenceCount
    ) {
      throw new LearningProjectionIntegrityError(
        "Assessment overall and skill aggregates do not agree.",
      );
    }

    return {
      sessionId: row.sessionId,
      enrollmentId: row.enrollmentId,
      resetEpoch: row.resetEpoch,
      contentVersion: row.contentVersion,
      blueprintId: row.blueprintId,
      formVersion: row.formVersion,
      scoringPolicyVersion: row.scoringPolicyVersion,
      formHash: row.formHash as LatestAssessmentResultProjectionV2["formHash"],
      status: "submitted",
      calibrationStatus: "uncalibrated",
      confidenceLevel: ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL,
      masteryEligible: false,
      overall: assessmentObservedResult(row.correctCount, row.evidenceCount),
      skills,
      submittedAt: timestamp(row.submittedAt, "Assessment submission"),
    };
  }

  private projectEnrollment(
    row: EnrollmentRow | null,
  ): LearningProjectionEnrollmentV1 | null {
    if (!row) return null;
    if (
      !row.enrollmentId
      || row.contentVersion !== CONTENT_VERSION
      || !row.courseId
      || row.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
      || (row.releaseState !== "beta" && row.releaseState !== "published")
      || !["conversation", "hsk", "career", "travel"].includes(row.goal)
    ) {
      throw new LearningProjectionIntegrityError(
        "The current enrollment binding is invalid.",
      );
    }
    return {
      enrollmentId: row.enrollmentId,
      contentVersion: row.contentVersion,
      courseId: row.courseId,
      manifestSha256: row.manifestSha256,
      releaseState: row.releaseState,
      goal: row.goal as LearningProjectionEnrollmentV1["goal"],
    };
  }

  private async projectActiveSessions(
    activeRows: ActiveSessionRow[],
    attemptRows: ActiveAttemptRow[],
    enrollment: LearningProjectionEnrollmentV1,
  ): Promise<ActiveLessonSessionProjectionV1[]> {
    if (activeRows.length > MAX_ACTIVE_SESSIONS) {
      throw new LearningProjectionIntegrityError(
        "The active lesson-session limit was exceeded.",
      );
    }
    if (attemptRows.length > MAX_ACTIVE_ATTEMPTS) {
      throw new LearningProjectionIntegrityError(
        "The active lesson-attempt projection exceeded its bound.",
      );
    }
    const rowsBySession = new Map<string, ActiveAttemptRow[]>();
    for (const row of attemptRows) {
      const sessionRows = rowsBySession.get(row.sessionId) ?? [];
      sessionRows.push(row);
      rowsBySession.set(row.sessionId, sessionRows);
    }

    const projected: ActiveLessonSessionProjectionV1[] = [];
    const knownSessions = new Set(activeRows.map((row) => row.sessionId));
    if (attemptRows.some((row) => !knownSessions.has(row.sessionId))) {
      throw new LearningProjectionIntegrityError(
        "An active attempt has no projected lesson session.",
      );
    }

    for (const row of activeRows) {
      if (
        !row.sessionId
        || row.enrollmentId !== enrollment.enrollmentId
        || row.contentVersion !== CONTENT_VERSION
        || !safeInteger(row.expectedEvidenceCount, 1)
      ) {
        throw new LearningProjectionIntegrityError(
          "An active lesson-session binding is invalid.",
        );
      }
      assertReleasedLessonBinding(row.lessonId, row.lessonVersion);
      let validated: Awaited<ReturnType<typeof validateStoredLessonSessionForm>>;
      try {
        validated = await validateStoredLessonSessionForm({
          lessonId: row.lessonId,
          lessonVersion: row.lessonVersion,
          expectedEvidenceCount: row.expectedEvidenceCount,
          formSchemaVersion: row.formSchemaVersion,
          formScript: row.formScript,
          formManifestJson: row.formManifestJson,
          formManifestHash: row.formManifestHash,
        });
      } catch {
        throw new LearningProjectionIntegrityError(
          "An active lesson form is not bound to the current authoritative item bank.",
        );
      }
      const attempts = (rowsBySession.get(row.sessionId) ?? []).map((attempt) =>
        this.projectActiveAttempt(attempt)
      );
      if (attempts.length > row.expectedEvidenceCount) {
        throw new LearningProjectionIntegrityError(
          "An active session contains more attempts than its issued form.",
        );
      }
      const formActivities = new Map(validated.form.activities.map((activity) => [
        activity.activityId,
        activity,
      ]));
      for (const attempt of attempts) {
        const formActivity = formActivities.get(attempt.activityId);
        if (
          !formActivity
          || formActivity.activityVersion !== attempt.activityVersion
          || formActivity.method !== attempt.method
          || formActivity.skill !== attempt.skill
        ) {
          throw new LearningProjectionIntegrityError(
            "An active attempt is not part of its immutable lesson form.",
          );
        }
      }
      projected.push({
        sessionId: row.sessionId,
        enrollmentId: row.enrollmentId,
        contentVersion: row.contentVersion,
        lessonId: row.lessonId,
        lessonVersion: row.lessonVersion,
        expectedEvidenceCount: row.expectedEvidenceCount,
        form: validated.form,
        formHash: validated.formHash,
        status: "started",
        startedAt: timestamp(row.startedAt, "Lesson session start"),
        attempts,
      });
    }
    return projected;
  }

  private projectActiveAttempt(
    row: ActiveAttemptRow,
  ): ActiveLessonAttemptProjectionV1 {
    const outcomeMatches = row.attemptOutcome === row.evidenceOutcome
      && (row.attemptOutcome === "correct" || row.attemptOutcome === "incorrect");
    const scoreMatches = row.attemptScore === row.evidenceScore
      && (
        (row.attemptOutcome === "correct" && row.attemptScore === 100)
        || (row.attemptOutcome === "incorrect" && row.attemptScore === 0)
      );
    if (
      !row.attemptId
      || !row.evidenceId
      || !row.activityId
      || !row.activityVersion
      || row.source !== "lesson"
      || !OBJECTIVE_METHODS.has(row.method)
      || !SKILLS.has(row.skill as Skill)
      || !outcomeMatches
      || !scoreMatches
      || (row.usedHint !== 0 && row.usedHint !== 1)
      || (row.priorExposure !== 0 && row.priorExposure !== 1)
      || (row.masteryEligible !== 0 && row.masteryEligible !== 1)
      || row.verified !== 1
    ) {
      throw new LearningProjectionIntegrityError(
        "An active lesson attempt is not a valid objective evidence pair.",
      );
    }
    const policyMasteryEligible = row.masteryEligible === 1;
    if (policyMasteryEligible && (row.usedHint === 1 || row.priorExposure === 1)) {
      throw new LearningProjectionIntegrityError(
        "An active lesson attempt has inconsistent gate eligibility.",
      );
    }
    return {
      attemptId: row.attemptId,
      evidenceId: row.evidenceId,
      activityId: row.activityId,
      activityVersion: row.activityVersion,
      source: "lesson",
      method: row.method as ActiveLessonAttemptProjectionV1["method"],
      skill: row.skill as Skill,
      outcome: row.attemptOutcome as ActiveLessonAttemptProjectionV1["outcome"],
      score: row.attemptScore as ActiveLessonAttemptProjectionV1["score"],
      usedHint: row.usedHint === 1,
      priorExposure: row.priorExposure === 1,
      gateEligible: row.usedHint === 0 && row.priorExposure === 0,
      occurredAt: timestamp(row.occurredAt, "Lesson attempt"),
    };
  }

  private projectSubmittedLesson(
    row: SubmittedLessonRow,
    enrollment: LearningProjectionEnrollmentV1,
  ): SubmittedLessonProjectionV1 {
    if (
      row.enrollmentId !== enrollment.enrollmentId
      || row.contentVersion !== CONTENT_VERSION
      || !safeInteger(row.submittedSessionCount, 1)
      || !safeInteger(row.passedSessionCount)
      || row.passedSessionCount > row.submittedSessionCount
      || !safeInteger(row.bestRawScore)
      || (row.bestRawScore as number) > 100
      || !safeInteger(row.bestGateScore)
      || (row.bestGateScore as number) > 100
    ) {
      throw new LearningProjectionIntegrityError(
        "A submitted lesson aggregate is invalid.",
      );
    }
    assertReleasedLessonBinding(row.lessonId, row.lessonVersion);
    return {
      enrollmentId: row.enrollmentId,
      contentVersion: row.contentVersion,
      lessonId: row.lessonId,
      lessonVersion: row.lessonVersion,
      submittedSessionCount: row.submittedSessionCount,
      passedSessionCount: row.passedSessionCount,
      passed: row.passedSessionCount > 0,
      bestRawScore: row.bestRawScore as number,
      bestGateScore: row.bestGateScore as number,
      lastSubmittedAt: timestamp(row.lastSubmittedAt, "Lesson submission"),
    };
  }
}
