import {
  hashAbandonLessonSessionCommand,
  LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE,
  LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION,
  type AbandonLessonSessionCommandV1,
  type AbandonLessonSessionReceiptV1,
} from "../learning/lessonSessionAbandonmentProtocol";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import type { D1Database, D1RunResult } from "./d1";
import {
  CURRENT_LEARNING_RESET_EPOCH_SQL,
  requireCurrentLearningResetEpoch,
} from "./learningResetEpoch";
import {
  NORMALIZED_LEARNING_CHANGE_ENTITY,
  normalizedLearningChangeOperationId,
} from "./normalizedLearningChange";
import { encodeOutboxEventPayload } from "./outboxEventContract";

export class LessonSessionAbandonmentIdempotencyConflictError extends Error {
  readonly code = "LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_CONFLICT";
}

export class LessonSessionAbandonmentDeviceSequenceConflictError extends Error {
  readonly code = "LESSON_SESSION_ABANDONMENT_DEVICE_SEQUENCE_CONFLICT";
}

export class LessonSessionAbandonmentUnavailableError extends Error {
  readonly code = "LESSON_SESSION_ABANDONMENT_UNAVAILABLE";
}

type ExistingIdempotency = {
  requestHash: string;
  status: string;
  responseJson: string | null;
};

type SessionContext = {
  sessionId: string;
  enrollmentId: string;
  contentVersion: string;
  resetEpoch: number;
  lessonId: string;
  lessonVersion: string;
  contentManifestSha256: string;
};

const parseStoredReceipt = (raw: string): AbandonLessonSessionReceiptV1 => {
  const value: unknown = JSON.parse(raw);
  if (
    !value
    || typeof value !== "object"
    || (value as { protocolVersion?: unknown }).protocolVersion
      !== LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION
    || typeof (value as { idempotencyKey?: unknown }).idempotencyKey !== "string"
    || typeof (value as { sessionId?: unknown }).sessionId !== "string"
    || typeof (value as { enrollmentId?: unknown }).enrollmentId !== "string"
    || typeof (value as { contentVersion?: unknown }).contentVersion !== "string"
    || !isValidLearningResetEpoch((value as { resetEpoch?: unknown }).resetEpoch)
    || typeof (value as { lessonId?: unknown }).lessonId !== "string"
    || typeof (value as { lessonVersion?: unknown }).lessonVersion !== "string"
    || (value as { status?: unknown }).status !== "abandoned"
    || typeof (value as { abandonedAt?: unknown }).abandonedAt !== "string"
    || !Number.isFinite(Date.parse(
      (value as { abandonedAt: string }).abandonedAt,
    ))
  ) {
    throw new Error("Stored lesson-session abandonment receipt is invalid.");
  }
  return value as AbandonLessonSessionReceiptV1;
};

const allChangedOnce = (results: Array<D1RunResult>) =>
  results.every((result) => result.success && result.meta?.changes === 1);

export class LessonSessionAbandonmentRepository {
  constructor(private readonly database: D1Database) {}

