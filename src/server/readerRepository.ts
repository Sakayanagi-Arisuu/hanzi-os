import {
  READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
  READER_ABANDONMENT_PROTOCOL_VERSION,
  hashAbandonReaderSessionCommand,
  parseAbandonReaderSessionReceipt,
  type AbandonReaderSessionCommandV1,
  type AbandonReaderSessionReceiptV1,
} from "../reader/readerAbandonmentProtocol";
import {
  READER_ATTEMPT_IDEMPOTENCY_SCOPE,
  READER_ATTEMPT_PROTOCOL_VERSION,
  hashRecordReaderAttemptCommand,
  parseRecordReaderAttemptReceipt,
  type RecordReaderAttemptCommandV1,
  type RecordReaderAttemptReceiptV1,
} from "../reader/readerAttemptProtocol";
import {
  READER_METHOD,
  READER_SESSION_IDEMPOTENCY_SCOPE,
  READER_SESSION_PROTOCOL_VERSION,
  READER_SKILL,
  canonicalReaderSessionForm,
  hashOpenReaderSessionCommand,
  hashReaderSessionForm,
  parseOpenReaderSessionReceipt,
  type OpenReaderSessionCommandV1,
  type OpenReaderSessionReceiptV1,
  type ReaderSessionFormHash,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import {
  READER_SUBMISSION_IDEMPOTENCY_SCOPE,
  READER_SUBMISSION_PROTOCOL_VERSION,
  hashSubmitReaderSessionCommand,
  parseSubmitReaderSessionReceipt,
  type ReaderSubmissionItemResultV1,
  type SubmitReaderSessionCommandV1,
  type SubmitReaderSessionReceiptV1,
} from "../reader/readerSubmissionProtocol";
import {
  readerPolicyAllowsMastery,
  type ReaderScript,
  type ReaderSupportMode,
} from "../reader/protocolSupport";
import {
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify } from "../sync/document";
import {
  CURRENT_AUTHORITATIVE_READER_STORIES,
  authoritativeReaderItemByVersion,
  isIssuableAuthoritativeReaderStory,
  readerAnswersMatch,
  readerPresentationForItem,
  selectAuthoritativeReaderForm,
  type AuthoritativeReaderItem,
  type AuthoritativeReaderStory,
} from "./authoritativeReaderItemBank";
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
import {
  NORMALIZED_LEARNING_CHANGE_ENTITY,
  normalizedLearningChangeOperationId,
} from "./normalizedLearningChange";
import { encodeOutboxEventPayload } from "./outboxEventContract";

export class ReaderIdempotencyConflictError extends Error {
  readonly code = "READER_IDEMPOTENCY_CONFLICT";
}

export class ReaderDeviceSequenceConflictError extends Error {
  readonly code = "READER_DEVICE_SEQUENCE_CONFLICT";
}

export class ReaderContentUnavailableError extends Error {
  readonly code = "READER_CONTENT_UNAVAILABLE";
}

export class ReaderEnrollmentUnavailableError extends Error {
  readonly code = "READER_ENROLLMENT_UNAVAILABLE";
}

export class ReaderFormUnavailableError extends Error {
  readonly code = "READER_FORM_UNAVAILABLE";
}

export class ReaderSessionUnavailableError extends Error {
  readonly code = "READER_SESSION_UNAVAILABLE";
}

export class ReaderAttemptConflictError extends Error {
  readonly code = "READER_ATTEMPT_CONFLICT";
}

export class ReaderSubmissionIncompleteError extends Error {
  readonly code = "READER_SUBMISSION_INCOMPLETE";
}

type ReaderCommandDevice = {
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
  script: string;
};

type ReaderSessionRow = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  storyId: string;
  storyVersion: string;
  formVersion: string;
  formSchemaVersion: number;
  formManifestJson: string;
  formManifestHash: ReaderSessionFormHash;
  script: string;
  supportMode: string;
  supportPolicyVersion: string;
  expectedItemCount: number;
  status: string;
  startedAt: number;
};

type ReaderStoredAttemptRow = {
  attemptId: string;
  evidenceId: string;
  lessonSessionId: string | null;
  evidenceLessonSessionId: string | null;
  position: number;
  itemId: string;
  itemVersion: string;
  formManifestHash: string;
  activityId: string;
  activityVersion: string;
  source: string;
  method: string;
  skill: string;
  responseJson: string;
  outcome: string;
  score: number | null;
  usedHint: number;
  priorExposure: number;
  requiredForPass: number;
  scoringVersion: string;
  evidencePolicyVersion: string;
  evidenceActivityId: string;
  evidenceActivityVersion: string;
  evidenceSource: string;
  evidenceMethod: string;
  evidenceSkill: string;
  evidenceOutcome: string;
  evidenceScore: number | null;
  evidenceVerified: number;
  evidenceMasteryEligible: number;
  evidenceMetadataJson: string;
};

type ReaderExposureRow = {
  exposureGroupId: string;
  equivalentGroupId: string;
};

type ReceiptParseResult<T> =
  | { ok: true; receipt: T }
  | { ok: false; reason: string };

export type ReaderRepositoryOptions = {
  publicationPolicy?: ContentReleasePolicy;
  bank?: readonly AuthoritativeReaderStory[];
  now?: () => number;
};

export const READER_OBJECTIVE_SCORING_VERSION =
  "reader-objective-scoring-v1";
const READER_MAX_OCCURRED_AT_FUTURE_SKEW_MS = 5 * 60 * 1000;

const allChangedOnce = (results: Array<D1RunResult>) =>
  results.every((result) => result.success && result.meta?.changes === 1);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readerEvidencePolicyVersion = (supportPolicyVersion: string) =>
  `${supportPolicyVersion}:${READER_OBJECTIVE_SCORING_VERSION}`;

const evidenceMetadata = (
  session: ReaderSessionRow,
  item: ReaderSessionFormV1["items"][number],
) => ({
  readerSessionId: session.sessionId,
  storyId: session.storyId,
  storyVersion: session.storyVersion,
  formVersion: session.formVersion,
  formHash: session.formManifestHash,
  position: item.position,
  script: session.script,
  supportMode: session.supportMode,
  supportPolicyVersion: session.supportPolicyVersion,
  answerExposure: item.answerExposure,
  priorExposure: item.priorExposure,
});

export class ReaderRepository {
  private readonly publicationPolicy: ContentReleasePolicy;
  private readonly bank: readonly AuthoritativeReaderStory[];
  private readonly now: () => number;

  constructor(
    private readonly database: D1Database,
    options: ReaderRepositoryOptions = {},
  ) {
    this.publicationPolicy =
      options.publicationPolicy ?? CURRENT_CONTENT_RELEASE_POLICY;
    this.bank = options.bank ?? CURRENT_AUTHORITATIVE_READER_STORIES;
    this.now = options.now ?? Date.now;
  }

