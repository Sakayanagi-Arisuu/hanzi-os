import {
  ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
  ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION,
  hashAbandonAssessmentSessionCommand,
  type AbandonAssessmentSessionCommandV1,
  type AbandonAssessmentSessionReceiptV1,
} from "../assessment/assessmentAbandonmentProtocol";
import {
  ASSESSMENT_ATTEMPT_IDEMPOTENCY_SCOPE,
  ASSESSMENT_ATTEMPT_PROTOCOL_VERSION,
  hashRecordAssessmentAttemptCommand,
  type RecordAssessmentAttemptCommandV1,
  type RecordAssessmentAttemptReceiptV1,
} from "../assessment/assessmentAttemptProtocol";
import {
  ASSESSMENT_SESSION_IDEMPOTENCY_SCOPE,
  ASSESSMENT_SESSION_PROTOCOL_VERSION,
  canonicalAssessmentForm,
  hashAssessmentForm,
  hashOpenAssessmentSessionCommand,
  isExactAssessmentFormV1,
  type AssessmentFormHash,
  type AssessmentFormV1,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../assessment/assessmentSessionProtocol";
import {
  ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL,
  ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
  ASSESSMENT_SUBMISSION_PROTOCOL_VERSION,
  hashSubmitAssessmentSessionCommand,
  type AssessmentSkillResultV1,
  type SubmitAssessmentSessionCommandV1,
  type SubmitAssessmentSessionReceiptV1,
} from "../assessment/assessmentSubmissionProtocol";
import {
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import {
  CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS,
  FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT,
  assessmentAnswersMatch,
  assessmentPresentationForItem,
  authoritativeAssessmentItemByVersion,
  isIssuableAuthoritativeAssessmentItem,
  selectAuthoritativeAssessmentForm,
  type AssessmentRandomSource,
  type AuthoritativeAssessmentBlueprint,
  type AuthoritativeAssessmentItem,
} from "./authoritativeAssessmentItemBank";
import {
  scoreAssessmentObservations,
} from "./assessmentScoring";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import { ensureCurrentCourseVersion } from "./courseVersionRepository";
import type { D1Database, D1RunResult } from "./d1";
import {
  CURRENT_LEARNING_RESET_EPOCH_SQL,
  requireCurrentLearningResetEpoch,
} from "./learningResetEpoch";
import { encodeOutboxEventPayload } from "./outboxEventContract";

export class AssessmentIdempotencyConflictError extends Error {
  readonly code = "ASSESSMENT_IDEMPOTENCY_CONFLICT";
}

export class AssessmentDeviceSequenceConflictError extends Error {
  readonly code = "ASSESSMENT_DEVICE_SEQUENCE_CONFLICT";
}

export class AssessmentContentUnavailableError extends Error {
  readonly code = "ASSESSMENT_CONTENT_UNAVAILABLE";
}

export class AssessmentEnrollmentUnavailableError extends Error {
  readonly code = "ASSESSMENT_ENROLLMENT_UNAVAILABLE";
}

export class AssessmentFormUnavailableError extends Error {
  readonly code = "ASSESSMENT_FORM_UNAVAILABLE";
}

export class AssessmentSessionUnavailableError extends Error {
  readonly code = "ASSESSMENT_SESSION_UNAVAILABLE";
}

export class AssessmentAttemptConflictError extends Error {
  readonly code = "ASSESSMENT_ATTEMPT_CONFLICT";
}

export class AssessmentSubmissionIncompleteError extends Error {
  readonly code = "ASSESSMENT_SUBMISSION_INCOMPLETE";
}

export class AssessmentSessionTimedOutError extends Error {
  readonly code = "ASSESSMENT_SESSION_TIMED_OUT";
}

type AssessmentCommandDevice = {
  installationId: string;
  deviceId: string;
  deviceSequence: number;
};

type ExistingIdempotency = {
  requestHash: string;
  resetEpoch: number | null;
  status: string;
  responseJson: string | null;
};

type EnrollmentRow = {
  enrollmentId: string;
};

type AssessmentSessionRow = {
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
  formManifestHash: string;
  status: string;
  startedAt: number;
};

type AssessmentAttemptRow = {
  attemptId: string;
  position: number;
  itemId: string;
  itemVersion: string;
  skill: string;
  construct: string;
  modality: string;
  measurementEligible: number;
  responseJson: string;
  outcome: string;
  score: number;
};

export type AssessmentRepositoryOptions = {
  publicationPolicy?: ContentReleasePolicy;
  bank?: readonly AuthoritativeAssessmentItem[];
  blueprint?: AuthoritativeAssessmentBlueprint;
  randomSource?: AssessmentRandomSource;
  now?: () => number;
  sessionTimeLimitMs?: number;
  allowIncompleteSubmissionAfterTimeout?: boolean;
};

const secureRandom: AssessmentRandomSource = () => {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 0x1_0000_0000;
};

const ASSESSMENT_MAX_OCCURRED_AT_FUTURE_SKEW_MS = 5 * 60 * 1000;

const allChangedOnce = (results: Array<D1RunResult>) =>
  results.every((result) => result.success && result.meta?.changes === 1);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const storedReceipt = <T>(
  raw: string,
  protocolVersion: number,
  status: string,
): T => {
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value)
    || value.protocolVersion !== protocolVersion
    || value.status !== status
    || typeof value.idempotencyKey !== "string"
    || typeof value.sessionId !== "string"
  ) {
    throw new Error("Stored assessment receipt is invalid.");
  }
  return value as T;
};

