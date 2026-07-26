import {
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "../content/currentPackage";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
} from "../data/curriculum";
import {
  buildExercises,
  type Exercise,
  type RandomSource,
} from "../lib/exerciseGeneration";
import {
  canonicalLessonSessionForm,
  hashLessonSessionForm,
  hashOpenLessonSessionCommand,
  LESSON_SESSION_IDEMPOTENCY_SCOPE,
  LESSON_SESSION_FORM_SCHEMA_VERSION,
  LESSON_SESSION_PROTOCOL_VERSION,
  type LessonSessionFormHash,
  type LessonSessionFormV1,
  type OpenLessonSessionCommandV1,
  type OpenLessonSessionReceiptV1,
} from "../learning/lessonSessionProtocol";
import type { Lesson } from "../types";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import { ensureCurrentCourseVersion } from "./courseVersionRepository";
import type { D1Database, D1RunResult } from "./d1";
import { getAuthoritativeLessonAnswer } from "./authoritativeItemBank";
import {
  CURRENT_LEARNING_RESET_EPOCH_SQL,
  requireCurrentLearningResetEpoch,
} from "./learningResetEpoch";
import {
  NORMALIZED_LEARNING_CHANGE_ENTITY,
  normalizedLearningChangeOperationId,
} from "./normalizedLearningChange";
import { encodeOutboxEventPayload } from "./outboxEventContract";

export class LessonSessionIdempotencyConflictError extends Error {
  readonly code = "LESSON_SESSION_IDEMPOTENCY_CONFLICT";
}

export class LessonSessionDeviceSequenceConflictError extends Error {
  readonly code = "LESSON_SESSION_DEVICE_SEQUENCE_CONFLICT";
}

export class LessonSessionEnrollmentUnavailableError extends Error {
  readonly code = "LESSON_SESSION_ENROLLMENT_UNAVAILABLE";
}

export class LessonSessionContentUnavailableError extends Error {
  readonly code = "LESSON_SESSION_CONTENT_UNAVAILABLE";
}

export class LessonSessionPrerequisiteUnavailableError extends Error {
  readonly code = "LESSON_SESSION_PREREQUISITE_UNAVAILABLE";
}

type ExistingIdempotency = {
  requestHash: string;
  status: string;
  responseJson: string | null;
};

type EnrollmentContext = {
  enrollmentId: string;
  script: "simplified" | "traditional";
};

type ServerLessonBinding = {
  lesson: Lesson;
  lessonVersion: string;
  expectedEvidenceCount: number;
  form: LessonSessionFormV1;
  formHash: LessonSessionFormHash;
  prerequisiteVersions: Array<{ lessonId: string; lessonVersion: string }>;
};

export type LessonSessionPublicationPolicy = ContentReleasePolicy;
export const CURRENT_LESSON_SESSION_PUBLICATION_POLICY = CURRENT_CONTENT_RELEASE_POLICY;

const isReleasedLessonState = (state: Lesson["releaseState"]) =>
  state === "beta" || state === "published";

const lessonVersion = (lesson: Lesson) =>
  `${lesson.contentVersion}:${lesson.id}:1`;

const methodForExercise = (exercise: Exercise) => {
  switch (exercise.kind) {
    case "meaning": return "meaning-selection" as const;
    case "pinyin":
    case "tone":
    case "tone-pair": return "phonology-recognition" as const;
    case "listening": return "listening-selection" as const;
    case "recall": return "typed-character-recall" as const;
    case "sentence": return "reading-comprehension" as const;
  }
};

const secureRandom: RandomSource = () => {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 0x1_0000_0000;
};

const parseStoredReceipt = (raw: string): OpenLessonSessionReceiptV1 => {
  const value: unknown = JSON.parse(raw);
  if (
    !value
    || typeof value !== "object"
    || (value as { protocolVersion?: unknown }).protocolVersion
      !== LESSON_SESSION_PROTOCOL_VERSION
    || typeof (value as { idempotencyKey?: unknown }).idempotencyKey !== "string"
    || typeof (value as { sessionId?: unknown }).sessionId !== "string"
    || typeof (value as { enrollmentId?: unknown }).enrollmentId !== "string"
    || !isValidLearningResetEpoch((value as { resetEpoch?: unknown }).resetEpoch)
    || typeof (value as { lessonId?: unknown }).lessonId !== "string"
    || typeof (value as { lessonVersion?: unknown }).lessonVersion !== "string"
    || !Number.isSafeInteger(
      (value as { expectedEvidenceCount?: unknown }).expectedEvidenceCount,
    )
    || typeof (value as { form?: unknown }).form !== "object"
    || !/^sha256:[a-f0-9]{64}$/u.test(
      String((value as { formHash?: unknown }).formHash ?? ""),
    )
    || (value as { status?: unknown }).status !== "started"
    || typeof (value as { startedAt?: unknown }).startedAt !== "string"
  ) {
    throw new Error("Stored lesson-session receipt is invalid.");
  }
  return value as OpenLessonSessionReceiptV1;
};

