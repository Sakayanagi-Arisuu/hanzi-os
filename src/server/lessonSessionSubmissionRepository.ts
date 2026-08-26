import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import {
  type LessonSessionFormHash,
  type LessonSessionFormV1,
} from "../learning/lessonSessionProtocol";
import {
  hashSubmitLessonSessionCommand,
  LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE,
  LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION,
  type SubmitLessonSessionCommandV1,
  type SubmitLessonSessionReceiptV1,
} from "../learning/lessonSessionSubmissionProtocol";
import type { Lesson } from "../types";
import { OBJECTIVE_SCORING_POLICY_VERSION } from "./attemptScoring";
import { ensureCurrentCourseVersion } from "./courseVersionRepository";
import type { D1Database, D1RunResult } from "./d1";
import { getAuthoritativeLessonAnswer } from "./authoritativeItemBank";
import {
  calculateLessonCompletionScore,
  LESSON_COMPLETION_POLICY_VERSION,
  type LessonCompletionScore,
} from "./lessonCompletionPolicy";
import {
  LessonSessionFormValidationError,
  validateStoredLessonSessionForm,
} from "./lessonSessionFormValidation";
import {
  CURRENT_LESSON_SESSION_PUBLICATION_POLICY,
  type LessonSessionPublicationPolicy,
} from "./lessonSessionRepository";
import { isPromotedContentReleasePolicy } from "./contentReleasePolicy";
import {
  CURRENT_LEARNING_RESET_EPOCH_SQL,
  requireCurrentLearningResetEpoch,
} from "./learningResetEpoch";
import {
  NORMALIZED_LEARNING_CHANGE_ENTITY,
  normalizedLearningChangeOperationId,
} from "./normalizedLearningChange";
import { encodeOutboxEventPayload } from "./outboxEventContract";
import {
  REVIEW_MODALITY,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
} from "../learning/reviewProtocol";
import {
  createAuthoritativeReviewCard,
} from "./reviewScheduler";

export { LESSON_COMPLETION_POLICY_VERSION } from "./lessonCompletionPolicy";

export class LessonSessionSubmissionIdempotencyConflictError extends Error {
  readonly code = "LESSON_SESSION_SUBMISSION_IDEMPOTENCY_CONFLICT";
}

export class LessonSessionSubmissionDeviceSequenceConflictError extends Error {
  readonly code = "LESSON_SESSION_SUBMISSION_DEVICE_SEQUENCE_CONFLICT";
}

export class LessonSessionSubmissionUnavailableError extends Error {
  readonly code = "LESSON_SESSION_SUBMISSION_UNAVAILABLE";
}

export class LessonSessionSubmissionIncompleteError extends Error {
  readonly code = "LESSON_SESSION_SUBMISSION_INCOMPLETE";
}

export class LessonSessionSubmissionEvidenceConflictError extends Error {
  readonly code = "LESSON_SESSION_SUBMISSION_EVIDENCE_CONFLICT";
}

type ExistingIdempotency = {
  requestHash: string;
  status: string;
  responseJson: string | null;
};

type SessionContext = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  lessonId: string;
  lessonVersion: string;
  expectedEvidenceCount: number;
  formSchemaVersion: number | null;
  formScript: string | null;
  formManifestJson: string | null;
  formManifestHash: string | null;
  status: string;
};

type StoredAttemptEvidence = {
  attemptId: string;
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
  evidenceId: string | null;
  evidencePolicyVersion: string | null;
  evidenceActivityId: string | null;
  evidenceActivityVersion: string | null;
  evidenceSource: string | null;
  evidenceMethod: string | null;
  evidenceSkill: string | null;
  evidenceOutcome: string | null;
  evidenceScore: number | null;
  evidenceVerified: number | null;
};

type DerivedSubmission = LessonCompletionScore;

const parseStoredReceipt = (raw: string): SubmitLessonSessionReceiptV1 => {
  const value: unknown = JSON.parse(raw);
  if (
    !value
    || typeof value !== "object"
    || (value as { protocolVersion?: unknown }).protocolVersion
      !== LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION
    || typeof (value as { sessionId?: unknown }).sessionId !== "string"
    || typeof (value as { completionEvidenceId?: unknown }).completionEvidenceId
      !== "string"
    || !isValidLearningResetEpoch((value as { resetEpoch?: unknown }).resetEpoch)
    || (value as { status?: unknown }).status !== "submitted"
    || typeof (value as { passed?: unknown }).passed !== "boolean"
  ) {
    throw new Error("Stored lesson-session submission receipt is invalid.");
  }
  return value as SubmitLessonSessionReceiptV1;
};