const normalizedSelection = (answer: string, options: readonly string[]) =>
  options.find((option) => assessmentAnswersMatch(answer, option)) ?? null;

const assessmentChangeOperationId = {
  opened: (key: string) => `normalized:assessment-session-open:${key}`,
  attempted: (key: string) => `normalized:assessment-attempt:${key}`,
  submitted: (key: string) => `normalized:assessment-session-submit:${key}`,
  abandoned: (key: string) => `normalized:assessment-session-abandon:${key}`,
};

export class AssessmentRepository {
  private readonly publicationPolicy: ContentReleasePolicy;
  private readonly bank: readonly AuthoritativeAssessmentItem[];
  private readonly blueprint: AuthoritativeAssessmentBlueprint;
  private readonly randomSource: AssessmentRandomSource;
  private readonly now: () => number;
  private readonly sessionTimeLimitMs: number | null;
  private readonly allowIncompleteSubmissionAfterTimeout: boolean;

  constructor(
    private readonly database: D1Database,
    options: AssessmentRepositoryOptions = {},
  ) {
    this.publicationPolicy =
      options.publicationPolicy ?? CURRENT_CONTENT_RELEASE_POLICY;
    this.bank = options.bank ?? CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS;
    this.blueprint =
      options.blueprint ?? FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT;
    this.randomSource = options.randomSource ?? secureRandom;
    this.now = options.now ?? Date.now;
    this.sessionTimeLimitMs = options.sessionTimeLimitMs ?? null;
    if (
      this.sessionTimeLimitMs !== null
      && (
        !Number.isSafeInteger(this.sessionTimeLimitMs)
        || this.sessionTimeLimitMs < 60_000
        || this.sessionTimeLimitMs > 4 * 60 * 60 * 1000
      )
    ) throw new Error("Assessment session time limit is invalid.");
    this.allowIncompleteSubmissionAfterTimeout =
      options.allowIncompleteSubmissionAfterTimeout ?? false;
  }

  async openSession(
    userId: string,
    command: OpenAssessmentSessionCommandV1,
  ): Promise<OpenAssessmentSessionReceiptV1> {
    const requestHash = await hashOpenAssessmentSessionCommand(command);
    await requireCurrentLearningResetEpoch(this.database, userId, command.resetEpoch);
    const existing = await this.getIdempotency(
      userId,
      ASSESSMENT_SESSION_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        ASSESSMENT_SESSION_PROTOCOL_VERSION,
        "started",
      );
    }