  async openSession(
    userId: string,
    command: OpenReaderSessionCommandV1,
  ): Promise<OpenReaderSessionReceiptV1> {
    const requestHash = await hashOpenReaderSessionCommand(command);
    await requireCurrentLearningResetEpoch(
      this.database,
      userId,
      command.resetEpoch,
    );
    const existing = await this.getIdempotency(
      userId,
      READER_SESSION_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        parseOpenReaderSessionReceipt,
      );
    }

    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      READER_SESSION_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    this.requireCurrentCommandContent(command.contentVersion);
    await this.requireReleasedContent();
    const enrollment = await this.requireCurrentEnrollment(
      userId,
      command.enrollmentId,
      command.script,
    );
    const exposureHistory = await this.readExposureHistory(userId);
    const selection = selectAuthoritativeReaderForm({
      bank: this.bank,
      storyId: command.storyId,
      script: command.script,
      supportMode: command.supportMode,
      exposedGroups: exposureHistory.exposureGroups,
      exposedEquivalentGroups: exposureHistory.equivalentGroups,
    });
    if (selection.kind !== "selected") {
      throw new ReaderFormUnavailableError(
        "The reviewed Reader bank cannot issue a complete unseen equivalent form.",
      );
    }
    const formHash = await hashReaderSessionForm(selection.form);
    const timestamp = this.currentTimestamp();
    const startedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const receipt: OpenReaderSessionReceiptV1 = {
      protocolVersion: READER_SESSION_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId,
      enrollmentId: enrollment.enrollmentId,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      storyId: selection.story.id,
      storyVersion: selection.story.storyVersion,
      formVersion: selection.story.formVersion,
      formSchemaVersion: selection.form.formSchemaVersion,
      script: selection.form.script,
      supportMode: selection.form.supportMode,
      supportPolicyVersion: selection.form.supportPolicyVersion,
      expectedItemCount: selection.form.items.length,
      form: selection.form,
      formHash,
      status: "started",
      startedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "reader.started",
      aggregateId: sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId,
        enrollmentId: enrollment.enrollmentId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        storyId: selection.story.id,
        storyVersion: selection.story.storyVersion,
        formVersion: selection.story.formVersion,
        formHash,
        script: selection.form.script,
        supportMode: selection.form.supportMode,
        supportPolicyVersion: selection.form.supportPolicyVersion,
        expectedItemCount: selection.form.items.length,
        startedAt,
      },
    });

    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM enrollments enrollment
           INNER JOIN profiles profile ON profile.user_id = enrollment.user_id
           INNER JOIN course_versions course ON course.id = enrollment.course_version_id
           WHERE enrollment.user_id = ? AND enrollment.id = ?
             AND enrollment.course_version_id = ? AND enrollment.status = 'active'
             AND profile.script = ?
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
         )
         AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         AND NOT EXISTS (
           SELECT 1 FROM reader_sessions active
           WHERE active.user_id = ? AND active.reset_epoch = ?
             AND active.content_version = ? AND active.story_id = ?
             AND active.status = 'started'
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        READER_SESSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        userId,
        enrollment.enrollmentId,
        CONTENT_VERSION,
        command.script,
        CURRENT_CONTENT_MANIFEST_SHA256,
        userId,
        command.resetEpoch,
        userId,
        command.resetEpoch,
        CONTENT_VERSION,
        command.storyId,
      ),
      this.database.prepare(
        `INSERT INTO reader_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, reset_epoch, content_version, story_id, story_version, form_version, form_schema_version, form_manifest_json, form_manifest_hash, script, support_mode, support_policy_version, expected_item_count, status, started_at, created_at)
         SELECT ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'started', ?, ?
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
        selection.story.id,
        selection.story.storyVersion,
        selection.story.formVersion,
        selection.form.formSchemaVersion,
        canonicalReaderSessionForm(selection.form),
        formHash,
        selection.form.script,
        selection.form.supportMode,
        selection.form.supportPolicyVersion,
        selection.form.items.length,
        timestamp,
        timestamp,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        READER_SESSION_IDEMPOTENCY_SCOPE,
      ),
      ...selection.items.flatMap((item, position) => {
        if (selection.form.items[position]?.priorExposure) return [];
        return [this.database.prepare(
          `INSERT INTO reader_item_exposures (id, user_id, session_id, reset_epoch, content_version, story_id, item_id, item_version, exposure_group_id, equivalent_group_id, exposed_at)
           SELECT ?, ?, session.id, session.reset_epoch, session.content_version,
                  session.story_id, ?, ?, ?, ?, ?
           FROM reader_sessions session
           WHERE session.id = ? AND session.user_id = ?
             AND session.reset_epoch = ? AND session.status = 'started'`,
        ).bind(
          crypto.randomUUID(),
          userId,
          item.id,
          item.itemVersion,
          item.exposureGroupId,
          item.equivalentGroupId,
          timestamp,
          sessionId,
          userId,
          command.resetEpoch,
        )];
      }),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'reader_session', session.id, 'reader.started', 1,
                session.reset_epoch, ?, 'pending', 0, ?, ?
         FROM reader_sessions session
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'started'`,
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
         SELECT ?, session.reset_epoch, '${NORMALIZED_LEARNING_CHANGE_ENTITY.readerSession}', session.id, 1, ?,
                'upsert', NULL, ?
         FROM reader_sessions session
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'started'`,
      ).bind(
        userId,
        normalizedLearningChangeOperationId.readerSessionOpened(
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
        throw new ReaderSessionUnavailableError(
          "Reader enrollment, reset epoch, exposure, or active-session state changed before commit.",
        );
      }
      return receipt;
    } catch {
      await requireCurrentLearningResetEpoch(
        this.database,
        userId,
        command.resetEpoch,
      );
      const winner = await this.getIdempotency(
        userId,
        READER_SESSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          parseOpenReaderSessionReceipt,
        );
      }
      await this.throwIfSequenceOwned(
        userId,
        deviceRecordId,
        command.deviceSequence,
      );
      throw new ReaderFormUnavailableError(
        "Reader release, enrollment, exposure, or active-session state changed before commit.",
      );
    }
  }

  async recordAttempt(
    userId: string,
    command: RecordReaderAttemptCommandV1,
  ): Promise<RecordReaderAttemptReceiptV1> {
    const requestHash = await hashRecordReaderAttemptCommand(command);
    await requireCurrentLearningResetEpoch(
      this.database,
      userId,
      command.resetEpoch,
    );
    const existing = await this.getIdempotency(
      userId,
      READER_ATTEMPT_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        parseRecordReaderAttemptReceipt,
      );
    }

    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      READER_ATTEMPT_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    this.requireCurrentCommandContent(command.contentVersion);
    await this.requireReleasedContent();
    const session = await this.requireStartedSession(userId, command);
    const form = await this.validateStoredForm(session, true);
    const formItem = form.items[command.position];
    if (
      !formItem
      || formItem.position !== command.position
      || formItem.itemId !== command.itemId
      || formItem.itemVersion !== command.itemVersion
      || session.formManifestHash !== command.formHash
    ) {
      throw new ReaderSessionUnavailableError(
        "Reader item is not the exact position in the immutable server-issued form.",
      );
    }
    const bankBinding = this.requireBankBinding(
      session,
      formItem,
    );
    const selectedOption = formItem.options.includes(command.selectedOption)
      ? command.selectedOption
      : null;
    if (!selectedOption) {
      throw new ReaderSessionUnavailableError(
        "Reader selection is not one of the server-issued options.",
      );
    }
    await this.requireExactExposureClaim(
      userId,
      session,
      bankBinding.item,
    );

    const timestamp = this.currentTimestamp();
    const occurredAt = Date.parse(command.occurredAt);
    if (
      !Number.isFinite(occurredAt)
      || new Date(occurredAt).toISOString() !== command.occurredAt
      || occurredAt < session.startedAt
    ) {
      throw new ReaderSessionUnavailableError(
        "Reader attempt predates its server-issued session.",
      );
    }
    if (occurredAt > timestamp + READER_MAX_OCCURRED_AT_FUTURE_SKEW_MS) {
      throw new ReaderSessionUnavailableError(
        "Reader attempt timestamp is too far ahead of server time.",
      );
    }
    const correct = readerAnswersMatch(
      selectedOption,
      bankBinding.item.correctAnswer,
    );
    const masteryEligible = readerPolicyAllowsMastery({
      supportMode: session.supportMode as ReaderSupportMode,
      answerExposure: bankBinding.item.answerExposure,
      priorExposure: formItem.priorExposure,
    }) && formItem.masteryEligible;
    const outcome = correct ? "correct" as const : "incorrect" as const;
    const score = correct ? 100 as const : 0 as const;
    const recordedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const activityId = `${session.storyId}:${formItem.itemId}`;
    const evidencePolicyVersion = readerEvidencePolicyVersion(
      session.supportPolicyVersion,
    );
    const receipt: RecordReaderAttemptReceiptV1 = {
      protocolVersion: READER_ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      attemptId,
      evidenceId,
      sessionId: session.sessionId,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      formHash: command.formHash,
      position: formItem.position,
      itemId: formItem.itemId,
      itemVersion: formItem.itemVersion,
      method: READER_METHOD,
      skill: READER_SKILL,
      script: session.script as ReaderScript,
      supportMode: session.supportMode as ReaderSupportMode,
      supportPolicyVersion: session.supportPolicyVersion,
      answerExposure: bankBinding.item.answerExposure,
      priorExposure: formItem.priorExposure,
      masteryEligible,
      outcome,
      score,
      verification: "server-objective",
      status: "recorded",
      recordedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "reader.attempt.recorded",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId: session.sessionId,
        attemptId,
        evidenceId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        formHash: command.formHash,
        position: formItem.position,
        itemId: formItem.itemId,
        itemVersion: formItem.itemVersion,
        method: READER_METHOD,
        skill: READER_SKILL,
        script: session.script,
        supportMode: session.supportMode,
        supportPolicyVersion: session.supportPolicyVersion,
        answerExposure: bankBinding.item.answerExposure,
        priorExposure: formItem.priorExposure,
        masteryEligible,
        outcome,
        score,
        verification: "server-objective",
        recordedAt,
      },
    });
    const metadataJson = canonicalStringify(
      evidenceMetadata(session, formItem),
    );

    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM reader_sessions session
           INNER JOIN enrollments enrollment
             ON enrollment.user_id = session.user_id
            AND enrollment.id = session.enrollment_id
           INNER JOIN course_versions course
             ON course.id = enrollment.course_version_id
           WHERE session.id = ? AND session.user_id = ?
             AND session.reset_epoch = ? AND session.content_version = ?
             AND session.form_manifest_hash = ? AND session.status = 'started'
             AND enrollment.status = 'active'
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
             AND EXISTS (
               SELECT 1 FROM reader_item_exposures exposure
               WHERE exposure.user_id = session.user_id
                 AND exposure.content_version = session.content_version
                 AND (
                   exposure.exposure_group_id = ?
                   OR exposure.equivalent_group_id = ?
                 )
             )
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        READER_ATTEMPT_IDEMPOTENCY_SCOPE,
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
        bankBinding.item.exposureGroupId,
        bankBinding.item.equivalentGroupId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO learning_attempts (id, user_id, enrollment_id, session_id, device_id, device_sequence, idempotency_record_id, schema_version, reset_epoch, content_version, activity_id, activity_version, source, method, skill, response_json, outcome, score, used_hint, prior_exposure, required_for_pass, scoring_version, occurred_at, received_at)
         SELECT ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, 'reader',
                'reading-comprehension', 'reading', ?, ?, ?, ?, ?, 0, ?, ?, ?
         FROM idempotency_records receipt
         WHERE receipt.id = ? AND receipt.user_id = ?
           AND receipt.reset_epoch = ? AND receipt.scope = ?
           AND EXISTS (
             SELECT 1 FROM reader_sessions session
             WHERE session.id = ? AND session.user_id = ?
               AND session.reset_epoch = ? AND session.status = 'started'
               AND session.form_manifest_hash = ?
           )`,
      ).bind(
        attemptId,
        userId,
        session.enrollmentId,
        deviceRecordId,
        command.deviceSequence,
        idempotencyRecordId,
        command.resetEpoch,
        CONTENT_VERSION,
        activityId,
        formItem.itemVersion,
        JSON.stringify({
          kind: "selection",
          answer: selectedOption,
          ...(command.durationMs === undefined
            ? {}
            : { durationMs: command.durationMs }),
        }),
        outcome,
        score,
        session.supportMode === "assisted" ? 1 : 0,
        formItem.priorExposure ? 1 : 0,
        READER_OBJECTIVE_SCORING_VERSION,
        occurredAt,
        timestamp,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        READER_ATTEMPT_IDEMPOTENCY_SCOPE,
        session.sessionId,
        userId,
        command.resetEpoch,
        command.formHash,
      ),
      this.database.prepare(
        `INSERT INTO learning_evidence (id, user_id, enrollment_id, attempt_id, session_id, schema_version, reset_epoch, policy_version, content_version, activity_id, activity_version, source, method, skill, outcome, score, verified, mastery_eligible, metadata_json, occurred_at, recorded_at)
         SELECT ?, ?, attempt.enrollment_id, attempt.id, NULL, 1,
                attempt.reset_epoch, ?, attempt.content_version,
                attempt.activity_id, attempt.activity_version, 'reader',
                'reading-comprehension', 'reading', attempt.outcome,
                attempt.score, 1, ?, ?, attempt.occurred_at, ?
         FROM learning_attempts attempt
         WHERE attempt.id = ? AND attempt.user_id = ?
           AND attempt.reset_epoch = ? AND attempt.session_id IS NULL
           AND attempt.source = 'reader'
           AND attempt.method = 'reading-comprehension'
           AND attempt.skill = 'reading'`,
      ).bind(
        evidenceId,
        userId,
        evidencePolicyVersion,
        masteryEligible ? 1 : 0,
        metadataJson,
        timestamp,
        attemptId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO reader_session_attempts (user_id, session_id, attempt_id, reset_epoch, position, item_id, item_version, form_manifest_hash, created_at)
         SELECT ?, session.id, attempt.id, session.reset_epoch, ?, ?, ?,
                session.form_manifest_hash, ?
         FROM reader_sessions session
         INNER JOIN learning_attempts attempt
           ON attempt.user_id = session.user_id
          AND attempt.id = ?
          AND attempt.reset_epoch = session.reset_epoch
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'started'
           AND session.form_manifest_hash = ?
           AND EXISTS (
             SELECT 1 FROM learning_evidence evidence
             WHERE evidence.id = ? AND evidence.user_id = ?
               AND evidence.attempt_id = attempt.id
               AND evidence.reset_epoch = attempt.reset_epoch
           )`,
      ).bind(
        userId,
        formItem.position,
        formItem.itemId,
        formItem.itemVersion,
        timestamp,
        attemptId,
        session.sessionId,
        userId,
        command.resetEpoch,
        command.formHash,
        evidenceId,
        userId,
      ),
      this.database.prepare(
        `UPDATE enrollments
         SET last_activity_at = ?, revision = revision + 1
         WHERE user_id = ? AND id = ?
           AND EXISTS (
             SELECT 1 FROM reader_session_attempts binding
             WHERE binding.user_id = ? AND binding.session_id = ?
               AND binding.attempt_id = ? AND binding.reset_epoch = ?
           )`,
      ).bind(
        timestamp,
        userId,
        session.enrollmentId,
        userId,
        session.sessionId,
        attemptId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'reader_session', binding.session_id,
                'reader.attempt.recorded', 1, binding.reset_epoch, ?,
                'pending', 0, ?, ?
         FROM reader_session_attempts binding
         WHERE binding.user_id = ? AND binding.session_id = ?
           AND binding.attempt_id = ? AND binding.reset_epoch = ?`,
      ).bind(
        crypto.randomUUID(),
        userId,
        eventPayload,
        timestamp,
        timestamp,
        userId,
        session.sessionId,
        attemptId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, binding.reset_epoch, '${NORMALIZED_LEARNING_CHANGE_ENTITY.learningAttempt}', binding.attempt_id,
                1, ?, 'upsert', NULL, ?
         FROM reader_session_attempts binding
         WHERE binding.user_id = ? AND binding.session_id = ?
           AND binding.attempt_id = ? AND binding.reset_epoch = ?`,
      ).bind(
        userId,
        normalizedLearningChangeOperationId.readerAttemptRecorded(
          command.idempotencyKey,
        ),
        timestamp,
        userId,
        session.sessionId,
        attemptId,
        command.resetEpoch,
      ),
    ];

    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new ReaderSessionUnavailableError(
          "Reader session changed before the attempt committed.",
        );
      }
      return receipt;
    } catch {
      await requireCurrentLearningResetEpoch(
        this.database,
        userId,
        command.resetEpoch,
      );
      const winner = await this.getIdempotency(
        userId,
        READER_ATTEMPT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          parseRecordReaderAttemptReceipt,
        );
      }
      await this.throwIfSequenceOwned(
        userId,
        deviceRecordId,
        command.deviceSequence,
      );
      const attempted = await this.database.prepare(
        `SELECT attempt_id AS attemptId
         FROM reader_session_attempts
         WHERE user_id = ? AND session_id = ? AND reset_epoch = ?
           AND (position = ? OR item_version = ?)
         LIMIT 1`,
      ).bind(
        userId,
        command.sessionId,
        command.resetEpoch,
        command.position,
        command.itemVersion,
      ).first<{ attemptId: string }>();
      if (attempted) {
        throw new ReaderAttemptConflictError(
          "The Reader item already has an immutable first response.",
        );
      }
      throw new ReaderSessionUnavailableError(
        "Reader session, release, exposure, form, or enrollment changed before commit.",
      );
    }
  }

  async submitSession(
    userId: string,
    command: SubmitReaderSessionCommandV1,
  ): Promise<SubmitReaderSessionReceiptV1> {
    const requestHash = await hashSubmitReaderSessionCommand(command);
    await requireCurrentLearningResetEpoch(
      this.database,
      userId,
      command.resetEpoch,
    );
    const existing = await this.getIdempotency(
      userId,
      READER_SUBMISSION_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        parseSubmitReaderSessionReceipt,
      );
    }

    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      READER_SUBMISSION_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    this.requireCurrentCommandContent(command.contentVersion);
    await this.requireReleasedContent();
    const session = await this.requireStartedSession(userId, command);
    const form = await this.validateStoredForm(session, true);
    if (
      session.formManifestHash !== command.formHash
      || session.expectedItemCount !== command.expectedItemCount
      || form.items.length !== command.expectedItemCount
    ) {
      throw new ReaderSessionUnavailableError(
        "Reader submission does not bind the exact immutable form.",
      );
    }
    const attempts = await this.readSessionAttempts(userId, session);
    if (attempts.length !== form.items.length) {
      throw new ReaderSubmissionIncompleteError(
        "Every issued Reader item requires one immutable response.",
      );
    }
    const attemptsByPosition = new Map(
      attempts.map((attempt) => [attempt.position, attempt]),
    );
    const bankItemsByPosition = new Map<number, AuthoritativeReaderItem>();
    for (const formItem of form.items) {
      const bankBinding = this.requireBankBinding(session, formItem);
      await this.requireExactExposureClaim(
        userId,
        session,
        bankBinding.item,
      );
      bankItemsByPosition.set(formItem.position, bankBinding.item);
    }
    const results: ReaderSubmissionItemResultV1[] = form.items.map(
      (formItem) => {
        const attempt = attemptsByPosition.get(formItem.position);
        const bankItem = bankItemsByPosition.get(formItem.position);
        if (!attempt || !bankItem) {
          throw new ReaderSubmissionIncompleteError(
            "Reader attempt positions must be dense and complete.",
          );
        }
        this.validateStoredAttempt(
          session,
          formItem,
          attempt,
          bankItem,
        );
        const response = this.parseStoredSelection(attempt.responseJson);
        if (!formItem.options.includes(response.answer)) {
          throw new ReaderSessionUnavailableError(
            "Stored Reader response is not an issued option.",
          );
        }
        const correct = readerAnswersMatch(
          response.answer,
          bankItem.correctAnswer,
        );
        if (
          attempt.outcome !== (correct ? "correct" : "incorrect")
          || attempt.score !== (correct ? 100 : 0)
        ) {
          throw new ReaderSessionUnavailableError(
            "Stored Reader score conflicts with the server answer key.",
          );
        }
        return {
          position: formItem.position,
          itemId: formItem.itemId,
          itemVersion: formItem.itemVersion,
          correct,
          answerExposure: formItem.answerExposure,
          priorExposure: formItem.priorExposure,
          masteryEligible: formItem.masteryEligible,
        };
      },
    );
    const correctCount = results.filter((result) => result.correct).length;
    const score = Math.round((correctCount / results.length) * 100);
    const timestamp = Math.max(this.currentTimestamp(), session.startedAt);
    const submittedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const receipt: SubmitReaderSessionReceiptV1 = {
      protocolVersion: READER_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      storyId: session.storyId,
      storyVersion: session.storyVersion,
      formVersion: session.formVersion,
      formHash: command.formHash,
      expectedItemCount: form.items.length,
      attemptCount: attempts.length,
      correctCount,
      score,
      method: READER_METHOD,
      skill: READER_SKILL,
      script: session.script as ReaderScript,
      supportMode: session.supportMode as ReaderSupportMode,
      supportPolicyVersion: session.supportPolicyVersion,
      results,
      status: "submitted",
      submittedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "reader.submitted",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId: session.sessionId,
        enrollmentId: session.enrollmentId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        storyId: session.storyId,
        storyVersion: session.storyVersion,
        formVersion: session.formVersion,
        formHash: command.formHash,
        expectedItemCount: form.items.length,
        attemptCount: attempts.length,
        correctCount,
        score,
        method: READER_METHOD,
        skill: READER_SKILL,
        script: session.script,
        supportMode: session.supportMode,
        supportPolicyVersion: session.supportPolicyVersion,
        status: "submitted",
        submittedAt,
      },
    });
    const exposureClauses = form.items.map(() =>
      `AND EXISTS (
         SELECT 1 FROM reader_item_exposures exposure
         WHERE exposure.user_id = session.user_id
           AND exposure.session_id = session.id
           AND exposure.reset_epoch = session.reset_epoch
           AND exposure.content_version = session.content_version
           AND exposure.story_id = session.story_id
           AND exposure.item_id = ? AND exposure.item_version = ?
           AND exposure.exposure_group_id = ?
           AND exposure.equivalent_group_id = ?
       )`
    ).join(" ");
    const exposureBindings = form.items.flatMap((formItem) => {
      const bankItem = bankItemsByPosition.get(formItem.position);
      if (!bankItem) {
        throw new ReaderSessionUnavailableError(
          "Reader form lost its server-bank exposure binding.",
        );
      }
      return [
        bankItem.id,
        bankItem.itemVersion,
        bankItem.exposureGroupId,
        bankItem.equivalentGroupId,
      ];
    });
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM reader_sessions session
           INNER JOIN enrollments enrollment
             ON enrollment.user_id = session.user_id
            AND enrollment.id = session.enrollment_id
           INNER JOIN course_versions course
             ON course.id = enrollment.course_version_id
           WHERE session.id = ? AND session.user_id = ?
             AND session.reset_epoch = ? AND session.content_version = ?
             AND session.form_manifest_hash = ?
             AND session.expected_item_count = ?
             AND session.status = 'started'
             AND enrollment.status = 'active'
             AND course.manifest_hash = ?
             AND course.release_state IN ('beta', 'published')
             AND course.linguistic_review_status = 'approved'
             AND (
               SELECT COUNT(*) FROM reader_session_attempts binding
               WHERE binding.user_id = session.user_id
                 AND binding.session_id = session.id
                 AND binding.reset_epoch = session.reset_epoch
             ) = session.expected_item_count
             ${exposureClauses}
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        READER_SUBMISSION_IDEMPOTENCY_SCOPE,
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
        command.expectedItemCount,
        CURRENT_CONTENT_MANIFEST_SHA256,
        ...exposureBindings,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `UPDATE reader_sessions
         SET status = 'submitted', correct_count = ?, terminal_at = ?,
             terminal_reason = 'completed'
         WHERE id = ? AND user_id = ? AND reset_epoch = ?
           AND status = 'started'
           AND EXISTS (
             SELECT 1 FROM idempotency_records receipt
             WHERE receipt.id = ? AND receipt.user_id = ?
               AND receipt.reset_epoch = ? AND receipt.scope = ?
           )`,
      ).bind(
        correctCount,
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        READER_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'reader_session', session.id, 'reader.submitted', 1,
                session.reset_epoch, ?, 'pending', 0, ?, ?
         FROM reader_sessions session
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'submitted'
           AND EXISTS (
             SELECT 1 FROM idempotency_records receipt
             WHERE receipt.id = ? AND receipt.user_id = ?
               AND receipt.reset_epoch = ? AND receipt.scope = ?
           )`,
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
        READER_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, session.reset_epoch, '${NORMALIZED_LEARNING_CHANGE_ENTITY.readerSession}', session.id, 2, ?,
                'upsert', NULL, ?
         FROM reader_sessions session
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'submitted'
           AND EXISTS (
             SELECT 1 FROM idempotency_records receipt
             WHERE receipt.id = ? AND receipt.user_id = ?
               AND receipt.reset_epoch = ? AND receipt.scope = ?
           )`,
      ).bind(
        userId,
        normalizedLearningChangeOperationId.readerSessionSubmitted(
          command.idempotencyKey,
        ),
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        READER_SUBMISSION_IDEMPOTENCY_SCOPE,
      ),
    ];

    try {
      const batchResults = await this.database.batch(statements);
      if (!allChangedOnce(batchResults)) {
        throw new ReaderSessionUnavailableError(
          "Reader terminal state changed before submission committed.",
        );
      }
      return receipt;
    } catch {
      await requireCurrentLearningResetEpoch(
        this.database,
        userId,
        command.resetEpoch,
      );
      const winner = await this.getIdempotency(
        userId,
        READER_SUBMISSION_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          parseSubmitReaderSessionReceipt,
        );
      }
      await this.throwIfSequenceOwned(
        userId,
        deviceRecordId,
        command.deviceSequence,
      );
      throw new ReaderSessionUnavailableError(
        "Reader session, release, form, or terminal state changed before submission.",
      );
    }
  }

  async abandonSession(
    userId: string,
    command: AbandonReaderSessionCommandV1,
  ): Promise<AbandonReaderSessionReceiptV1> {
    const requestHash = await hashAbandonReaderSessionCommand(command);
    await requireCurrentLearningResetEpoch(
      this.database,
      userId,
      command.resetEpoch,
    );
    const existing = await this.getIdempotency(
      userId,
      READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    if (existing) {
      return this.resolveExisting(
        existing,
        requestHash,
        parseAbandonReaderSessionReceipt,
      );
    }

    const deviceRecordId = await this.registerDevice(userId, command);
    await this.requireSequenceAvailable(
      userId,
      deviceRecordId,
      command.deviceSequence,
      READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
      command.idempotencyKey,
    );
    this.requireCurrentCommandContent(command.contentVersion);
    const session = await this.requireStartedSession(userId, command);
    await this.validateStoredForm(session, false);
    const timestamp = Math.max(this.currentTimestamp(), session.startedAt);
    const abandonedAt = new Date(timestamp).toISOString();
    const idempotencyRecordId = crypto.randomUUID();
    const receipt: AbandonReaderSessionReceiptV1 = {
      protocolVersion: READER_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      resetEpoch: command.resetEpoch,
      contentVersion: session.contentVersion,
      storyId: session.storyId,
      storyVersion: session.storyVersion,
      formVersion: session.formVersion,
      formHash: command.formHash,
      script: session.script as ReaderScript,
      supportMode: session.supportMode as ReaderSupportMode,
      supportPolicyVersion: session.supportPolicyVersion,
      reason: command.reason,
      status: "abandoned",
      abandonedAt,
    };
    const responseJson = JSON.stringify(receipt);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "reader.abandoned",
      aggregateId: session.sessionId,
      resetEpoch: command.resetEpoch,
      payload: {
        sessionId: session.sessionId,
        enrollmentId: session.enrollmentId,
        resetEpoch: command.resetEpoch,
        contentVersion: session.contentVersion,
        storyId: session.storyId,
        storyVersion: session.storyVersion,
        formVersion: session.formVersion,
        formHash: command.formHash,
        script: session.script,
        supportMode: session.supportMode,
        supportPolicyVersion: session.supportPolicyVersion,
        reason: command.reason,
        status: "abandoned",
        abandonedAt,
      },
    });
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (id, user_id, device_id, device_sequence, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM reader_sessions session
           WHERE session.id = ? AND session.user_id = ?
             AND session.reset_epoch = ? AND session.content_version = ?
             AND session.form_manifest_hash = ? AND session.status = 'started'
             AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
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
        `UPDATE reader_sessions
         SET status = 'abandoned', terminal_at = ?, terminal_reason = ?
         WHERE id = ? AND user_id = ? AND reset_epoch = ?
           AND status = 'started'
           AND EXISTS (
             SELECT 1 FROM idempotency_records receipt
             WHERE receipt.id = ? AND receipt.user_id = ?
               AND receipt.reset_epoch = ? AND receipt.scope = ?
           )`,
      ).bind(
        timestamp,
        command.reason,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (id, user_id, aggregate_type, aggregate_id, event_type, schema_version, reset_epoch, payload_json, status, attempts, available_at, created_at)
         SELECT ?, ?, 'reader_session', session.id, 'reader.abandoned', 1,
                session.reset_epoch, ?, 'pending', 0, ?, ?
         FROM reader_sessions session
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'abandoned'
           AND EXISTS (
             SELECT 1 FROM idempotency_records receipt
             WHERE receipt.id = ? AND receipt.user_id = ?
               AND receipt.reset_epoch = ? AND receipt.scope = ?
           )`,
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
        READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (user_id, reset_epoch, entity_type, entity_id, revision, operation_id, operation, payload_json, occurred_at)
         SELECT ?, session.reset_epoch, '${NORMALIZED_LEARNING_CHANGE_ENTITY.readerSession}', session.id, 2, ?,
                'upsert', NULL, ?
         FROM reader_sessions session
         WHERE session.id = ? AND session.user_id = ?
           AND session.reset_epoch = ? AND session.status = 'abandoned'
           AND EXISTS (
             SELECT 1 FROM idempotency_records receipt
             WHERE receipt.id = ? AND receipt.user_id = ?
               AND receipt.reset_epoch = ? AND receipt.scope = ?
           )`,
      ).bind(
        userId,
        normalizedLearningChangeOperationId.readerSessionAbandoned(
          command.idempotencyKey,
        ),
        timestamp,
        session.sessionId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
      ),
    ];
    try {
      const results = await this.database.batch(statements);
      if (!allChangedOnce(results)) {
        throw new ReaderSessionUnavailableError(
          "Reader terminal state changed before abandonment committed.",
        );
      }
      return receipt;
    } catch {
      await requireCurrentLearningResetEpoch(
        this.database,
        userId,
        command.resetEpoch,
      );
      const winner = await this.getIdempotency(
        userId,
        READER_ABANDONMENT_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
      );
      if (winner) {
        return this.resolveExisting(
          winner,
          requestHash,
          parseAbandonReaderSessionReceipt,
        );
      }
      await this.throwIfSequenceOwned(
        userId,
        deviceRecordId,
        command.deviceSequence,
      );
      throw new ReaderSessionUnavailableError(
        "Reader session, form, or terminal state changed before abandonment.",
      );
    }
  }

  private currentTimestamp() {
    const timestamp = this.now();
    if (
      !Number.isSafeInteger(timestamp)
      || timestamp < 0
      || timestamp > 8_640_000_000_000_000
    ) {
      throw new ReaderSessionUnavailableError(
        "Reader server clock is invalid.",
      );
    }
    return timestamp;
  }

  private requireCurrentCommandContent(contentVersion: string) {
    if (contentVersion !== CONTENT_VERSION) {
      throw new ReaderContentUnavailableError(
        "Reader command does not target the exact current content version.",
      );
    }
  }

  private async requireReleasedContent() {
    if (!isPromotedContentReleasePolicy(this.publicationPolicy)) {
      throw new ReaderContentUnavailableError(
        "The immutable current content package has not passed explicit promotion gates.",
      );
    }
    await ensureCurrentCourseVersion(this.database, this.publicationPolicy);
  }

  private async requireCurrentEnrollment(
    userId: string,
    enrollmentId: string,
    script: ReaderScript,
  ) {
    const enrollment = await this.database.prepare(
      `SELECT enrollment.id AS enrollmentId, profile.script AS script
       FROM enrollments enrollment
       INNER JOIN profiles profile ON profile.user_id = enrollment.user_id
       INNER JOIN course_versions course
         ON course.id = enrollment.course_version_id
       WHERE enrollment.user_id = ? AND enrollment.id = ?
         AND enrollment.course_version_id = ? AND enrollment.status = 'active'
         AND profile.script = ?
         AND course.manifest_hash = ?
         AND course.release_state IN ('beta', 'published')
         AND course.linguistic_review_status = 'approved'
       LIMIT 1`,
    ).bind(
      userId,
      enrollmentId,
      CONTENT_VERSION,
      script,
      CURRENT_CONTENT_MANIFEST_SHA256,
    ).first<EnrollmentRow>();
    if (
      !enrollment
      || (
        enrollment.script !== "simplified"
        && enrollment.script !== "traditional"
      )
    ) {
      throw new ReaderEnrollmentUnavailableError(
        "An active enrollment with the exact approved package and script is required.",
      );
    }
    return enrollment;
  }

  private async readExposureHistory(userId: string) {
    const rows = await this.database.prepare(
      `SELECT exposure_group_id AS exposureGroupId,
              equivalent_group_id AS equivalentGroupId
       FROM reader_item_exposures
       WHERE user_id = ?`,
    ).bind(userId).all<ReaderExposureRow>();
    if (!rows.success) {
      throw new ReaderFormUnavailableError(
        "Unable to read durable Reader exposure history.",
      );
    }
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
      formHash: ReaderSessionFormHash;
    },
  ) {
    const session = await this.database.prepare(
      `SELECT id AS sessionId, enrollment_id AS enrollmentId,
              reset_epoch AS resetEpoch, content_version AS contentVersion,
              story_id AS storyId, story_version AS storyVersion,
              form_version AS formVersion,
              form_schema_version AS formSchemaVersion,
              form_manifest_json AS formManifestJson,
              form_manifest_hash AS formManifestHash, script,
              support_mode AS supportMode,
              support_policy_version AS supportPolicyVersion,
              expected_item_count AS expectedItemCount, status,
              started_at AS startedAt
       FROM reader_sessions
       WHERE id = ? AND user_id = ? AND reset_epoch = ?
         AND content_version = ? AND form_manifest_hash = ?
         AND status = 'started'
       LIMIT 1`,
    ).bind(
      command.sessionId,
      userId,
      command.resetEpoch,
      command.contentVersion,
      command.formHash,
    ).first<ReaderSessionRow>();
    if (!session) {
      throw new ReaderSessionUnavailableError(
        "Reader session does not belong to this learner, reset epoch, and form.",
      );
    }
    return session;
  }

  private async validateStoredForm(
    session: ReaderSessionRow,
    requireCurrentBank: boolean,
  ) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(session.formManifestJson) as unknown;
    } catch {
      throw new ReaderSessionUnavailableError(
        "Stored Reader form is not valid JSON.",
      );
    }
    const parsedReceipt = await parseOpenReaderSessionReceipt({
      protocolVersion: READER_SESSION_PROTOCOL_VERSION,
      idempotencyKey: "stored-reader-form-integrity",
      duplicate: false,
      sessionId: session.sessionId,
      enrollmentId: session.enrollmentId,
      resetEpoch: session.resetEpoch,
      contentVersion: session.contentVersion,
      storyId: session.storyId,
      storyVersion: session.storyVersion,
      formVersion: session.formVersion,
      formSchemaVersion: session.formSchemaVersion,
      script: session.script,
      supportMode: session.supportMode,
      supportPolicyVersion: session.supportPolicyVersion,
      expectedItemCount: session.expectedItemCount,
      form: parsed,
      formHash: session.formManifestHash,
      status: "started",
      startedAt: new Date(session.startedAt).toISOString(),
    });
    if (!parsedReceipt.ok) {
      throw new ReaderSessionUnavailableError(
        "Stored Reader form metadata or hash is inconsistent.",
      );
    }
    const form = parsedReceipt.receipt.form;
    if (requireCurrentBank) {
      for (const item of form.items) {
        this.requireBankBinding(session, item);
      }
    }
    return form;
  }

  private requireBankBinding(
    session: ReaderSessionRow,
    formItem: ReaderSessionFormV1["items"][number],
  ) {
    const binding = authoritativeReaderItemByVersion(this.bank).get(
      formItem.itemVersion,
    );
    if (
      !binding
      || binding.story.id !== session.storyId
      || binding.story.storyVersion !== session.storyVersion
      || binding.story.formVersion !== session.formVersion
      || binding.story.script !== session.script
      || binding.story.supportPolicyVersion !== session.supportPolicyVersion
      || !isIssuableAuthoritativeReaderStory(binding.story)
      || canonicalStringify(
        readerPresentationForItem(
          binding.item,
          formItem.position,
          session.supportMode as ReaderSupportMode,
          formItem.priorExposure,
        ),
      ) !== canonicalStringify(formItem)
    ) {
      throw new ReaderContentUnavailableError(
        "Reader item is no longer bound to the exact approved server bank.",
      );
    }
    return binding;
  }

  private async requireExactExposureClaim(
    userId: string,
    session: ReaderSessionRow,
    item: AuthoritativeReaderItem,
  ) {
    const exposure = await this.database.prepare(
      `SELECT id
       FROM reader_item_exposures
       WHERE user_id = ? AND content_version = ?
         AND (
           exposure_group_id = ?
           OR equivalent_group_id = ?
         )
       LIMIT 1`,
    ).bind(
      userId,
      session.contentVersion,
      item.exposureGroupId,
      item.equivalentGroupId,
    ).first<{ id: string }>();
    if (!exposure) {
      throw new ReaderSessionUnavailableError(
        "Reader item lacks its durable first-exposure authority.",
      );
    }
  }

  private async readSessionAttempts(
    userId: string,
    session: ReaderSessionRow,
  ) {
    const policyVersion = readerEvidencePolicyVersion(
      session.supportPolicyVersion,
    );
    const rows = await this.database.prepare(
      `SELECT binding.attempt_id AS attemptId,
              evidence.id AS evidenceId,
              attempt.session_id AS lessonSessionId,
              evidence.session_id AS evidenceLessonSessionId,
              binding.position, binding.item_id AS itemId,
              binding.item_version AS itemVersion,
              binding.form_manifest_hash AS formManifestHash,
              attempt.activity_id AS activityId,
              attempt.activity_version AS activityVersion,
              attempt.source, attempt.method, attempt.skill,
              attempt.response_json AS responseJson,
              attempt.outcome, attempt.score,
              attempt.used_hint AS usedHint,
              attempt.prior_exposure AS priorExposure,
              attempt.required_for_pass AS requiredForPass,
              attempt.scoring_version AS scoringVersion,
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
              evidence.metadata_json AS evidenceMetadataJson
       FROM reader_session_attempts binding
       INNER JOIN learning_attempts attempt
         ON attempt.user_id = binding.user_id
        AND attempt.id = binding.attempt_id
        AND attempt.reset_epoch = binding.reset_epoch
       INNER JOIN learning_evidence evidence
         ON evidence.user_id = attempt.user_id
        AND evidence.attempt_id = attempt.id
        AND evidence.reset_epoch = attempt.reset_epoch
        AND evidence.policy_version = ?
        AND evidence.skill = 'reading'
       WHERE binding.user_id = ? AND binding.session_id = ?
         AND binding.reset_epoch = ?
       ORDER BY binding.position`,
    ).bind(
      policyVersion,
      userId,
      session.sessionId,
      session.resetEpoch,
    ).all<ReaderStoredAttemptRow>();
    if (!rows.success) {
      throw new ReaderSessionUnavailableError(
        "Unable to read the Reader attempt graph.",
      );
    }
    return rows.results ?? [];
  }

  private validateStoredAttempt(
    session: ReaderSessionRow,
    formItem: ReaderSessionFormV1["items"][number],
    attempt: ReaderStoredAttemptRow,
    bankItem: AuthoritativeReaderItem,
  ) {
    const expectedActivityId = `${session.storyId}:${formItem.itemId}`;
    const expectedPolicyVersion = readerEvidencePolicyVersion(
      session.supportPolicyVersion,
    );
    const expectedMastery = readerPolicyAllowsMastery({
      supportMode: session.supportMode as ReaderSupportMode,
      answerExposure: bankItem.answerExposure,
      priorExposure: formItem.priorExposure,
    }) && formItem.masteryEligible;
    const expectedMetadata = canonicalStringify(
      evidenceMetadata(session, formItem),
    );
    if (
      attempt.lessonSessionId !== null
      || attempt.evidenceLessonSessionId !== null
      || attempt.position !== formItem.position
      || attempt.itemId !== formItem.itemId
      || attempt.itemVersion !== formItem.itemVersion
      || attempt.formManifestHash !== session.formManifestHash
      || attempt.activityId !== expectedActivityId
      || attempt.activityVersion !== formItem.itemVersion
      || attempt.source !== "reader"
      || attempt.method !== READER_METHOD
      || attempt.skill !== READER_SKILL
      || attempt.usedHint !== (session.supportMode === "assisted" ? 1 : 0)
      || attempt.priorExposure !== (formItem.priorExposure ? 1 : 0)
      || attempt.requiredForPass !== 0
      || attempt.scoringVersion !== READER_OBJECTIVE_SCORING_VERSION
      || attempt.evidencePolicyVersion !== expectedPolicyVersion
      || attempt.evidenceActivityId !== expectedActivityId
      || attempt.evidenceActivityVersion !== formItem.itemVersion
      || attempt.evidenceSource !== "reader"
      || attempt.evidenceMethod !== READER_METHOD
      || attempt.evidenceSkill !== READER_SKILL
      || attempt.evidenceOutcome !== attempt.outcome
      || attempt.evidenceScore !== attempt.score
      || attempt.evidenceVerified !== 1
      || attempt.evidenceMasteryEligible !== (expectedMastery ? 1 : 0)
      || attempt.evidenceMetadataJson !== expectedMetadata
    ) {
      throw new ReaderSessionUnavailableError(
        "Stored Reader attempt/evidence graph does not match the frozen form.",
      );
    }
  }

  private parseStoredSelection(responseJson: string) {
    let response: unknown;
    try {
      response = JSON.parse(responseJson) as unknown;
    } catch {
      throw new ReaderSessionUnavailableError(
        "Stored Reader response cannot be re-scored.",
      );
    }
    if (
      !isRecord(response)
      || response.kind !== "selection"
      || typeof response.answer !== "string"
      || (
        response.durationMs !== undefined
        && (
          !Number.isSafeInteger(response.durationMs)
          || (response.durationMs as number) < 0
          || (response.durationMs as number) > 600_000
        )
      )
      || Object.keys(response).some((key) =>
        key !== "kind" && key !== "answer" && key !== "durationMs"
      )
    ) {
      throw new ReaderSessionUnavailableError(
        "Stored Reader response cannot be re-scored.",
      );
    }
    return response as {
      kind: "selection";
      answer: string;
      durationMs?: number;
    };
  }

  private async registerDevice(
    userId: string,
    command: ReaderCommandDevice,
  ) {
    const timestamp = this.currentTimestamp();
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
      `SELECT id FROM devices
       WHERE user_id = ? AND installation_id = ?
       LIMIT 1`,
    ).bind(
      userId,
      command.installationId,
    ).first<{ id: string }>();
    if (!device) {
      throw new ReaderSessionUnavailableError(
        "Unable to register the Reader device.",
      );
    }
    return device.id;
  }

  private async requireSequenceAvailable(
    userId: string,
    deviceRecordId: string,
    deviceSequence: number,
    scope: string,
    idempotencyKey: string,
  ) {
    const owner = await this.database.prepare(
      `SELECT scope, idempotency_key AS idempotencyKey
       FROM idempotency_records
       WHERE user_id = ? AND device_id = ? AND device_sequence = ?
       LIMIT 1`,
    ).bind(
      userId,
      deviceRecordId,
      deviceSequence,
    ).first<{ scope: string; idempotencyKey: string }>();
    if (
      owner
      && (
        owner.scope !== scope
        || owner.idempotencyKey !== idempotencyKey
      )
    ) {
      throw new ReaderDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }
  }

  private async throwIfSequenceOwned(
    userId: string,
    deviceRecordId: string,
    deviceSequence: number,
  ): Promise<void> {
    const owner = await this.database.prepare(
      `SELECT id FROM idempotency_records
       WHERE user_id = ? AND device_id = ? AND device_sequence = ?
       LIMIT 1`,
    ).bind(
      userId,
      deviceRecordId,
      deviceSequence,
    ).first<{ id: string }>();
    if (owner) {
      throw new ReaderDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }
  }

  private async getIdempotency(
    userId: string,
    scope: string,
    idempotencyKey: string,
  ): Promise<ExistingIdempotency | null> {
    return this.database.prepare(
      `SELECT request_hash AS requestHash, reset_epoch AS resetEpoch,
              status, response_json AS responseJson
       FROM idempotency_records
       WHERE user_id = ? AND scope = ? AND idempotency_key = ?
       LIMIT 1`,
    ).bind(
      userId,
      scope,
      idempotencyKey,
    ).first<ExistingIdempotency>();
  }

  private async resolveExisting<T extends { duplicate: boolean }>(
    existing: ExistingIdempotency,
    requestHash: string,
    parseReceipt: (
      input: unknown,
    ) => ReceiptParseResult<T> | Promise<ReceiptParseResult<T>>,
  ): Promise<T> {
    if (existing.requestHash !== requestHash) {
      throw new ReaderIdempotencyConflictError(
        "Idempotency key was already used with another Reader payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new ReaderSessionUnavailableError(
        "A matching Reader command is not recoverable yet.",
      );
    }
    let input: unknown;
    try {
      input = JSON.parse(existing.responseJson) as unknown;
    } catch {
      throw new ReaderSessionUnavailableError(
        "Stored Reader receipt is not valid JSON.",
      );
    }
    const parsed = await parseReceipt(input);
    if (!parsed.ok) {
      throw new ReaderSessionUnavailableError(
        "Stored Reader receipt violates its protocol.",
      );
    }
    return { ...parsed.receipt, duplicate: true };
  }
}
