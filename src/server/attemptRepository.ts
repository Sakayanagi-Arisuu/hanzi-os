import { CONTENT_VERSION } from "../data/curriculum";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import {
  ATTEMPT_IDEMPOTENCY_SCOPE,
  ATTEMPT_PROTOCOL_VERSION,
  hashLearningAttemptCommand,
  type LearningAttemptCommandV1,
  type LearningAttemptReceiptV1,
} from "../learning/attemptProtocol";
import type { ObjectiveAttemptScore } from "./attemptScoring";
import type { D1Database } from "./d1";
import { ensureCurrentCourseVersion } from "./courseVersionRepository";
import {
  LessonSessionFormValidationError,
  validateStoredLessonSessionForm,
  type StoredLessonSessionFormBinding,
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

export class AttemptIdempotencyConflictError extends Error {
  readonly code = "ATTEMPT_IDEMPOTENCY_CONFLICT";
}

export class AttemptDeviceSequenceConflictError extends Error {
  readonly code = "ATTEMPT_DEVICE_SEQUENCE_CONFLICT";
}

export class AttemptEnrollmentUnavailableError extends Error {
  readonly code = "ATTEMPT_ENROLLMENT_UNAVAILABLE";
}

export class AttemptSessionUnavailableError extends Error {
  readonly code = "ATTEMPT_SESSION_UNAVAILABLE";
}

type ExistingIdempotency = {
  requestHash: string;
  status: string;
  responseJson: string | null;
};

type AttemptContext = {
  deviceRecordId: string;
  enrollmentId: string;
  sessionId: string | null;
  sessionFormHash: string | null;
  sessionExpectedEvidenceCount: number | null;
};

type AttemptSessionRow = StoredLessonSessionFormBinding & { id: string };

const nowEpoch = () => Date.now();

const parseStoredReceipt = (raw: string): LearningAttemptReceiptV1 => {
  const value: unknown = JSON.parse(raw);
  if (
    !value
    || typeof value !== "object"
    || (value as { protocolVersion?: unknown }).protocolVersion !== ATTEMPT_PROTOCOL_VERSION
    || typeof (value as { attemptId?: unknown }).attemptId !== "string"
    || typeof (value as { evidenceId?: unknown }).evidenceId !== "string"
    || !isValidLearningResetEpoch((value as { resetEpoch?: unknown }).resetEpoch)
  ) {
    throw new Error("Stored learning-attempt receipt is invalid.");
  }
  return value as LearningAttemptReceiptV1;
};

export class AttemptRepository {
  constructor(
    private readonly database: D1Database,
    private readonly publicationPolicy: LessonSessionPublicationPolicy =
      CURRENT_LESSON_SESSION_PUBLICATION_POLICY,
  ) {}

  async commitObjectiveAttempt(
    userId: string,
    command: LearningAttemptCommandV1,
    score: ObjectiveAttemptScore,
  ): Promise<LearningAttemptReceiptV1> {
    const requestHash = await hashLearningAttemptCommand(command);
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
    const context = await this.ensureAttemptContext(userId, command, score);
    const sequenceOwner = await this.database
      .prepare(
        "SELECT idempotency_key AS idempotencyKey FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
      )
      .bind(userId, context.deviceRecordId, command.deviceSequence)
      .first<{ idempotencyKey: string }>();
    if (sequenceOwner && sequenceOwner.idempotencyKey !== command.idempotencyKey) {
      throw new AttemptDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }

    const timestamp = nowEpoch();
    const idempotencyRecordId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const receipt: LearningAttemptReceiptV1 = {
      protocolVersion: ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      attemptId,
      evidenceId,
      resetEpoch: command.resetEpoch,
      source: command.source,
      method: command.method,
      activityId: command.activityId,
      activityVersion: command.activityVersion,
      skill: score.skill,
      outcome: score.outcome,
      score: score.score,
      verification: "server-objective",
    };
    const responseJson = JSON.stringify(receipt);
    const responsePayload = JSON.stringify(command.response);
    const evidenceMetadata = JSON.stringify(score.metadata);
    const occurredAt = Date.parse(command.occurredAt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "learning.attempt.recorded",
      aggregateId: attemptId,
      resetEpoch: command.resetEpoch,
      payload: {
        attemptId,
        evidenceId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        source: command.source,
        method: command.method,
        activityId: command.activityId,
        activityVersion: command.activityVersion,
        skill: score.skill,
        outcome: score.outcome,
        score: score.score,
        verification: "server-objective",
        masteryEligible: false,
      },
    });
    const transactionalGuard = command.source === "lesson"
      ? `EXISTS (
          SELECT 1
          FROM lesson_sessions session
          INNER JOIN enrollments enrollment
            ON enrollment.user_id = session.user_id
           AND enrollment.id = session.enrollment_id
          INNER JOIN course_versions course
            ON course.id = enrollment.course_version_id
          WHERE session.user_id = ? AND session.id = ?
            AND session.enrollment_id = ? AND session.status = 'started'
            AND session.reset_epoch = ?
            AND session.content_version = ? AND session.lesson_id = ?
            AND session.lesson_version = ?
            AND session.form_manifest_hash = ?
            AND session.expected_evidence_count = ?
            AND json_array_length(session.form_manifest_json, '$.activities') = ?
            AND enrollment.status = 'active'
            AND course.manifest_hash = ?
            AND course.release_state IN ('beta', 'published')
            AND course.linguistic_review_status = 'approved'
            AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
            AND EXISTS (
              SELECT 1 FROM json_each(session.form_manifest_json, '$.activities') activity
              WHERE json_extract(activity.value, '$.activityId') = ?
                AND json_extract(activity.value, '$.activityVersion') = ?
                AND json_extract(activity.value, '$.method') = ?
                AND json_extract(activity.value, '$.skill') = ?
                AND CAST(json_extract(activity.value, '$.requiredForPass') AS INTEGER) = ?
            )
        )`
      : `EXISTS (
          SELECT 1 FROM enrollments enrollment
          INNER JOIN course_versions course ON course.id = enrollment.course_version_id
          WHERE enrollment.user_id = ? AND enrollment.id = ?
            AND enrollment.course_version_id = ? AND enrollment.status = 'active'
            AND course.manifest_hash = ?
            AND course.release_state IN ('beta', 'published')
            AND course.linguistic_review_status = 'approved'
            AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
        )`;
    const transactionalGuardBindings = command.source === "lesson"
      ? [
          userId,
          context.sessionId,
          context.enrollmentId,
          command.resetEpoch,
          CONTENT_VERSION,
          score.sessionBinding?.lessonId,
          score.sessionBinding?.lessonVersion,
          context.sessionFormHash,
          context.sessionExpectedEvidenceCount,
          context.sessionExpectedEvidenceCount,
          CURRENT_CONTENT_MANIFEST_SHA256,
          userId,
          command.resetEpoch,
          command.activityId,
          command.activityVersion,
          command.method,
          score.skill,
          score.requiredForPass ? 1 : 0,
        ]
      : [
          userId,
          context.enrollmentId,
          CONTENT_VERSION,
          CURRENT_CONTENT_MANIFEST_SHA256,
          userId,
          command.resetEpoch,
        ];

    const statements = [
      this.database
        .prepare(
          `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
           WHERE ${transactionalGuard}`,
        )
        .bind(
          idempotencyRecordId,
          userId,
          context.deviceRecordId,
          command.deviceSequence,
          command.resetEpoch,
          ATTEMPT_IDEMPOTENCY_SCOPE,
          command.idempotencyKey,
          requestHash,
          responseJson,
          timestamp,
          timestamp,
          timestamp,
          ...transactionalGuardBindings,
        ),
      this.database
        .prepare(
          "INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, device_id, device_sequence, idempotency_record_id, schema_version, reset_epoch, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, score, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN EXISTS (SELECT 1 FROM learning_attempts WHERE user_id = ? AND reset_epoch = ? AND activity_id = ? AND activity_version = ?) THEN 1 ELSE 0 END, ?, ?, ?, ?)",
        )
        .bind(
          attemptId,
          userId,
          context.enrollmentId,
          context.sessionId,
          context.deviceRecordId,
          command.deviceSequence,
          idempotencyRecordId,
          command.resetEpoch,
          CONTENT_VERSION,
          command.activityId,
          command.activityVersion,
          command.source,
          command.method,
          score.skill,
          responsePayload,
          score.outcome,
          score.score,
          command.response.usedHint ? 1 : 0,
          userId,
          command.resetEpoch,
          command.activityId,
          command.activityVersion,
          score.requiredForPass ? 1 : 0,
          score.scoringVersion,
          occurredAt,
          timestamp,
        ),
      this.database
        .prepare(
          "INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, session_id, schema_version, reset_epoch, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, score, verified, mastery_eligible, metadata_json, occurred_at, recorded_at) VALUES (?, ?, ?, ?, NULL, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CASE WHEN ? = 1 AND COALESCE((SELECT prior_exposure FROM learning_attempts WHERE user_id = ? AND reset_epoch = ? AND id = ?), 1) = 0 THEN 1 ELSE 0 END, ?, ?, ?)",
        )
        .bind(
          evidenceId,
          userId,
          context.enrollmentId,
          attemptId,
          command.resetEpoch,
          score.scoringVersion,
          CONTENT_VERSION,
          command.activityId,
          command.activityVersion,
          command.source,
          command.method,
          score.skill,
          score.outcome,
          score.score,
          score.baseMasteryEligible ? 1 : 0,
          userId,
          command.resetEpoch,
          attemptId,
          evidenceMetadata,
          occurredAt,
          timestamp,
        ),
      this.database
        .prepare(
          "UPDATE enrollments SET last_activity_at = ?, revision = revision + 1 WHERE user_id = ? AND id = ?",
        )
        .bind(timestamp, userId, context.enrollmentId),
      this.database
        .prepare(
          "INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at) VALUES (?, ?, 'learning_attempt', ?, 'learning.attempt.recorded', 1, ?, ?, 'pending', 0, ?, ?)",
        )
        .bind(
          outboxId,
          userId,
          attemptId,
          command.resetEpoch,
          eventPayload,
          timestamp,
          timestamp,
        ),
      this.database
        .prepare(
          `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
           SELECT ?, ?, ?, id, 1, ?, 'upsert', NULL, ?
           FROM learning_attempts
           WHERE id = ? AND user_id = ? AND reset_epoch = ?`,
        )
        .bind(
          userId,
          command.resetEpoch,
          NORMALIZED_LEARNING_CHANGE_ENTITY.learningAttempt,
          normalizedLearningChangeOperationId.learningAttemptRecorded(
            command.idempotencyKey,
          ),
          timestamp,
          attemptId,
          userId,
          command.resetEpoch,
        ),
    ];

    try {
      const results = await this.database.batch(statements);
      if (results.some((result) =>
        !result.success || result.meta?.changes !== 1
      )) {
        throw new Error("D1 rejected the objective-attempt transaction.");
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        command.idempotencyKey,
        command.resetEpoch,
      );
      if (winner) return this.resolveExisting(winner, requestHash);
      const conflictingSequence = await this.database
        .prepare(
          "SELECT id FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
        )
        .bind(userId, context.deviceRecordId, command.deviceSequence)
        .first<{ id: string }>();
      if (conflictingSequence) {
        throw new AttemptDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (command.source === "lesson") {
        throw new AttemptSessionUnavailableError(
          "Lesson session or immutable form changed before the attempt committed.",
        );
      }
      if (error instanceof Error) {
        throw new AttemptEnrollmentUnavailableError(
          "Released reader enrollment changed before the attempt committed.",
        );
      }
      throw error;
    }
  }

  private async ensureAttemptContext(
    userId: string,
    command: LearningAttemptCommandV1,
    score: ObjectiveAttemptScore,
  ): Promise<AttemptContext> {
    const timestamp = nowEpoch();
    await ensureCurrentCourseVersion(this.database);
    const releasedCourse = await this.database.prepare(
      "SELECT id FROM course_versions WHERE id = ? AND manifest_hash = ? AND release_state IN ('beta', 'published') AND linguistic_review_status = 'approved' LIMIT 1",
    ).bind(
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
    ).first<{ id: string }>();
    if (!releasedCourse) {
      throw new AttemptEnrollmentUnavailableError(
        "Objective attempts require an explicitly released and reviewed course version.",
      );
    }

    const candidateDeviceId = crypto.randomUUID();
    await this.database
      .prepare(
        "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES (?, ?, ?, ?, 0, ?, ?) ON CONFLICT(user_id, installation_id) DO UPDATE SET label = excluded.label, last_seen_at = excluded.last_seen_at, revoked_at = NULL",
      )
      .bind(
        candidateDeviceId,
        userId,
        command.installationId,
        command.deviceId,
        timestamp,
        timestamp,
      )
      .run();
    const device = await this.database
      .prepare(
        "SELECT id FROM devices WHERE user_id = ? AND installation_id = ? LIMIT 1",
      )
      .bind(userId, command.installationId)
      .first<{ id: string }>();
    if (!device) throw new Error("Unable to register the attempt device.");

    let enrollment = await this.database
      .prepare(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_version_id = ? AND status = 'active' LIMIT 1",
      )
      .bind(userId, CONTENT_VERSION)
      .first<{ id: string }>();
    if (!enrollment) {
      const profile = await this.database
        .prepare("SELECT goal FROM profiles WHERE user_id = ? LIMIT 1")
        .bind(userId)
        .first<{ goal: string }>();
      if (!profile) {
        throw new AttemptEnrollmentUnavailableError(
          "A synced learner profile is required before normalized attempts.",
        );
      }
      const enrollmentId = crypto.randomUUID();
      await this.database
        .prepare(
          "INSERT OR IGNORE INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, ?, 'active', 1, ?, ?)",
        )
        .bind(
          enrollmentId,
          userId,
          CONTENT_VERSION,
          profile.goal,
          timestamp,
          timestamp,
        )
        .run();
      enrollment = await this.database
        .prepare(
          "SELECT id FROM enrollments WHERE user_id = ? AND course_version_id = ? AND status = 'active' LIMIT 1",
        )
        .bind(userId, CONTENT_VERSION)
        .first<{ id: string }>();
    }
    if (!enrollment) {
      throw new AttemptEnrollmentUnavailableError(
        "Unable to establish a current course enrollment.",
      );
    }

    let sessionId: string | null = null;
    let sessionFormHash: string | null = null;
    let sessionExpectedEvidenceCount: number | null = null;
    if (command.source === "lesson") {
      if (!command.sessionId || !score.sessionBinding) {
        throw new AttemptSessionUnavailableError(
          "Lesson attempts require a server-issued lesson session.",
        );
      }
      const session = await this.database
        .prepare(
          "SELECT id, lesson_id AS lessonId, lesson_version AS lessonVersion, expected_evidence_count AS expectedEvidenceCount, form_schema_version AS formSchemaVersion, form_script AS formScript, form_manifest_json AS formManifestJson, form_manifest_hash AS formManifestHash FROM lesson_sessions WHERE user_id = ? AND id = ? AND enrollment_id = ? AND reset_epoch = ? AND content_version = ? AND lesson_id = ? AND lesson_version = ? AND status = 'started' LIMIT 1",
        )
        .bind(
          userId,
          command.sessionId,
          enrollment.id,
          command.resetEpoch,
          CONTENT_VERSION,
          score.sessionBinding.lessonId,
          score.sessionBinding.lessonVersion,
        )
        .first<AttemptSessionRow>();
      if (!session) {
        throw new AttemptSessionUnavailableError(
          "Lesson session does not belong to this learner and enrollment.",
        );
      }
      try {
        const { form, formHash } = await validateStoredLessonSessionForm(session);
        const formActivity = form.activities.find(
          (activity) => activity.activityId === command.activityId,
        );
        if (
          !formActivity
          || formActivity.activityVersion !== command.activityVersion
          || formActivity.method !== command.method
          || formActivity.skill !== score.skill
          || formActivity.requiredForPass !== score.requiredForPass
        ) {
          throw new AttemptSessionUnavailableError(
            "Lesson activity is not part of the immutable server-issued form.",
          );
        }
        sessionFormHash = formHash;
        sessionExpectedEvidenceCount = session.expectedEvidenceCount;
      } catch (error) {
        if (error instanceof AttemptSessionUnavailableError) throw error;
        if (error instanceof LessonSessionFormValidationError) {
          throw new AttemptSessionUnavailableError(error.message);
        }
        throw error;
      }
      sessionId = session.id;
    } else if (command.sessionId || score.sessionBinding) {
      throw new AttemptSessionUnavailableError(
        "Reader attempts cannot use lesson sessions.",
      );
    }
    return {
      deviceRecordId: device.id,
      enrollmentId: enrollment.id,
      sessionId,
      sessionFormHash,
      sessionExpectedEvidenceCount,
    };
  }

  private requirePromotedPackage() {
    if (!isPromotedContentReleasePolicy(this.publicationPolicy)) {
      throw new AttemptEnrollmentUnavailableError(
        "The immutable current package has not passed promotion gates.",
      );
    }
  }

  private async getIdempotency(
    userId: string,
    idempotencyKey: string,
    resetEpoch: number,
  ): Promise<ExistingIdempotency | null> {
    return this.database
      .prepare(
        "SELECT request_hash AS requestHash, status, response_json AS responseJson FROM idempotency_records WHERE user_id = ? AND reset_epoch = ? AND scope = ? AND idempotency_key = ? LIMIT 1",
      )
      .bind(userId, resetEpoch, ATTEMPT_IDEMPOTENCY_SCOPE, idempotencyKey)
      .first<ExistingIdempotency>();
  }

  private resolveExisting(
    existing: ExistingIdempotency,
    requestHash: string,
  ): LearningAttemptReceiptV1 {
    if (existing.requestHash !== requestHash) {
      throw new AttemptIdempotencyConflictError(
        "Idempotency key was already used with another attempt payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new Error("A matching objective attempt is not yet recoverable.");
    }
    return { ...parseStoredReceipt(existing.responseJson), duplicate: true };
  }
}