    await this.requireReleasedContent();
    const enrollment = await this.requireCurrentEnrollment(
      userId,
      command.enrollmentId,
    );
    const exposed = await this.readExposureHistory(userId);
    const selection = selectAuthoritativeAssessmentForm({
      bank: this.bank,
      blueprint: this.blueprint,
      exposedGroups: exposed.exposureGroups,
      exposedEquivalentGroups: exposed.equivalentGroups,
      random: this.randomSource,
    });
    if (
      selection.kind !== "selected"
      || !isExactAssessmentFormV1(
        selection.form,
        this.blueprint.itemCount,
      )
    ) {
      throw new AssessmentFormUnavailableError(
        "The reviewed item bank cannot issue a complete unseen equivalent form.",
      );
    }
    const formHash = await hashAssessmentForm(selection.form);
    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      command.idempotencyKey,
    );

    const timestamp = this.now();
    const startedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const receipt: OpenAssessmentSessionReceiptV1 = {
      protocolVersion: ASSESSMENT_SESSION_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId,
      enrollmentId: enrollment.enrollmentId,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      blueprintId: this.blueprint.id,
      formVersion: this.blueprint.formVersion,
      scoringPolicyVersion: this.blueprint.scoringPolicyVersion,
      expectedItemCount: selection.form.items.length,
      form: selection.form,
      formHash,
      status: "started",
      startedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "assessment.started",
      aggregateId: sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId,
        enrollmentId: enrollment.enrollmentId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        blueprintId: this.blueprint.id,
        formVersion: this.blueprint.formVersion,
        scoringPolicyVersion: this.blueprint.scoringPolicyVersion,
        expectedItemCount: selection.form.items.length,
        formHash,
        startedAt,
      },
    });
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM enrollments enrollment
           INNER JOIN course_versions course ON course.id = enrollment.course_version_id
           WHERE enrollment.user_id = ? AND enrollment.id = ?
             AND enrollment.course_version_id = ? AND enrollment.status = 'active'
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
         ) AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        ASSESSMENT_SESSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        userId,
        enrollment.enrollmentId,
        CONTENT_VERSION,
        CURRENT_CONTENT_MANIFEST_SHA256,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO assessment_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, reset_epoch, content_version, blueprint_id, form_version, scoring_policy_version, expected_item_count, form_schema_version, form_manifest_json, form_manifest_hash, status, started_at, created_at)
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
        this.blueprint.id,
        this.blueprint.formVersion,
        this.blueprint.scoringPolicyVersion,
        selection.form.items.length,
        selection.form.schemaVersion,
        canonicalAssessmentForm(selection.form),
        formHash,
        timestamp,
        timestamp,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_SESSION_IDEMPOTENCY_SCOPE,
      ),
      ...selection.items.map((item) => this.database.prepare(
        `INSERT INTO assessment_item_exposures (id, user_id, session_id, reset_epoch, content_version, item_id, item_version, exposure_group_id, equivalent_group_id, form_family_id, exposed_at)
         SELECT ?, ?, id, reset_epoch, content_version, ?, ?, ?, ?, ?, ?
         FROM assessment_sessions
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'started'`,
      ).bind(
        crypto.randomUUID(),
        userId,
        item.id,
        item.itemVersion,
        item.exposureGroupId,
        item.equivalentGroupId,
        item.formFamilyId,
        timestamp,
        sessionId,
        userId,
        command.resetEpoch,
      )),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'assessment_session', id, 'assessment.started', 1, reset_epoch, ?, 'pending', 0, ?, ?
         FROM assessment_sessions
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'started'`,
      ).bind(
        crypto.randomUUID(),
        userId,
        eventPayload,
        timestamp,
        timestamp,
        sessionId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, reset_epoch, 'assessment_session', id, 1, ?, 'upsert', NULL, ?
         FROM assessment_sessions
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'started'`,
      ).bind(
        userId,
        assessmentChangeOperationId.opened(command.idempotencyKey),
        timestamp,
        sessionId,
        userId,
        command.resetEpoch,
      ),
    ];

    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new AssessmentSessionUnavailableError(
          "Assessment enrollment, reset epoch, or active-session state changed before commit.",
        );
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        ASSESSMENT_SESSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          ASSESSMENT_SESSION_PROTOCOL_VERSION,
          "started",
        );
      }
      if (await this.hasSequenceOwner(userId, deviceRecordId, command.deviceSequence)) {
        throw new AssessmentDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (
        error instanceof AssessmentContentUnavailableError
        || error instanceof AssessmentEnrollmentUnavailableError
        || error instanceof AssessmentFormUnavailableError
        || error instanceof AssessmentSessionUnavailableError
      ) throw error;
      throw new AssessmentSessionUnavailableError(
        "Assessment form exposure or active-session state changed before commit.",
      );
    }
  }

  async recordAttempt(
    userId: string,
    command: RecordAssessmentAttemptCommandV1,
  ): Promise<RecordAssessmentAttemptReceiptV1> {
    const requestHash = await hashRecordAssessmentAttemptCommand(command);
    await requireCurrentLearningResetEpoch(this.database, userId, command.resetEpoch);
    const existing = await this.getIdempotency(
      userId,
      ASSESSMENT_ATTEMPT_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        ASSESSMENT_ATTEMPT_PROTOCOL_VERSION,
        "recorded",
      );
    }
    await this.requireReleasedContent();
    const session = await this.requireStartedSession(userId, command);
    if (this.hasSessionTimedOut(session)) {
      throw new AssessmentSessionTimedOutError(
        "Assessment time limit has elapsed; submit the recorded responses.",
      );
    }
    const form = await this.validateStoredForm(session);
    const formItem = form.items.find((item) => item.itemId === command.itemId);
    if (
      !formItem
      || formItem.itemVersion !== command.itemVersion
      || session.formManifestHash !== command.formHash
    ) {
      throw new AssessmentSessionUnavailableError(
        "Assessment item is not part of the immutable server-issued form.",
      );
    }
    const bankItem = this.requireBankBinding(formItem.itemVersion, formItem);
    const selectedAnswer = normalizedSelection(
      command.response.answer,
      bankItem.options,
    );
    if (!selectedAnswer) {
      throw new AssessmentSessionUnavailableError(
        "Assessment selection is not one of the server-issued options.",
      );
    }
    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      command.idempotencyKey,
    );
    const timestamp = this.now();
    const occurredAt = Date.parse(command.occurredAt);
    if (!Number.isFinite(occurredAt) || occurredAt < session.startedAt) {
      throw new AssessmentSessionUnavailableError(
        "Assessment attempt predates its server-issued session.",
      );
    }
    if (occurredAt > timestamp + ASSESSMENT_MAX_OCCURRED_AT_FUTURE_SKEW_MS) {
      throw new AssessmentSessionUnavailableError(
        "Assessment attempt timestamp is too far ahead of server time.",
      );
    }
    const receivedAt = timestamp;
    const correct = assessmentAnswersMatch(
      selectedAnswer,
      bankItem.correctAnswer,
    );
    const idempotencyRecordId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const receipt: RecordAssessmentAttemptReceiptV1 = {
      protocolVersion: ASSESSMENT_ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      attemptId,
      sessionId: session.sessionId,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      formHash: command.formHash,
      position: formItem.position,
      itemId: formItem.itemId,
      itemVersion: formItem.itemVersion,
      skill: formItem.skill,
      measurementEligible: bankItem.measurementEligible,
      masteryEligible: false,
      status: "recorded",
      recordedAt: new Date(timestamp).toISOString(),
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "assessment.attempt.recorded",
      aggregateId: attemptId,
      resetEpoch: command.resetEpoch,
      payload: {
        attemptId,
        sessionId: session.sessionId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        formHash: command.formHash,
        position: formItem.position,
        itemId: formItem.itemId,
        itemVersion: formItem.itemVersion,
        skill: formItem.skill,
        measurementEligible: bankItem.measurementEligible,
        masteryEligible: false,
        recordedAt: receipt.recordedAt,
      },
    });
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM assessment_sessions session
           INNER JOIN enrollments enrollment ON enrollment.user_id = session.user_id AND enrollment.id = session.enrollment_id
           INNER JOIN course_versions course ON course.id = enrollment.course_version_id
           WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ?
             AND session.content_version = ? AND session.form_manifest_hash = ?
             AND session.status = 'started' AND enrollment.status = 'active'
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        ASSESSMENT_ATTEMPT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        CONTENT_VERSION,
        command.formHash,
        CURRENT_CONTENT_MANIFEST_SHA256,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO assessment_attempts (id, user_id, session_id, device_id, device_sequence, idempotency_record_id, schema_version, reset_epoch, content_version, position, item_id, item_version, skill, construct, modality, measurement_eligible, response_json, outcome, score, duration_ms, occurred_at, received_at)
         SELECT ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         FROM idempotency_records receipt
         WHERE receipt.id = ? AND receipt.user_id = ? AND receipt.reset_epoch = ? AND receipt.scope = ?
           AND EXISTS (SELECT 1 FROM assessment_sessions session WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ? AND session.status = 'started' AND session.form_manifest_hash = ?)`,
      ).bind(
        attemptId,
        userId,
        session.sessionId,
        deviceRecordId,
        command.deviceSequence,
        idempotencyRecordId,
        command.resetEpoch,
        CONTENT_VERSION,
        formItem.position,
        formItem.itemId,
        formItem.itemVersion,
        formItem.skill,
        formItem.construct,
        formItem.modality,
        bankItem.measurementEligible ? 1 : 0,
        JSON.stringify({
          kind: "selection",
          answer: selectedAnswer,
          ...(command.response.durationMs === undefined
            ? {}
            : { durationMs: command.response.durationMs }),
        }),
        correct ? "correct" : "incorrect",
        correct ? 100 : 0,
        command.response.durationMs ?? null,
        occurredAt,
        receivedAt,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_ATTEMPT_IDEMPOTENCY_SCOPE,
        session.sessionId,
        userId,
        command.resetEpoch,
        command.formHash,
      ),
      this.database.prepare(
        "UPDATE enrollments SET last_activity_at = ?, revision = revision + 1 WHERE user_id = ? AND id = ? AND EXISTS (SELECT 1 FROM assessment_attempts WHERE id = ? AND user_id = ? AND reset_epoch = ?)",
      ).bind(
        timestamp,
        userId,
        session.enrollmentId,
        attemptId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'assessment_attempt', id, 'assessment.attempt.recorded', 1, reset_epoch, ?, 'pending', 0, ?, ?
         FROM assessment_attempts WHERE id = ? AND user_id = ? AND reset_epoch = ?`,
      ).bind(
        crypto.randomUUID(),
        userId,
        eventPayload,
        timestamp,
        timestamp,
        attemptId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, reset_epoch, 'assessment_attempt', id, 1, ?, 'upsert', NULL, ?
         FROM assessment_attempts WHERE id = ? AND user_id = ? AND reset_epoch = ?`,
      ).bind(
        userId,
        assessmentChangeOperationId.attempted(command.idempotencyKey),
        timestamp,
        attemptId,
        userId,
        command.resetEpoch,
      ),
    ];
    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new AssessmentSessionUnavailableError(
          "Assessment session changed before the attempt committed.",
        );
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        ASSESSMENT_ATTEMPT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          ASSESSMENT_ATTEMPT_PROTOCOL_VERSION,
          "recorded",
        );
      }
      if (await this.hasSequenceOwner(userId, deviceRecordId, command.deviceSequence)) {
        throw new AssessmentDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      const attempted = await this.database.prepare(
        "SELECT id FROM assessment_attempts WHERE user_id = ? AND session_id = ? AND item_version = ? LIMIT 1",
      ).bind(userId, command.sessionId, command.itemVersion).first<{ id: string }>();
      if (attempted) {
        throw new AssessmentAttemptConflictError(
          "The assessment item already has an immutable first response.",
        );
      }
      if (error instanceof AssessmentSessionUnavailableError) throw error;
      throw new AssessmentSessionUnavailableError(
        "Assessment session, form, release, or reset epoch changed before commit.",
      );
    }
  }

  async submitSession(
    userId: string,
    command: SubmitAssessmentSessionCommandV1,
  ): Promise<SubmitAssessmentSessionReceiptV1> {
    const requestHash = await hashSubmitAssessmentSessionCommand(command);
    await requireCurrentLearningResetEpoch(this.database, userId, command.resetEpoch);
    const existing = await this.getIdempotency(
      userId,
      ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        ASSESSMENT_SUBMISSION_PROTOCOL_VERSION,
        "submitted",
      );
    }
    await this.requireReleasedContent();
    const session = await this.requireStartedSession(userId, command);
    const form = await this.validateStoredForm(session);
    if (session.formManifestHash !== command.formHash) {
      throw new AssessmentSessionUnavailableError(
        "Assessment submission does not match the immutable form hash.",
      );
    }
    const attempts = await this.readSessionAttempts(userId, session);
    const timedOut = this.hasSessionTimedOut(session);
    const allowIncomplete = timedOut
      && this.allowIncompleteSubmissionAfterTimeout;
    if (attempts.length !== form.items.length && !allowIncomplete) {
      throw new AssessmentSubmissionIncompleteError(
        "Every issued assessment item requires one immutable response.",
      );
    }
    const attemptsByPosition = new Map(
      attempts.map((attempt) => [attempt.position, attempt]),
    );
    const observations: Array<{
      skill: AssessmentFormV1["items"][number]["skill"];
      correct: boolean;
      measurementEligible: boolean;
    }> = [];
    for (const formItem of form.items) {
      const attempt = attemptsByPosition.get(formItem.position);
      const bankItem = this.requireBankBinding(formItem.itemVersion, formItem);
      if (!attempt && allowIncomplete) continue;
      if (
        !attempt
        || attempt.itemId !== formItem.itemId
        || attempt.itemVersion !== formItem.itemVersion
        || attempt.skill !== formItem.skill
        || attempt.construct !== formItem.construct
        || attempt.modality !== formItem.modality
        || Boolean(attempt.measurementEligible) !== bankItem.measurementEligible
      ) {
        throw new AssessmentSessionUnavailableError(
          "Stored assessment attempt does not match the frozen form binding.",
        );
      }
      let selectedAnswer: unknown;
      try {
        const response: unknown = JSON.parse(attempt.responseJson);
        selectedAnswer = isRecord(response) ? response.answer : undefined;
      } catch {
        selectedAnswer = undefined;
      }
      if (typeof selectedAnswer !== "string") {
        throw new AssessmentSessionUnavailableError(
          "Stored assessment response cannot be re-scored.",
        );
      }
      const correct = assessmentAnswersMatch(
        selectedAnswer,
        bankItem.correctAnswer,
      );
      if (
        attempt.outcome !== (correct ? "correct" : "incorrect")
        || attempt.score !== (correct ? 100 : 0)
      ) {
        throw new AssessmentSessionUnavailableError(
          "Stored assessment score conflicts with the server answer key.",
        );
      }
      observations.push({
        skill: formItem.skill,
        correct,
        measurementEligible: bankItem.measurementEligible,
      });
    }
    const scored = scoreAssessmentObservations(observations);
    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      command.idempotencyKey,
    );
    const timestamp = Math.max(this.now(), session.startedAt);
    const submittedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const receipt: SubmitAssessmentSessionReceiptV1 = {
      protocolVersion: ASSESSMENT_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      blueprintId: session.blueprintId,
      formVersion: session.formVersion,
      scoringPolicyVersion: session.scoringPolicyVersion,
      formHash: command.formHash,
      status: "submitted",
      calibrationStatus: "uncalibrated",
      confidenceLevel: ASSESSMENT_OBSERVED_CONFIDENCE_LEVEL,
      masteryEligible: false,
      overall: scored.overall,
      skills: scored.skills,
      submittedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "assessment.submitted",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId: session.sessionId,
        enrollmentId: session.enrollmentId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        blueprintId: session.blueprintId,
        formVersion: session.formVersion,
        scoringPolicyVersion: session.scoringPolicyVersion,
        formHash: command.formHash,
        status: "submitted",
        calibrationStatus: "uncalibrated",
        masteryEligible: false,
        submittedAt,
      },
    });
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM assessment_sessions session
           INNER JOIN enrollments enrollment ON enrollment.user_id = session.user_id AND enrollment.id = session.enrollment_id
           INNER JOIN course_versions course ON course.id = enrollment.course_version_id
           WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ?
             AND session.content_version = ? AND session.form_manifest_hash = ?
             AND session.status = 'started' AND enrollment.status = 'active'
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
             AND (
               (SELECT COUNT(*) FROM assessment_attempts attempt WHERE attempt.user_id = session.user_id AND attempt.session_id = session.id AND attempt.reset_epoch = session.reset_epoch) = session.expected_item_count
               OR (? = 1 AND ? >= session.started_at + ?)
             )
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        CONTENT_VERSION,
        command.formHash,
        CURRENT_CONTENT_MANIFEST_SHA256,
        this.allowIncompleteSubmissionAfterTimeout ? 1 : 0,
        timestamp,
        this.sessionTimeLimitMs ?? 0,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `UPDATE assessment_sessions
         SET status = 'submitted', measurement_evidence_count = ?, measurement_correct_count = ?, observed_accuracy = ?, confidence_lower = ?, confidence_upper = ?, terminal_at = ?
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'started'
           AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
      ).bind(
        scored.overall.n,
        scored.overall.correct,
        scored.overall.observedAccuracy,
        scored.overall.confidence95?.lower ?? null,
        scored.overall.confidence95?.upper ?? null,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
      ...scored.skills.map((result) => this.skillResultInsert(
        userId,
        session,
        result,
        idempotencyRecordId,
        timestamp,
      )),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'assessment_session', session.id, 'assessment.submitted', 1, session.reset_epoch, ?, 'pending', 0, ?, ?
         FROM assessment_sessions session
         WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ? AND session.status = 'submitted'
           AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
      ).bind(
        crypto.randomUUID(),
        userId,
        eventPayload,
        timestamp,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, session.reset_epoch, 'assessment_session', session.id, 2, ?, 'upsert', NULL, ?
         FROM assessment_sessions session
         WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ? AND session.status = 'submitted'
           AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
      ).bind(
        userId,
        assessmentChangeOperationId.submitted(command.idempotencyKey),
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
    ];
    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new AssessmentSessionUnavailableError(
          "Assessment terminal state changed before submission committed.",
        );
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          ASSESSMENT_SUBMISSION_PROTOCOL_VERSION,
          "submitted",
        );
      }
      if (await this.hasSequenceOwner(userId, deviceRecordId, command.deviceSequence)) {
        throw new AssessmentDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (
        error instanceof AssessmentSubmissionIncompleteError
        || error instanceof AssessmentSessionUnavailableError
      ) throw error;
      throw new AssessmentSessionUnavailableError(
        "Assessment session, release, form, or reset epoch changed before submission.",
      );
    }
  }

  async abandonSession(
    userId: string,
    command: AbandonAssessmentSessionCommandV1,
  ): Promise<AbandonAssessmentSessionReceiptV1> {
    const requestHash = await hashAbandonAssessmentSessionCommand(command);
    await requireCurrentLearningResetEpoch(this.database, userId, command.resetEpoch);
    const existing = await this.getIdempotency(
      userId,
      ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION,
        "abandoned",
      );
    }
    const session = await this.requireStartedSession(userId, command);
    if (session.formManifestHash !== command.formHash) {
      throw new AssessmentSessionUnavailableError(
        "Assessment abandonment does not match the immutable form hash.",
      );
    }
    await this.validateStoredFormHashIntegrity(session);
    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      command.idempotencyKey,
    );
    const timestamp = Math.max(this.now(), session.startedAt);
    const abandonedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const receipt: AbandonAssessmentSessionReceiptV1 = {
      protocolVersion: ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      resetEpoch: command.resetEpoch,
      contentVersion: session.contentVersion,
      blueprintId: session.blueprintId,
      formVersion: session.formVersion,
      formHash: command.formHash,
      status: "abandoned",
      masteryEligible: false,
      abandonedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "assessment.abandoned",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId: session.sessionId,
        enrollmentId: session.enrollmentId,
        resetEpoch: command.resetEpoch,
        contentVersion: session.contentVersion,
        blueprintId: session.blueprintId,
        formVersion: session.formVersion,
        formHash: command.formHash,
        status: "abandoned",
        masteryEligible: false,
        abandonedAt,
      },
    });
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM assessment_sessions WHERE id = ? AND user_id = ? AND reset_epoch = ? AND content_version = ? AND form_manifest_hash = ? AND status = 'started')
           AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        session.contentVersion,
        command.formHash,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `UPDATE assessment_sessions
         SET status = 'abandoned',
             terminal_at = ?,
             terminal_reason = 'user-abandoned'
         WHERE id = ? AND user_id = ? AND reset_epoch = ? AND status = 'started'
           AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
      ).bind(
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'assessment_session', session.id, 'assessment.abandoned', 1, session.reset_epoch, ?, 'pending', 0, ?, ?
         FROM assessment_sessions session
         WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ? AND session.status = 'abandoned'
           AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
      ).bind(
        crypto.randomUUID(),
        userId,
        eventPayload,
        timestamp,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, session.reset_epoch, 'assessment_session', session.id, 2, ?, 'upsert', NULL, ?
         FROM assessment_sessions session
         WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ? AND session.status = 'abandoned'
           AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
      ).bind(
        userId,
        assessmentChangeOperationId.abandoned(command.idempotencyKey),
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
    ];
    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new AssessmentSessionUnavailableError(
          "Assessment terminal state changed before abandonment committed.",
        );
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        ASSESSMENT_ABANDONMENT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          ASSESSMENT_ABANDONMENT_PROTOCOL_VERSION,
          "abandoned",
        );
      }
      if (await this.hasSequenceOwner(userId, deviceRecordId, command.deviceSequence)) {
        throw new AssessmentDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      if (error instanceof AssessmentSessionUnavailableError) throw error;
      throw new AssessmentSessionUnavailableError(
        "Assessment session, form, or reset epoch changed before abandonment.",
      );
    }
  }

  private async requireReleasedContent() {
    if (!isPromotedContentReleasePolicy(this.publicationPolicy)) {
      throw new AssessmentContentUnavailableError(
        "The immutable current content package has not passed explicit promotion gates.",
      );
    }
    await ensureCurrentCourseVersion(this.database, this.publicationPolicy);
  }

  private hasSessionTimedOut(session: AssessmentSessionRow) {
    return this.sessionTimeLimitMs !== null
      && this.now() >= session.startedAt + this.sessionTimeLimitMs;
  }

  private async requireCurrentEnrollment(userId: string, enrollmentId: string) {
    const enrollment = await this.database.prepare(
      `SELECT enrollment.id AS enrollmentId
       FROM enrollments enrollment
       INNER JOIN course_versions course ON course.id = enrollment.course_version_id
       WHERE enrollment.user_id = ? AND enrollment.id = ?
         AND enrollment.course_version_id = ? AND enrollment.status = 'active'
         AND course.manifest_hash = ?
         AND course.release_state IN ('beta', 'published')
         AND course.linguistic_review_status = 'approved'
       LIMIT 1`,
    ).bind(
      userId,
      enrollmentId,
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
    ).first<EnrollmentRow>();
    if (!enrollment) {
      throw new AssessmentEnrollmentUnavailableError(
        "An active enrollment in the exact approved content package is required.",
      );
    }
    return enrollment;
  }

  private async readExposureHistory(userId: string) {
    const rows = await this.database.prepare(
      "SELECT exposure_group_id AS exposureGroupId, equivalent_group_id AS equivalentGroupId FROM assessment_item_exposures WHERE user_id = ? AND form_family_id = ?",
    ).bind(userId, this.blueprint.formFamilyId).all<{
      exposureGroupId: string;
      equivalentGroupId: string;
    }>();
    if (!rows.success) throw new Error("Unable to read assessment exposure history.");
    return {
      exposureGroups: new Set(
        (rows.results ?? []).map((row) => row.exposureGroupId),
      ),
      equivalentGroups: new Set(
        (rows.results ?? []).map((row) => row.equivalentGroupId),
      ),
    };
  }

  private async requireStartedSession(
    userId: string,
    command: {
      sessionId: string;
      resetEpoch: number;
      contentVersion: string;
      formHash: AssessmentFormHash;
    },
  ) {
    const session = await this.database.prepare(
      `SELECT id AS sessionId, enrollment_id AS enrollmentId, reset_epoch AS resetEpoch,
              content_version AS contentVersion, blueprint_id AS blueprintId,
              form_version AS formVersion, scoring_policy_version AS scoringPolicyVersion,
              expected_item_count AS expectedItemCount, form_schema_version AS formSchemaVersion,
              form_manifest_json AS formManifestJson, form_manifest_hash AS formManifestHash,
              status, started_at AS startedAt
       FROM assessment_sessions
       WHERE id = ? AND user_id = ? AND reset_epoch = ? AND content_version = ?
         AND form_manifest_hash = ? AND status = 'started'
       LIMIT 1`,
    ).bind(
      command.sessionId,
      userId,
      command.resetEpoch,
      command.contentVersion,
      command.formHash,
    ).first<AssessmentSessionRow>();
    if (!session) {
      throw new AssessmentSessionUnavailableError(
        "Assessment session does not belong to this learner, reset epoch, and form.",
      );
    }
    return session;
  }

  private async validateStoredFormHashIntegrity(session: AssessmentSessionRow) {
    let storedForm: unknown;
    try {
      storedForm = JSON.parse(session.formManifestJson) as unknown;
    } catch {
      throw new AssessmentSessionUnavailableError(
        "Stored assessment form is not valid JSON.",
      );
    }
    const computedHash =
      `sha256:${await sha256Hex(canonicalStringify(storedForm))}`;
    if (computedHash !== session.formManifestHash) {
      throw new AssessmentSessionUnavailableError(
        "Stored assessment form hash is invalid.",
      );
    }
  }

  private async validateStoredForm(session: AssessmentSessionRow) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(session.formManifestJson) as unknown;
    } catch {
      throw new AssessmentSessionUnavailableError(
        "Stored assessment form is not valid JSON.",
      );
    }
    if (
      !isExactAssessmentFormV1(parsed, session.expectedItemCount)
      || parsed.items.length !== this.blueprint.itemCount
      || parsed.blueprintId !== this.blueprint.id
      || parsed.formVersion !== this.blueprint.formVersion
      || parsed.scoringPolicyVersion !== this.blueprint.scoringPolicyVersion
      || session.formSchemaVersion !== parsed.schemaVersion
      || session.blueprintId !== parsed.blueprintId
      || session.formVersion !== parsed.formVersion
      || session.scoringPolicyVersion !== parsed.scoringPolicyVersion
    ) {
      throw new AssessmentSessionUnavailableError(
        "Stored assessment form metadata is inconsistent.",
      );
    }
    const form: AssessmentFormV1 = parsed;
    const computedHash = await hashAssessmentForm(form);
    if (computedHash !== session.formManifestHash) {
      throw new AssessmentSessionUnavailableError(
        "Stored assessment form hash is invalid.",
      );
    }
    for (const formItem of form.items) {
      this.requireBankBinding(formItem.itemVersion, formItem);
    }
    return form;
  }

  private requireBankBinding(
    itemVersion: string,
    formItem: AssessmentFormV1["items"][number],
  ) {
    const item = authoritativeAssessmentItemByVersion(this.bank).get(itemVersion);
    if (
      !item
      || !isIssuableAuthoritativeAssessmentItem(item, this.blueprint)
      || canonicalStringify(assessmentPresentationForItem(item, formItem.position))
        !== canonicalStringify(formItem)
    ) {
      throw new AssessmentContentUnavailableError(
        "Assessment item is no longer bound to the exact approved server bank.",
      );
    }
    return item;
  }

  private async readSessionAttempts(
    userId: string,
    session: AssessmentSessionRow,
  ) {
    const rows = await this.database.prepare(
      `SELECT id AS attemptId, position, item_id AS itemId, item_version AS itemVersion,
              skill, construct, modality, measurement_eligible AS measurementEligible,
              response_json AS responseJson, outcome, score
       FROM assessment_attempts
       WHERE user_id = ? AND session_id = ? AND reset_epoch = ?
       ORDER BY position`,
    ).bind(userId, session.sessionId, session.resetEpoch).all<AssessmentAttemptRow>();
    if (!rows.success) throw new Error("Unable to read assessment attempts.");
    return rows.results ?? [];
  }

  private skillResultInsert(
    userId: string,
    session: AssessmentSessionRow,
    result: AssessmentSkillResultV1,
    idempotencyRecordId: string,
    timestamp: number,
  ) {
    return this.database.prepare(
      `INSERT INTO assessment_skill_results (id, user_id, session_id, reset_epoch, content_version, skill, status, correct_count, evidence_count, observed_accuracy, confidence_lower, confidence_upper, mastery_eligible, scoring_policy_version, created_at)
       SELECT ?, ?, session.id, session.reset_epoch, session.content_version, ?, ?, ?, ?, ?, ?, ?, 0, session.scoring_policy_version, ?
       FROM assessment_sessions session
       WHERE session.id = ? AND session.user_id = ? AND session.reset_epoch = ? AND session.status = 'submitted'
         AND EXISTS (SELECT 1 FROM idempotency_records WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?)`,
    ).bind(
      crypto.randomUUID(),
      userId,
      result.skill,
      result.status,
      result.correct,
      result.n,
      result.observedAccuracy,
      result.confidence95?.lower ?? null,
      result.confidence95?.upper ?? null,
      timestamp,
      session.sessionId,
      userId,
      session.resetEpoch,
      idempotencyRecordId,
      userId,
      session.resetEpoch,
      ASSESSMENT_SUBMISSION_IDEMPOTENCY_SCOPE,
    );
  }

  private async registerDevice(userId: string, command: AssessmentCommandDevice) {
    const timestamp = this.now();
    const candidateId = crypto.randomUUID();
    await this.database.prepare(
      "INSERT INTO devices (id, user_id, installation_id, label, last_acked_cursor, created_at, last_seen_at) VALUES (?, ?, ?, ?, 0, ?, ?) ON CONFLICT(user_id, installation_id) DO UPDATE SET label = excluded.label, last_seen_at = excluded.last_seen_at, revoked_at = NULL",
    ).bind(
      candidateId,
      userId,
      command.installationId,
      command.deviceId,
      timestamp,
      timestamp,
    ).run();
    const device = await this.database.prepare(
      "SELECT id FROM devices WHERE user_id = ? AND installation_id = ? LIMIT 1",
    ).bind(userId, command.installationId).first<{ id: string }>();
    if (!device) throw new Error("Unable to register the assessment device.");
    return device.id;
  }

  private async requireSequenceAvailable(
    userId: string,
    deviceRecordId: string,
    deviceSequence: number,
    idempotencyKey: string,
  ) {
    const owner = await this.database.prepare(
      "SELECT idempotency_key AS idempotencyKey FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
    ).bind(userId, deviceRecordId, deviceSequence).first<{ idempotencyKey: string }>();
    if (owner && owner.idempotencyKey !== idempotencyKey) {
      throw new AssessmentDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }
  }

  private async hasSequenceOwner(
    userId: string,
    deviceRecordId: string,
    deviceSequence: number,
  ) {
    return Boolean(await this.database.prepare(
      "SELECT id FROM idempotency_records WHERE user_id = ? AND device_id = ? AND device_sequence = ? LIMIT 1",
    ).bind(userId, deviceRecordId, deviceSequence).first<{ id: string }>());
  }

  private async getIdempotency(
    userId: string,
    scope: string,
    idempotencyKey: string,
  ): Promise<ExistingIdempotency | null> {
    return this.database.prepare(
      "SELECT request_hash AS requestHash, reset_epoch AS resetEpoch, status, response_json AS responseJson FROM idempotency_records WHERE user_id = ? AND scope = ? AND idempotency_key = ? LIMIT 1",
    ).bind(userId, scope, idempotencyKey).first<ExistingIdempotency>();
  }

  private resolveExisting<T>(
    existing: ExistingIdempotency,
    requestHash: string,
    protocolVersion: number,
    status: string,
  ): T {
    if (existing.requestHash !== requestHash) {
      throw new AssessmentIdempotencyConflictError(
        "Idempotency key was already used with another assessment payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new Error("A matching assessment command is not recoverable yet.");
    }
    return {
      ...storedReceipt<T>(existing.responseJson, protocolVersion, status),
      duplicate: true,
    };
  }
}