const allChangedOnce = (results: Array<D1RunResult>) =>
  results.every((result) => result.success && result.meta?.changes === 1);

export const MAX_ACTIVE_LESSON_SESSIONS = 5;

export class LessonSessionRepository {
  constructor(
    private readonly database: D1Database,
    private readonly publicationPolicy = CURRENT_LESSON_SESSION_PUBLICATION_POLICY,
    private readonly randomSource: RandomSource = secureRandom,
  ) {}

  async open(
    userId: string,
    command: OpenLessonSessionCommandV1,
  ): Promise<OpenLessonSessionReceiptV1> {
    const requestHash = await hashOpenLessonSessionCommand(command);
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
    const enrollment = await this.requireCurrentEnrollment(userId, command);
    const binding = await this.requireReleasedLesson(
      userId,
      enrollment,
      command.lessonId,
    );
    const deviceRecordId = await this.registerDevice(userId, command);

    const sequenceOwner = await this.database
      .prepare(
        "SELECT idempotency_key AS idempotencyKey FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
      )
      .bind(userId, deviceRecordId, command.deviceSequence)
      .first<{ idempotencyKey: string }>();
    if (sequenceOwner && sequenceOwner.idempotencyKey !== command.idempotencyKey) {
      throw new LessonSessionDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }

    const timestamp = Date.now();
    const startedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const receipt: OpenLessonSessionReceiptV1 = {
      protocolVersion: LESSON_SESSION_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId,
      enrollmentId: enrollment.enrollmentId,
      contentVersion: CONTENT_VERSION,
      resetEpoch: command.resetEpoch,
      lessonId: binding.lesson.id,
      lessonVersion: binding.lessonVersion,
      expectedEvidenceCount: binding.expectedEvidenceCount,
      form: binding.form,
      formHash: binding.formHash,
      status: "started",
      startedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "lesson.started",
      aggregateId: sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        idempotencyKey: command.idempotencyKey,
        sessionId,
        enrollmentId: enrollment.enrollmentId,
        contentVersion: CONTENT_VERSION,
        resetEpoch: command.resetEpoch,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        lessonId: binding.lesson.id,
        lessonVersion: binding.lessonVersion,
        expectedEvidenceCount: binding.expectedEvidenceCount,
        formSchemaVersion: binding.form.schemaVersion,
        formHash: binding.formHash,
        startedAt,
      },
    });

    const prerequisiteClauses = binding.prerequisiteVersions.map(() =>
      "AND EXISTS (SELECT 1 FROM lesson_sessions prerequisite WHERE prerequisite.user_id = ? AND prerequisite.enrollment_id = ? AND prerequisite.reset_epoch = ? AND prerequisite.content_version = ? AND prerequisite.lesson_id = ? AND prerequisite.lesson_version = ? AND prerequisite.status = 'submitted' AND prerequisite.passed = 1)"
    ).join(" ");
    const prerequisiteBindings = binding.prerequisiteVersions.flatMap(
      (prerequisite) => [
        userId,
        enrollment.enrollmentId,
        command.resetEpoch,
        CONTENT_VERSION,
        prerequisite.lessonId,
        prerequisite.lessonVersion,
      ],
    );

    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1
           FROM enrollments enrollment
           INNER JOIN course_versions course ON course.id = enrollment.course_version_id
           WHERE enrollment.id = ?
             AND enrollment.user_id = ?
             AND enrollment.course_version_id = ?
             AND enrollment.status = 'active'
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
         )
         AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         AND (
           SELECT COUNT(*) FROM lesson_sessions active_session
           WHERE active_session.user_id = ?
             AND active_session.reset_epoch = ?
             AND active_session.content_version = ?
             AND active_session.status = 'started'
         ) < ?
         ${prerequisiteClauses}`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        LESSON_SESSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        enrollment.enrollmentId,
        userId,
        CONTENT_VERSION,
        CURRENT_CONTENT_MANIFEST_SHA256,
        userId,
        command.resetEpoch,
        userId,
        command.resetEpoch,
        CONTENT_VERSION,
        MAX_ACTIVE_LESSON_SESSIONS,
        ...prerequisiteBindings,
      ),
      this.database.prepare(
        `INSERT INTO lesson_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, reset_epoch, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, started_at, created_at)
         SELECT ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'started', ?, ?
         FROM idempotency_records
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?`,
      ).bind(
        sessionId,
        userId,
        enrollment.enrollmentId,
        deviceRecordId,
        idempotencyRecordId,
        command.resetEpoch,
        CONTENT_VERSION,
        binding.lesson.id,
        binding.lessonVersion,
        binding.expectedEvidenceCount,
        binding.form.schemaVersion,
        binding.form.script,
        canonicalLessonSessionForm(binding.form),
        binding.formHash,
        timestamp,
        timestamp,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        LESSON_SESSION_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         VALUES (?, ?, 'lesson_session', (
           SELECT id FROM lesson_sessions
           WHERE id = ? AND user_id = ? AND reset_epoch = ?
         ), 'lesson.started', 1, ?, ?, 'pending', 0, ?, ?)`,
      ).bind(
        outboxId,
        userId,
        sessionId,
        userId,
        command.resetEpoch,
        command.resetEpoch,
        eventPayload,
        timestamp,
        timestamp,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, ?, ?, id, 1, ?, 'upsert', NULL, ?
         FROM lesson_sessions
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'started'`,
      ).bind(
        userId,
        command.resetEpoch,
        NORMALIZED_LEARNING_CHANGE_ENTITY.lessonSession,
        normalizedLearningChangeOperationId.lessonSessionOpened(
          command.idempotencyKey,
        ),
        timestamp,
        sessionId,
        userId,
        command.resetEpoch,
      ),
    ];

    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new LessonSessionContentUnavailableError(
          "Lesson release, enrollment, or prerequisite state changed while opening the session.",
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
      const conflictingSequence = await this.database
        .prepare(
          "SELECT id FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
        )
        .bind(userId, deviceRecordId, command.deviceSequence)
        .first<{ id: string }>();
      if (conflictingSequence) {
        throw new LessonSessionDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (
        error instanceof LessonSessionContentUnavailableError
        || error instanceof LessonSessionEnrollmentUnavailableError
        || error instanceof LessonSessionPrerequisiteUnavailableError
      ) {
        throw error;
      }
      throw new LessonSessionContentUnavailableError(
        "Lesson release, reset epoch, active-session cap, or prerequisite changed before commit.",
      );
    }
  }

  private requirePromotedPackage() {
    if (!isPromotedContentReleasePolicy(this.publicationPolicy)) {
      throw new LessonSessionContentUnavailableError(
        "The immutable current content package has not passed explicit promotion gates.",
      );
    }
  }

  private async requireCurrentEnrollment(
    userId: string,
    command: OpenLessonSessionCommandV1,
  ): Promise<EnrollmentContext> {
    const enrollment = await this.database.prepare(
      `SELECT enrollment.id AS enrollmentId, profile.script AS script
       FROM enrollments enrollment
       INNER JOIN profiles profile ON profile.user_id = enrollment.user_id
       INNER JOIN course_versions course ON course.id = enrollment.course_version_id
       WHERE enrollment.user_id = ?
         AND enrollment.id = ?
         AND enrollment.course_version_id = ?
         AND enrollment.status = 'active'
         AND course.manifest_hash = ?
         AND course.release_state IN ('beta', 'published')
         AND course.linguistic_review_status = 'approved'
       LIMIT 1`,
    ).bind(
      userId,
      command.enrollmentId,
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
    ).first<EnrollmentContext>();
    if (!enrollment) {
      throw new LessonSessionEnrollmentUnavailableError(
        "An active enrollment in the exact approved content package is required.",
      );
    }
    if (enrollment.script !== "simplified" && enrollment.script !== "traditional") {
      throw new LessonSessionEnrollmentUnavailableError(
        "The enrollment profile has an unsupported writing script.",
      );
    }
    return enrollment;
  }

  private async requireReleasedLesson(
    userId: string,
    enrollment: EnrollmentContext,
    lessonId: string,
  ): Promise<ServerLessonBinding> {
    const lesson = LESSON_BY_ID.get(lessonId);
    if (
      !lesson
      || lesson.contentVersion !== CONTENT_VERSION
      || !isReleasedLessonState(lesson.releaseState)
    ) {
      throw new LessonSessionContentUnavailableError(
        "Lesson is not released in the current content package.",
      );
    }

    const prerequisiteVersions = lesson.prerequisiteIds.map((prerequisiteId) => {
      const prerequisite = LESSON_BY_ID.get(prerequisiteId);
      if (!prerequisite || prerequisite.contentVersion !== CONTENT_VERSION) {
        throw new LessonSessionContentUnavailableError(
          "Lesson prerequisite is missing from the current content package.",
        );
      }
      return {
        lessonId: prerequisite.id,
        lessonVersion: lessonVersion(prerequisite),
      };
    });

    for (const prerequisite of prerequisiteVersions) {
      const passed = await this.database.prepare(
        `SELECT id
         FROM lesson_sessions
         WHERE user_id = ?
           AND enrollment_id = ?
           AND content_version = ?
           AND lesson_id = ?
           AND lesson_version = ?
           AND status = 'submitted'
           AND passed = 1
         LIMIT 1`,
      ).bind(
        userId,
        enrollment.enrollmentId,
        CONTENT_VERSION,
        prerequisite.lessonId,
        prerequisite.lessonVersion,
      ).first<{ id: string }>();
      if (!passed) {
        throw new LessonSessionPrerequisiteUnavailableError(
          `Prerequisite ${prerequisite.lessonId} lacks a passed server-owned session.`,
        );
      }
    }

    const exercises = buildExercises(
      lesson,
      enrollment.script,
      this.randomSource,
    );
    const expectedEvidenceCount = exercises.length;
    if (!Number.isSafeInteger(expectedEvidenceCount) || expectedEvidenceCount < 1) {
      throw new LessonSessionContentUnavailableError(
        "Lesson has no valid server-owned evidence form.",
      );
    }
    const activities = exercises.map((exercise, position) => {
      const method = methodForExercise(exercise);
      const answer = getAuthoritativeLessonAnswer(lesson.id, exercise.id);
      if (
        !answer
        || answer.activityVersion !== exercise.activityVersion
        || answer.method !== method
        || answer.skill !== exercise.skill
        || answer.requiredForPass !== (exercise.requiredForPass === true)
      ) {
        throw new LessonSessionContentUnavailableError(
          `Activity ${lesson.id}:${exercise.id} is not bound to the server item bank.`,
        );
      }
      return {
        position,
        activityId: `${lesson.id}:${exercise.id}`,
        activityVersion: exercise.activityVersion,
        method,
        skill: exercise.skill,
        requiredForPass: exercise.requiredForPass === true,
      };
    });
    if (new Set(activities.map((activity) => activity.activityId)).size
      !== activities.length) {
      throw new LessonSessionContentUnavailableError(
        "Server-issued lesson form contains duplicate activities.",
      );
    }
    const form: LessonSessionFormV1 = {
      schemaVersion: LESSON_SESSION_FORM_SCHEMA_VERSION,
      script: enrollment.script,
      activities,
    };
    const formHash = await hashLessonSessionForm(form);
    return {
      lesson,
      lessonVersion: lessonVersion(lesson),
      expectedEvidenceCount,
      form,
      formHash,
      prerequisiteVersions,
    };
  }

  private async registerDevice(
    userId: string,
    command: OpenLessonSessionCommandV1,
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
    if (!device) throw new Error("Unable to register the lesson-session device.");
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
      LESSON_SESSION_IDEMPOTENCY_SCOPE,
      idempotencyKey,
    ).first<ExistingIdempotency>();
  }

  private resolveExisting(
    existing: ExistingIdempotency,
    requestHash: string,
  ): OpenLessonSessionReceiptV1 {
    if (existing.requestHash !== requestHash) {
      throw new LessonSessionIdempotencyConflictError(
        "Idempotency key was already used with another lesson-session payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new Error("A matching lesson session is not yet recoverable.");
    }
    return { ...parseStoredReceipt(existing.responseJson), duplicate: true };
  }
}