  async abandon(
    userId: string,
    command: AbandonLessonSessionCommandV1,
  ): Promise<AbandonLessonSessionReceiptV1> {
    const requestHash = await hashAbandonLessonSessionCommand(command);
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

    const session = await this.requireStartedSession(
      userId,
      command.sessionId,
      command.resetEpoch,
    );
    const deviceRecordId = await this.registerDevice(userId, command);
    const sequenceOwner = await this.database.prepare(
      "SELECT idempotency_key AS idempotencyKey FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
    ).bind(
      userId,
      deviceRecordId,
      command.deviceSequence,
    ).first<{ idempotencyKey: string }>();
    if (sequenceOwner && sequenceOwner.idempotencyKey !== command.idempotencyKey) {
      throw new LessonSessionAbandonmentDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }

    const timestamp = Date.now();
    const abandonedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const receipt: AbandonLessonSessionReceiptV1 = {
      protocolVersion: LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      contentVersion: session.contentVersion,
      resetEpoch: command.resetEpoch,
      lessonId: session.lessonId,
      lessonVersion: session.lessonVersion,
      status: "abandoned",
      abandonedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "lesson.abandoned",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        idempotencyKey: command.idempotencyKey,
        sessionId: session.sessionId,
        enrollmentId: session.enrollmentId,
        contentVersion: session.contentVersion,
        resetEpoch: command.resetEpoch,
        contentManifestSha256: session.contentManifestSha256,
        lessonId: session.lessonId,
        lessonVersion: session.lessonVersion,
        abandonedAt,
      },
    });

    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1
           FROM lesson_sessions session
           INNER JOIN course_versions course
             ON course.id = session.content_version
           WHERE session.user_id = ?
             AND session.id = ?
             AND session.status = 'started'
             AND session.reset_epoch = ?
             AND session.content_version = ?
             AND session.lesson_id = ?
             AND session.lesson_version = ?
             AND course.manifest_hash = ?
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        userId,
        session.sessionId,
        command.resetEpoch,
        session.contentVersion,
        session.lessonId,
        session.lessonVersion,
        session.contentManifestSha256,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `UPDATE lesson_sessions
         SET status = 'abandoned'
         WHERE user_id = ? AND id = ? AND reset_epoch = ?
           AND content_version = ? AND lesson_id = ? AND lesson_version = ?
           AND status = 'started'
           AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
           )`,
      ).bind(
        userId,
        session.sessionId,
        command.resetEpoch,
        session.contentVersion,
        session.lessonId,
        session.lessonVersion,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         VALUES (?, ?, 'lesson_session', (
           SELECT id FROM lesson_sessions
           WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'abandoned'
             AND EXISTS (
               SELECT 1 FROM idempotency_records
               WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
             )
         ), 'lesson.abandoned', 1, ?, ?, 'pending', 0, ?, ?)`,
      ).bind(
        outboxId,
        userId,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE,
        command.resetEpoch,
        eventPayload,
        timestamp,
        timestamp,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         VALUES (?, ?, ?, (
           SELECT id FROM lesson_sessions
           WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'abandoned'
             AND EXISTS (
               SELECT 1 FROM idempotency_records
               WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
             )
         ), 2, ?, 'upsert', NULL, ?)`,
      ).bind(
        userId,
        command.resetEpoch,
        NORMALIZED_LEARNING_CHANGE_ENTITY.lessonSession,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE,
        normalizedLearningChangeOperationId.lessonSessionAbandoned(
          command.idempotencyKey,
        ),
        timestamp,
      ),
    ];

    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new LessonSessionAbandonmentUnavailableError(
          "Session ownership or state changed while abandoning the lesson.",
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
        throw new LessonSessionAbandonmentDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (error instanceof LessonSessionAbandonmentUnavailableError) {
        throw error;
      }
      throw new LessonSessionAbandonmentUnavailableError(
        "Session ownership, reset epoch, or state changed before abandonment committed.",
      );
    }
  }

  private async requireStartedSession(
    userId: string,
    sessionId: string,
    resetEpoch: number,
  ): Promise<SessionContext> {
    const session = await this.database.prepare(
      `SELECT session.id AS sessionId,
              session.enrollment_id AS enrollmentId,
              session.content_version AS contentVersion,
              session.reset_epoch AS resetEpoch,
              session.lesson_id AS lessonId,
              session.lesson_version AS lessonVersion,
              course.manifest_hash AS contentManifestSha256
       FROM lesson_sessions session
       INNER JOIN course_versions course
         ON course.id = session.content_version
       WHERE session.user_id = ? AND session.id = ?
         AND session.status = 'started'
         AND session.reset_epoch = ?
       LIMIT 1`,
    ).bind(
      userId,
      sessionId,
      resetEpoch,
    ).first<SessionContext>();
    if (!session) {
      throw new LessonSessionAbandonmentUnavailableError(
        "A started tenant-owned session in the current reset epoch is required.",
      );
    }
    return session;
  }

  private async registerDevice(
    userId: string,
    command: AbandonLessonSessionCommandV1,
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
    if (!device) throw new Error("Unable to register the abandonment device.");
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
      LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE,
      idempotencyKey,
    ).first<ExistingIdempotency>();
  }

  private resolveExisting(
    existing: ExistingIdempotency,
    requestHash: string,
  ): AbandonLessonSessionReceiptV1 {
    if (existing.requestHash !== requestHash) {
      throw new LessonSessionAbandonmentIdempotencyConflictError(
        "Idempotency key was already used with another abandonment payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new Error("A matching lesson-session abandonment is not recoverable.");
    }
    return { ...parseStoredReceipt(existing.responseJson), duplicate: true };
  }
}