const submissionBatchCommitted = (
  results: Array<D1RunResult>,
  activationCount: number,
) => results.length === 5 + activationCount
  && results.slice(0, 5).every(
    (result) => result.success && result.meta?.changes === 1,
  )
  && results.slice(5).every(
    (result) =>
      result.success
      && [0, 1].includes(result.meta?.changes ?? -1),
  );

export class LessonSessionSubmissionRepository {
  constructor(
    private readonly database: D1Database,
    private readonly publicationPolicy: LessonSessionPublicationPolicy =
      CURRENT_LESSON_SESSION_PUBLICATION_POLICY,
  ) {}

  async submit(
    userId: string,
    command: SubmitLessonSessionCommandV1,
  ): Promise<SubmitLessonSessionReceiptV1> {
    const requestHash = await hashSubmitLessonSessionCommand(command);
    await requireCurrentLearningResetEpoch(
      this.database,
      userId,
      command.resetEpoch,
    );
    const existing = await this.getIdempotency(
      userId,
      command.idempotencyKey,
      command.resetEpoch,
    );
    if (existing) return this.resolveExisting(existing, requestHash);

    this.requirePromotedPackage();
    await ensureCurrentCourseVersion(this.database);
    const session = await this.requireStartedSession(
      userId,
      command.sessionId,
      command.resetEpoch,
    );
    const { lesson, form, formHash } = await this.requireExactReleasedLesson(
      session,
      command.formHash,
    );
    const attempts = await this.loadAttemptEvidence(
      userId,
      session.sessionId,
      command.resetEpoch,
    );
    const derived = this.deriveSubmission(session, lesson, form, attempts);
    const deviceRecordId = await this.registerDevice(userId, command);

    const sequenceOwner = await this.database.prepare(
      "SELECT idempotency_key AS idempotencyKey FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
    ).bind(
      userId,
      deviceRecordId,
      command.deviceSequence,
    ).first<{ idempotencyKey: string }>();
    if (sequenceOwner && sequenceOwner.idempotencyKey !== command.idempotencyKey) {
      throw new LessonSessionSubmissionDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }

    const timestamp = Date.now();
    const submittedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const completionEvidenceId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const receipt: SubmitLessonSessionReceiptV1 = {
      protocolVersion: LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: session.sessionId,
      contentVersion: session.contentVersion,
      resetEpoch: command.resetEpoch,
      lessonId: session.lessonId,
      lessonVersion: session.lessonVersion,
      formHash,
      status: "submitted",
      ...derived,
      completionEvidenceId,
      submittedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const completionMetadata = JSON.stringify({
      aggregateOnly: true,
      formHash,
      evidenceCount: derived.evidenceCount,
      rawScore: derived.rawScore,
      gateScore: derived.gateScore,
      requiredEvidenceCount: derived.requiredEvidenceCount,
      requiredCorrectCount: derived.requiredCorrectCount,
      passed: derived.passed,
      hintAndRepeatPolicy: "hint-ineligible-repeat-allowed-v2",
    });
    const eventPayload = encodeOutboxEventPayload({
      eventType: "lesson.completed",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        idempotencyKey: command.idempotencyKey,
        sessionId: session.sessionId,
        completionEvidenceId,
        contentVersion: CONTENT_VERSION,
        resetEpoch: command.resetEpoch,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        lessonId: session.lessonId,
        lessonVersion: session.lessonVersion,
        formHash,
        ...derived,
        submittedAt,
      },
    });
    const completionSkill = lesson.skills[0];
    if (!completionSkill) {
      throw new LessonSessionSubmissionUnavailableError(
        "Lesson has no declared skill for aggregate completion evidence.",
      );
    }

    const reviewCardConflictGuards = derived.passed
      ? lesson.wordIds.map((wordId) => {
          const validActivationLessons = RELEASED_LESSONS.filter(
            (candidate) =>
              candidate.contentVersion === CONTENT_VERSION
              && (candidate.releaseState === "beta"
                || candidate.releaseState === "published")
              && candidate.wordIds.includes(wordId),
          );
          if (validActivationLessons.length === 0) {
            throw new LessonSessionSubmissionUnavailableError(
              `Review word ${wordId} has no released activation lesson.`,
            );
          }
          const activationLessonGuard = validActivationLessons.map(() =>
            "(activation.lesson_id = ? AND activation.lesson_version = ?)"
          ).join(" OR ");
          return {
            sql: `AND NOT EXISTS (
              SELECT 1
              FROM fsrs_cards existing_card
              WHERE existing_card.user_id = session.user_id
                AND existing_card.enrollment_id = session.enrollment_id
                AND existing_card.reset_epoch = session.reset_epoch
                AND existing_card.knowledge_item_type = 'vocabulary'
                AND existing_card.knowledge_item_id = ?
                AND existing_card.knowledge_item_version = ?
                AND existing_card.modality = ?
                AND existing_card.scheduler_version = ?
                AND existing_card.activation_session_id IS NOT NULL
                AND (
                  existing_card.content_version <> session.content_version
                  OR existing_card.due_at < 0
                  OR existing_card.due_at > 8640000000000000
                  OR existing_card.last_review_at < 0
                  OR existing_card.last_review_at > ?
                  OR NOT EXISTS (
                    SELECT 1
                    FROM lesson_sessions activation
                    WHERE activation.user_id = existing_card.user_id
                      AND activation.id = existing_card.activation_session_id
                      AND activation.enrollment_id =
                        existing_card.enrollment_id
                      AND activation.reset_epoch = existing_card.reset_epoch
                      AND activation.content_version =
                        existing_card.content_version
                      AND activation.content_version =
                        session.content_version
                      AND activation.status = 'submitted'
                      AND activation.passed = 1
                      AND (${activationLessonGuard})
                  )
                )
            )`,
            bindings: [
              wordId,
              reviewWordVersion(wordId),
              REVIEW_MODALITY,
              REVIEW_SCHEDULER_VERSION,
              timestamp,
              ...validActivationLessons.flatMap((candidate) => [
                candidate.id,
                `${candidate.contentVersion}:${candidate.id}:1`,
              ]),
            ],
          };
        })
      : [];
    const reviewCardConflictGuardSql = reviewCardConflictGuards
      .map((guard) => guard.sql)
      .join("\n");
    const reviewCardConflictGuardBindings = reviewCardConflictGuards
      .flatMap((guard) => guard.bindings);

    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1
           FROM lesson_sessions session
           INNER JOIN enrollments enrollment
             ON enrollment.user_id = session.user_id
            AND enrollment.id = session.enrollment_id
           INNER JOIN course_versions course
             ON course.id = enrollment.course_version_id
           WHERE session.user_id = ?
             AND session.id = ?
             AND session.status = 'started'
             AND session.reset_epoch = ?
             AND session.content_version = ?
             AND session.form_manifest_hash = ?
             AND enrollment.status = 'active'
             AND enrollment.course_version_id = ?
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
             AND (
               SELECT COUNT(*) FROM learning_attempts attempt
               WHERE attempt.user_id = session.user_id
                 AND attempt.session_id = session.id
                 AND attempt.reset_epoch = session.reset_epoch
             ) = ?
             AND NOT EXISTS (
               SELECT 1
               FROM learning_attempts attempt
               WHERE attempt.user_id = session.user_id
                 AND attempt.session_id = session.id
                 AND attempt.reset_epoch = session.reset_epoch
                 AND NOT EXISTS (
                   SELECT 1
                   FROM json_each(session.form_manifest_json, '$.activities') form_activity
                   WHERE json_extract(form_activity.value, '$.activityId') = attempt.activity_id
                     AND json_extract(form_activity.value, '$.activityVersion') = attempt.activity_version
                     AND json_extract(form_activity.value, '$.method') = attempt.method
                     AND json_extract(form_activity.value, '$.skill') = attempt.skill
                     AND CAST(json_extract(form_activity.value, '$.requiredForPass') AS INTEGER) = attempt.required_for_pass
                 )
             )
             AND NOT EXISTS (
               SELECT 1
               FROM json_each(session.form_manifest_json, '$.activities') form_activity
               WHERE NOT EXISTS (
                 SELECT 1
                 FROM learning_attempts attempt
                 WHERE attempt.user_id = session.user_id
                   AND attempt.session_id = session.id
                   AND attempt.reset_epoch = session.reset_epoch
                   AND attempt.activity_id = json_extract(form_activity.value, '$.activityId')
                   AND attempt.activity_version = json_extract(form_activity.value, '$.activityVersion')
                   AND attempt.method = json_extract(form_activity.value, '$.method')
                   AND attempt.skill = json_extract(form_activity.value, '$.skill')
                   AND attempt.required_for_pass = CAST(json_extract(form_activity.value, '$.requiredForPass') AS INTEGER)
               )
             )
             ${reviewCardConflictGuardSql}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        userId,
        session.sessionId,
        command.resetEpoch,
        CONTENT_VERSION,
        formHash,
        CONTENT_VERSION,
        CURRENT_CONTENT_MANIFEST_SHA256,
        userId,
        command.resetEpoch,
        derived.evidenceCount,
        ...reviewCardConflictGuardBindings,
      ),
      this.database.prepare(
        `UPDATE lesson_sessions
         SET status = 'submitted', raw_score = ?, gate_score = ?,
             required_evidence_count = ?, required_correct_count = ?,
             passed = ?, submitted_at = ?
         WHERE user_id = ? AND id = ? AND reset_epoch = ? AND status = 'started'
           AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
           )`,
      ).bind(
        derived.rawScore,
        derived.gateScore,
        derived.requiredEvidenceCount,
        derived.requiredCorrectCount,
        derived.passed ? 1 : 0,
        timestamp,
        userId,
        session.sessionId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, session_id, schema_version, reset_epoch, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, score, verified, mastery_eligible, metadata_json, occurred_at, recorded_at)
         SELECT ?, ?, ?, NULL, ?, 1, ?, ?, ?, ?, ?, 'lesson', 'lesson-completion', ?, 'completed', ?, 1, 0, ?, ?, ?
         FROM lesson_sessions
         WHERE user_id = ? AND id = ? AND reset_epoch = ? AND status = 'submitted'
           AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
           )`,
      ).bind(
        completionEvidenceId,
        userId,
        session.enrollmentId,
        session.sessionId,
        command.resetEpoch,
        LESSON_COMPLETION_POLICY_VERSION,
        CONTENT_VERSION,
        `${session.lessonId}:completion`,
        session.lessonVersion,
        completionSkill,
        derived.gateScore,
        completionMetadata,
        timestamp,
        timestamp,
        userId,
        session.sessionId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         VALUES (?, ?, 'lesson_session', (
           SELECT session_id FROM learning_evidence
           WHERE id = ? AND user_id = ? AND session_id = ? AND reset_epoch = ?
         ), 'lesson.completed', 1, ?, ?, 'pending', 0, ?, ?)`,
      ).bind(
        outboxId,
        userId,
        completionEvidenceId,
        userId,
        session.sessionId,
        command.resetEpoch,
        command.resetEpoch,
        eventPayload,
        timestamp,
        timestamp,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, ?, ?, id, 2, ?, 'upsert', NULL, ?
         FROM lesson_sessions
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'submitted'`,
      ).bind(
        userId,
        command.resetEpoch,
        NORMALIZED_LEARNING_CHANGE_ENTITY.lessonSession,
        normalizedLearningChangeOperationId.lessonSessionSubmitted(
          command.idempotencyKey,
        ),
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
      ),
    ];
    if (derived.passed) {
      const initialCard = createAuthoritativeReviewCard(timestamp);
      for (const wordId of lesson.wordIds) {
        statements.push(this.database.prepare(
          `INSERT INTO fsrs_cards (
             id, user_id, enrollment_id, activation_session_id, reset_epoch,
             content_version, knowledge_item_type, knowledge_item_id,
             knowledge_item_version, modality, scheduler_version, due_at,
             stability, difficulty, elapsed_days, scheduled_days,
             learning_steps, reps, lapses, state, last_review_at, revision,
             created_at, updated_at
           )
           SELECT ?, session.user_id, session.enrollment_id, session.id,
                  session.reset_epoch, session.content_version, 'vocabulary',
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
           FROM lesson_sessions session
           WHERE session.id = ? AND session.user_id = ?
             AND session.reset_epoch = ? AND session.status = 'submitted'
             AND session.passed = 1
             AND EXISTS (
               SELECT 1 FROM idempotency_records
               WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
             )
           ON CONFLICT (
             user_id, enrollment_id, reset_epoch, knowledge_item_type,
             knowledge_item_id, knowledge_item_version, modality,
             scheduler_version
           ) WHERE activation_session_id IS NOT NULL DO NOTHING`,
        ).bind(
          crypto.randomUUID(),
          wordId,
          reviewWordVersion(wordId),
          REVIEW_MODALITY,
          REVIEW_SCHEDULER_VERSION,
          initialCard.dueAt,
          initialCard.stability,
          initialCard.difficulty,
          initialCard.elapsedDays,
          initialCard.scheduledDays,
          initialCard.learningSteps,
          initialCard.reps,
          initialCard.lapses,
          initialCard.state,
          initialCard.lastReviewAt,
          initialCard.revision,
          timestamp,
          timestamp,
          session.sessionId,
          userId,
          command.resetEpoch,
          idempotencyRecordId,
          userId,
          command.resetEpoch,
          LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE,
        ));
      }
    }

    try {
      const results = await this.database.batch(statements);
      if (!submissionBatchCommitted(
        results,
        derived.passed ? lesson.wordIds.length : 0,
      )) {
        throw new LessonSessionSubmissionUnavailableError(
          "Session or release state changed while finalizing the lesson.",
        );
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        command.idempotencyKey,
        command.resetEpoch,
      );
      if (winner) return this.resolveExisting(winner, requestHash);
      const conflictingSequence = await this.database.prepare(
        "SELECT id FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
      ).bind(
        userId,
        deviceRecordId,
        command.deviceSequence,
      ).first<{ id: string }>();
      if (conflictingSequence) {
        throw new LessonSessionSubmissionDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (
        error instanceof LessonSessionSubmissionUnavailableError
        || error instanceof LessonSessionSubmissionIncompleteError
        || error instanceof LessonSessionSubmissionEvidenceConflictError
      ) {
        throw error;
      }
      throw new LessonSessionSubmissionUnavailableError(
        "Session or immutable evidence changed before submission committed.",
      );
    }
  }

  private requirePromotedPackage() {
    if (!isPromotedContentReleasePolicy(this.publicationPolicy)) {
      throw new LessonSessionSubmissionUnavailableError(
        "The immutable current content package has not passed promotion gates.",
      );
    }
  }

  private async requireStartedSession(
    userId: string,
    sessionId: string,
    resetEpoch: number,
  ): Promise<SessionContext> {
    const session = await this.database.prepare(
      `SELECT session.id AS sessionId, session.enrollment_id AS enrollmentId,
              session.content_version AS contentVersion,
              session.reset_epoch AS resetEpoch,
              session.lesson_id AS lessonId,
              session.lesson_version AS lessonVersion,
              session.expected_evidence_count AS expectedEvidenceCount,
              session.form_schema_version AS formSchemaVersion,
              session.form_script AS formScript,
              session.form_manifest_json AS formManifestJson,
              session.form_manifest_hash AS formManifestHash,
              session.status AS status
       FROM lesson_sessions session
       INNER JOIN enrollments enrollment
         ON enrollment.user_id = session.user_id
        AND enrollment.id = session.enrollment_id
       INNER JOIN course_versions course
         ON course.id = enrollment.course_version_id
       WHERE session.user_id = ? AND session.id = ?
         AND session.status = 'started'
         AND session.reset_epoch = ?
         AND session.content_version = ?
         AND enrollment.status = 'active'
         AND enrollment.course_version_id = ?
         AND course.manifest_hash = ?
         AND course.release_state IN ('beta', 'published')
         AND course.linguistic_review_status = 'approved'
       LIMIT 1`,
    ).bind(
      userId,
      sessionId,
      resetEpoch,
      CONTENT_VERSION,
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
    ).first<SessionContext>();
    if (!session) {
      throw new LessonSessionSubmissionUnavailableError(
        "A started tenant-owned session in the exact released package is required.",
      );
    }
    return session;
  }

  private async requireExactReleasedLesson(
    session: SessionContext,
    requestedFormHash: LessonSessionFormHash,
  ) {
    if (session.contentVersion !== CONTENT_VERSION) {
      throw new LessonSessionSubmissionUnavailableError(
        "Session content version is not current.",
      );
    }
    try {
      return await validateStoredLessonSessionForm(session, requestedFormHash);
    } catch (error) {
      if (error instanceof LessonSessionFormValidationError) {
        if (error.message.includes("hash") || error.message.includes("not bound")) {
          throw new LessonSessionSubmissionEvidenceConflictError(error.message);
        }
        throw new LessonSessionSubmissionUnavailableError(error.message);
      }
      throw error;
    }
  }

  private async loadAttemptEvidence(
    userId: string,
    sessionId: string,
    resetEpoch: number,
  ) {
    const result = await this.database.prepare(
      `SELECT attempt.id AS attemptId,
              attempt.activity_id AS activityId,
              attempt.activity_version AS activityVersion,
              attempt.source AS source, attempt.method AS method,
              attempt.skill AS skill, attempt.outcome AS outcome,
              attempt.score AS score, attempt.used_hint AS usedHint,
              attempt.prior_exposure AS priorExposure,
              attempt.required_for_pass AS requiredForPass,
              attempt.scoring_version AS scoringVersion,
              evidence.id AS evidenceId,
              evidence.policy_version AS evidencePolicyVersion,
              evidence.activity_id AS evidenceActivityId,
              evidence.activity_version AS evidenceActivityVersion,
              evidence.source AS evidenceSource,
              evidence.method AS evidenceMethod,
              evidence.skill AS evidenceSkill,
              evidence.outcome AS evidenceOutcome,
              evidence.score AS evidenceScore,
              evidence.verified AS evidenceVerified
       FROM learning_attempts attempt
       LEFT JOIN learning_evidence evidence
        ON evidence.user_id = attempt.user_id
       AND evidence.attempt_id = attempt.id
       AND evidence.policy_version = attempt.scoring_version
       AND evidence.reset_epoch = attempt.reset_epoch
       WHERE attempt.user_id = ? AND attempt.session_id = ?
         AND attempt.reset_epoch = ?
       ORDER BY attempt.received_at ASC, attempt.id ASC`,
    ).bind(userId, sessionId, resetEpoch).all<StoredAttemptEvidence>();
    if (!result.success || !Array.isArray(result.results)) {
      throw new Error("Unable to load normalized lesson attempt evidence.");
    }
    return result.results;
  }

  private deriveSubmission(
    session: SessionContext,
    lesson: Lesson,
    form: LessonSessionFormV1,
    attempts: StoredAttemptEvidence[],
  ): DerivedSubmission {
    if (attempts.length !== session.expectedEvidenceCount) {
      throw new LessonSessionSubmissionIncompleteError(
        `Session has ${attempts.length}/${session.expectedEvidenceCount} normalized attempts.`,
      );
    }
    const seenActivities = new Set<string>();
    const formActivityById = new Map(
      form.activities.map((activity) => [activity.activityId, activity]),
    );
    const requiredIds = new Set(
      form.activities
        .filter((activity) => activity.requiredForPass)
        .map((activity) => activity.activityId),
    );
    let correctCount = 0;
    let gateCorrectCount = 0;
    let requiredCorrectCount = 0;

    for (const attempt of attempts) {
      if (seenActivities.has(attempt.activityId)) {
        throw new LessonSessionSubmissionEvidenceConflictError(
          "A lesson session cannot contain duplicate activity attempts.",
        );
      }
      seenActivities.add(attempt.activityId);
      const formActivity = formActivityById.get(attempt.activityId);
      const prefix = `${lesson.id}:`;
      const questionId = attempt.activityId.startsWith(prefix)
        ? attempt.activityId.slice(prefix.length)
        : "";
      const answer = questionId
        ? getAuthoritativeLessonAnswer(lesson.id, questionId)
        : null;
      const outcomeScoreValid =
        (attempt.outcome === "correct" && attempt.score === 100)
        || (attempt.outcome === "incorrect" && attempt.score === 0);
      if (
        !formActivity
        || !answer
        || formActivity.activityVersion !== attempt.activityVersion
        || formActivity.method !== attempt.method
        || formActivity.skill !== attempt.skill
        || formActivity.requiredForPass !== Boolean(attempt.requiredForPass)
        || attempt.source !== "lesson"
        || attempt.activityVersion !== answer.activityVersion
        || attempt.method !== answer.method
        || attempt.skill !== answer.skill
        || Boolean(attempt.requiredForPass) !== answer.requiredForPass
        || attempt.scoringVersion !== OBJECTIVE_SCORING_POLICY_VERSION
        || !outcomeScoreValid
        || !attempt.evidenceId
        || attempt.evidencePolicyVersion !== attempt.scoringVersion
        || attempt.evidenceActivityId !== attempt.activityId
        || attempt.evidenceActivityVersion !== attempt.activityVersion
        || attempt.evidenceSource !== attempt.source
        || attempt.evidenceMethod !== attempt.method
        || attempt.evidenceSkill !== attempt.skill
        || attempt.evidenceOutcome !== attempt.outcome
        || attempt.evidenceScore !== attempt.score
        || attempt.evidenceVerified !== 1
      ) {
        throw new LessonSessionSubmissionEvidenceConflictError(
          "Normalized attempt evidence does not match the frozen server item bank.",
        );
      }
      const correct = attempt.outcome === "correct";
      // Repeated activities remain marked as prior exposure and therefore do
      // not become fresh mastery evidence. They may still prove an unassisted
      // retry for lesson progression; otherwise a learner could never recover
      // from a failed first session with this fixed activity form.
      const gateEligible = attempt.usedHint === 0;
      if (correct) correctCount += 1;
      if (correct && gateEligible) gateCorrectCount += 1;
      if (answer.requiredForPass && correct && gateEligible) {
        requiredCorrectCount += 1;
      }
    }

    for (const requiredId of requiredIds) {
      if (!seenActivities.has(requiredId)) {
        throw new LessonSessionSubmissionIncompleteError(
          `Session is missing required activity ${requiredId}.`,
        );
      }
    }
    return calculateLessonCompletionScore({
      evidenceCount: attempts.length,
      correctCount,
      gateCorrectCount,
      requiredEvidenceCount: requiredIds.size,
      requiredCorrectCount,
    });
  }

  private async registerDevice(
    userId: string,
    command: SubmitLessonSessionCommandV1,
  ) {
    const timestamp = Date.now();
    const candidateDeviceId = crypto.randomUUID();
    await this.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES (?, ?, ?, ?, 0, ?, ?) ON CONFLICT(user_id, installation_id) DO UPDATE SET label = excluded.label, last_seen_at = excluded.last_seen_at, revoked_at = NULL",
    ).bind(
      candidateDeviceId,
      userId,
      command.installationId,
      command.deviceId,
      timestamp,
      timestamp,
    ).run();
    const device = await this.database.prepare(
      "SELECT id FROM devices WHERE user_id = ? AND installation_id = ? LIMIT 1",
    ).bind(userId, command.installationId).first<{ id: string }>();
    if (!device) throw new Error("Unable to register the submission device.");
    return device.id;
  }

  private async getIdempotency(
    userId: string,
    idempotencyKey: string,
    resetEpoch: number,
  ): Promise<ExistingIdempotency | null> {
    return this.database.prepare(
      "SELECT request_hash AS requestHash, status, response_json AS responseJson FROM idempotency_records WHERE user_id = ? AND reset_epoch = ? AND scope = ? AND idempotency_key = ? LIMIT 1",
    ).bind(
      userId,
      resetEpoch,
      LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE,
      idempotencyKey,
    ).first<ExistingIdempotency>();
  }

  private resolveExisting(
    existing: ExistingIdempotency,
    requestHash: string,
  ): SubmitLessonSessionReceiptV1 {
    if (existing.requestHash !== requestHash) {
      throw new LessonSessionSubmissionIdempotencyConflictError(
        "Idempotency key was already used with another submission payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new Error("A matching lesson-session submission is not recoverable.");
    }
    return { ...parseStoredReceipt(existing.responseJson), duplicate: true };
  }
}
