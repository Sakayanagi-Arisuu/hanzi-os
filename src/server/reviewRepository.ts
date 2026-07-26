import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import {
  hashGradeReviewCommand,
  REVIEW_IDEMPOTENCY_SCOPE,
  REVIEW_MODALITY,
  REVIEW_PROTOCOL_VERSION,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type GradeReviewCommandV1,
  type GradeReviewReceiptV1,
} from "../learning/reviewProtocol";
import type { D1Database, D1RunResult } from "./d1";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  promotedCourseReleaseState,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
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
  advanceAuthoritativeReviewCard,
  canonicalReviewCardState,
  type AuthoritativeReviewCardState,
} from "./reviewScheduler";

export class ReviewGradeIdempotencyConflictError extends Error {
  readonly code = "REVIEW_GRADE_IDEMPOTENCY_CONFLICT";
}

export class ReviewGradeDeviceSequenceConflictError extends Error {
  readonly code = "REVIEW_GRADE_DEVICE_SEQUENCE_CONFLICT";
}

export class ReviewCardRevisionConflictError extends Error {
  readonly code = "REVIEW_CARD_REVISION_CONFLICT";
}

export class ReviewGradeUnavailableError extends Error {
  readonly code = "REVIEW_GRADE_UNAVAILABLE";
}

export class ReviewGradeIntegrityError extends Error {
  readonly code = "REVIEW_GRADE_INTEGRITY_ERROR";
}

type ExistingIdempotency = {
  requestHash: string;
  resetEpoch: number | null;
  status: string;
  responseJson: string | null;
};

type CardContext = {
  cardId: string;
  enrollmentId: string;
  activationSessionId: string | null;
  resetEpoch: number;
  contentVersion: string;
  wordId: string;
  wordVersion: string;
  modality: string;
  schedulerVersion: string;
  dueAt: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReviewAt: number | null;
  revision: number;
  lessonId: string;
  lessonVersion: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const safeTimestamp = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && !Number.isNaN(new Date(value).getTime());

const safeNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const safeNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const safePositiveInteger = (value: unknown): value is number =>
  safeNonNegativeInteger(value) && value >= 1;

const canonicalTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 40) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const STORED_RECEIPT_KEYS = new Set([
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

const parseStoredReceipt = (
  raw: string,
  command: GradeReviewCommandV1,
): GradeReviewReceiptV1 => {
  const value: unknown = JSON.parse(raw);
  if (
    !isRecord(value)
    || Object.keys(value).length !== STORED_RECEIPT_KEYS.size
    || Object.keys(value).some((key) => !STORED_RECEIPT_KEYS.has(key))
    || value.protocolVersion !== REVIEW_PROTOCOL_VERSION
    || value.idempotencyKey !== command.idempotencyKey
    || value.duplicate !== false
    || typeof value.reviewLogId !== "string"
    || value.reviewLogId.length < 1
    || value.reviewLogId.length > 160
    || value.cardId !== command.cardId
    || value.wordId !== command.wordId
    || value.wordVersion !== command.wordVersion
    || !safePositiveInteger(value.previousCardRevision)
    || value.previousCardRevision !== command.expectedCardRevision
    || value.cardRevision !== value.previousCardRevision + 1
    || value.resetEpoch !== command.resetEpoch
    || value.contentVersion !== CONTENT_VERSION
    || value.schedulerVersion !== REVIEW_SCHEDULER_VERSION
    || typeof value.rating !== "number"
    || !Number.isInteger(value.rating)
    || value.rating !== command.rating
    || !canonicalTimestamp(value.scheduledAt)
    || !canonicalTimestamp(value.reviewedAt)
    || !canonicalTimestamp(value.nextDueAt)
    || Date.parse(value.scheduledAt) > Date.parse(value.reviewedAt)
    || Date.parse(value.reviewedAt) > Date.parse(value.nextDueAt)
    || value.verification !== "server-scheduled-self-rating"
    || value.masteryEligible !== false
  ) {
    throw new ReviewGradeIntegrityError(
      "Stored review-grade receipt is invalid.",
    );
  }
  return value as GradeReviewReceiptV1;
};

const committedExactlyOnce = (results: Array<D1RunResult>) =>
  results.length === 9
  && results.every((result) =>
    result.success && result.meta?.changes === 1
  );

export class ReviewRepository {
  constructor(
    private readonly database: D1Database,
    private readonly releasePolicy: ContentReleasePolicy =
      CURRENT_CONTENT_RELEASE_POLICY,
    private readonly now: () => number = Date.now,
  ) {}

  async grade(
    userId: string,
    command: GradeReviewCommandV1,
  ): Promise<GradeReviewReceiptV1> {
    const requestHash = await hashGradeReviewCommand(command);
    await requireCurrentLearningResetEpoch(
      this.database,
      userId,
      command.resetEpoch,
    );
    const existing = await this.getIdempotency(
      userId,
      command.idempotencyKey,
    );
    if (existing) return this.resolveExisting(existing, requestHash, command);

    const releaseState = this.requirePromotedPackage();
    const timestamp = Math.floor(this.now());
    if (!safeTimestamp(timestamp)) {
      throw new ReviewGradeIntegrityError(
        "Server review timestamp is invalid.",
      );
    }
    const current = await this.requireDueCard(
      userId,
      command,
      timestamp,
      releaseState,
    );
    if (current.revision !== command.expectedCardRevision) {
      throw new ReviewCardRevisionConflictError(
        "The review card changed after this queue offer was issued.",
      );
    }
    const deviceRecordId = await this.registerDevice(userId, command, timestamp);
    const sequenceOwner = await this.database.prepare(
      `SELECT idempotency_key AS idempotencyKey
       FROM idempotency_records
       WHERE user_id = ? AND device_id = ? AND device_sequence = ?
       LIMIT 1`,
    ).bind(
      userId,
      deviceRecordId,
      command.deviceSequence,
    ).first<{ idempotencyKey: string }>();
    if (sequenceOwner && sequenceOwner.idempotencyKey !== command.idempotencyKey) {
      throw new ReviewGradeDeviceSequenceConflictError(
        "Device sequence already belongs to another operation.",
      );
    }

    const preCard = this.cardState(current);
    const postCard = advanceAuthoritativeReviewCard(
      preCard,
      timestamp,
      command.rating,
    );
    const idempotencyRecordId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const reviewLogId = crypto.randomUUID();
    const outboxId = crypto.randomUUID();
    const scheduledAt = new Date(preCard.dueAt).toISOString();
    const reviewedAt = new Date(timestamp).toISOString();
    const nextDueAt = new Date(postCard.dueAt).toISOString();
    const receipt: GradeReviewReceiptV1 = {
      protocolVersion: REVIEW_PROTOCOL_VERSION,
      idempotencyKey: command.idempotencyKey,
      duplicate: false,
      reviewLogId,
      cardId: current.cardId,
      wordId: current.wordId,
      wordVersion: current.wordVersion,
      previousCardRevision: preCard.revision,
      cardRevision: postCard.revision,
      resetEpoch: command.resetEpoch,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      rating: command.rating,
      scheduledAt,
      reviewedAt,
      nextDueAt,
      verification: "server-scheduled-self-rating",
      masteryEligible: false,
    };
    const responseJson = JSON.stringify(receipt);
    const responsePayload = JSON.stringify({ rating: command.rating });
    const evidenceMetadata = JSON.stringify({
      cardId: current.cardId,
      previousCardRevision: preCard.revision,
      cardRevision: postCard.revision,
      rating: command.rating,
      verification: "server-scheduled-self-rating",
      masteryEligible: false,
    });
    const preCardJson = canonicalReviewCardState(preCard);
    const postCardJson = canonicalReviewCardState(postCard);
    const eventPayload = encodeOutboxEventPayload({
      eventType: "review.graded",
      aggregateId: reviewLogId,
      resetEpoch: command.resetEpoch,
      payload: {
        reviewLogId,
        attemptId,
        cardId: current.cardId,
        resetEpoch: command.resetEpoch,
        contentVersion: CONTENT_VERSION,
        contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
        wordId: current.wordId,
        wordVersion: current.wordVersion,
        modality: REVIEW_MODALITY,
        schedulerVersion: REVIEW_SCHEDULER_VERSION,
        rating: command.rating,
        previousCardRevision: preCard.revision,
        cardRevision: postCard.revision,
        scheduledAt,
        reviewedAt,
        nextDueAt,
        verification: "server-scheduled-self-rating",
        masteryEligible: false,
      },
    });

    const guard = `
      card.user_id = ?
      AND card.id = ?
      AND card.enrollment_id = ?
      AND card.activation_session_id = ?
      AND card.reset_epoch = ?
      AND card.content_version = ?
      AND card.knowledge_item_type = 'vocabulary'
      AND card.knowledge_item_id = ?
      AND card.knowledge_item_version = ?
      AND card.modality = ?
      AND card.scheduler_version = ?
      AND card.due_at = ?
      AND card.due_at <= ?
      AND card.revision = ?
      AND activation.user_id = card.user_id
      AND activation.id = card.activation_session_id
      AND activation.enrollment_id = card.enrollment_id
      AND activation.reset_epoch = card.reset_epoch
      AND activation.content_version = card.content_version
      AND activation.lesson_id = ?
      AND activation.lesson_version = ?
      AND activation.status = 'submitted'
      AND activation.passed = 1
      AND enrollment.user_id = card.user_id
      AND enrollment.id = card.enrollment_id
      AND enrollment.status = 'active'
      AND enrollment.course_version_id = ?
      AND course.id = enrollment.course_version_id
      AND course.manifest_hash = ?
      AND course.release_state = ?
      AND course.linguistic_review_status = 'approved'
      AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`;
    const guardBindings = [
      userId,
      current.cardId,
      current.enrollmentId,
      current.activationSessionId,
      command.resetEpoch,
      CONTENT_VERSION,
      current.wordId,
      current.wordVersion,
      REVIEW_MODALITY,
      REVIEW_SCHEDULER_VERSION,
      preCard.dueAt,
      timestamp,
      command.expectedCardRevision,
      current.lessonId,
      current.lessonVersion,
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState,
      userId,
      command.resetEpoch,
    ];
    const statements = [
      this.database.prepare(
        `INSERT INTO idempotency_records (
           id, user_id, device_id, device_sequence, reset_epoch, scope,
           idempotency_key, request_hash, status, response_status,
           response_json, created_at, updated_at, completed_at
         )
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 201, ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1
           FROM fsrs_cards card
           INNER JOIN lesson_sessions activation
             ON activation.user_id = card.user_id
            AND activation.id = card.activation_session_id
            AND activation.reset_epoch = card.reset_epoch
           INNER JOIN enrollments enrollment
             ON enrollment.user_id = card.user_id
            AND enrollment.id = card.enrollment_id
           INNER JOIN course_versions course
             ON course.id = enrollment.course_version_id
           WHERE ${guard}
         )`,
      ).bind(
        idempotencyRecordId,
        userId,
        deviceRecordId,
        command.deviceSequence,
        command.resetEpoch,
        REVIEW_IDEMPOTENCY_SCOPE,
        command.idempotencyKey,
        requestHash,
        responseJson,
        timestamp,
        timestamp,
        timestamp,
        ...guardBindings,
      ),
      this.database.prepare(
        `UPDATE fsrs_cards
         SET due_at = ?, stability = ?, difficulty = ?, elapsed_days = ?,
             scheduled_days = ?, learning_steps = ?, reps = ?, lapses = ?,
             state = ?, last_review_at = ?, revision = ?, updated_at = ?
         WHERE user_id = ? AND id = ? AND reset_epoch = ?
           AND revision = ? AND due_at = ?
           AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE id = ? AND user_id = ? AND reset_epoch = ?
               AND scope = ? AND request_hash = ?
           )`,
      ).bind(
        postCard.dueAt,
        postCard.stability,
        postCard.difficulty,
        postCard.elapsedDays,
        postCard.scheduledDays,
        postCard.learningSteps,
        postCard.reps,
        postCard.lapses,
        postCard.state,
        postCard.lastReviewAt,
        postCard.revision,
        timestamp,
        userId,
        current.cardId,
        command.resetEpoch,
        preCard.revision,
        preCard.dueAt,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        REVIEW_IDEMPOTENCY_SCOPE,
        requestHash,
      ),
      this.database.prepare(
        `INSERT INTO learning_attempts (
           id, user_id, enrollment_id, session_id, device_id, device_sequence,
           idempotency_record_id, schema_version, reset_epoch, content_version,
           activity_id, activity_version, source, method, skill, response_json,
           outcome, score, used_hint, prior_exposure, required_for_pass,
           scoring_version, occurred_at, received_at
         )
         SELECT ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, 'review',
                'fsrs-rating', 'vocabulary', ?, 'unverified', NULL, 0, 1, 0,
                ?, ?, ?
         FROM fsrs_cards card
         WHERE card.user_id = ? AND card.id = ? AND card.reset_epoch = ?
           AND card.revision = ? AND card.updated_at = ?
           AND EXISTS (
             SELECT 1 FROM idempotency_records
             WHERE id = ? AND user_id = ? AND reset_epoch = ? AND scope = ?
           )`,
      ).bind(
        attemptId,
        userId,
        current.enrollmentId,
        deviceRecordId,
        command.deviceSequence,
        idempotencyRecordId,
        command.resetEpoch,
        CONTENT_VERSION,
        `review:${current.wordId}`,
        current.wordVersion,
        responsePayload,
        REVIEW_SCHEDULER_VERSION,
        timestamp,
        timestamp,
        userId,
        current.cardId,
        command.resetEpoch,
        postCard.revision,
        timestamp,
        idempotencyRecordId,
        userId,
        command.resetEpoch,
        REVIEW_IDEMPOTENCY_SCOPE,
      ),
      this.database.prepare(
        `INSERT INTO learning_evidence (
           id, user_id, enrollment_id, attempt_id, session_id, schema_version,
           reset_epoch, policy_version, content_version, activity_id,
           activity_version, source, method, skill, outcome, score, verified,
           mastery_eligible, metadata_json, occurred_at, recorded_at
         )
         SELECT ?, ?, ?, attempt.id, NULL, 1, ?, ?, ?, attempt.activity_id,
                attempt.activity_version, 'review', 'fsrs-rating',
                'vocabulary', 'unverified', NULL, 0, 0, ?, ?, ?
         FROM learning_attempts attempt
         WHERE attempt.id = ? AND attempt.user_id = ?
           AND attempt.reset_epoch = ? AND attempt.idempotency_record_id = ?`,
      ).bind(
        evidenceId,
        userId,
        current.enrollmentId,
        command.resetEpoch,
        REVIEW_SCHEDULER_VERSION,
        CONTENT_VERSION,
        evidenceMetadata,
        timestamp,
        timestamp,
        attemptId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
      ),
      this.database.prepare(
        `INSERT INTO review_logs (
           id, user_id, card_id, attempt_id, idempotency_record_id,
           reset_epoch, rating, scheduler_version, scheduled_at, reviewed_at,
           received_at, duration_ms, pre_card_json, post_card_json
         )
         SELECT ?, ?, ?, attempt.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         FROM learning_attempts attempt
         WHERE attempt.id = ? AND attempt.user_id = ?
           AND attempt.reset_epoch = ? AND attempt.idempotency_record_id = ?`,
      ).bind(
        reviewLogId,
        userId,
        current.cardId,
        idempotencyRecordId,
        command.resetEpoch,
        command.rating,
        REVIEW_SCHEDULER_VERSION,
        preCard.dueAt,
        timestamp,
        timestamp,
        command.durationMs ?? null,
        preCardJson,
        postCardJson,
        attemptId,
        userId,
        command.resetEpoch,
        idempotencyRecordId,
      ),
      this.database.prepare(
        `UPDATE enrollments
         SET last_activity_at = ?, revision = revision + 1
         WHERE user_id = ? AND id = ?
           AND EXISTS (
             SELECT 1 FROM review_logs
             WHERE id = ? AND user_id = ? AND reset_epoch = ?
           )`,
      ).bind(
        timestamp,
        userId,
        current.enrollmentId,
        reviewLogId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO outbox_events (
           id, user_id, aggregate_type, aggregate_id, event_type,
           schema_version, reset_epoch, payload_json, status, attempts,
           available_at, created_at
         )
         SELECT ?, ?, 'review_log', log.id, 'review.graded', 1, ?, ?,
                'pending', 0, ?, ?
         FROM review_logs log
         WHERE log.id = ? AND log.user_id = ? AND log.reset_epoch = ?`,
      ).bind(
        outboxId,
        userId,
        command.resetEpoch,
        eventPayload,
        timestamp,
        timestamp,
        reviewLogId,
        userId,
        command.resetEpoch,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (
           user_id, reset_epoch, entity_type, entity_id, revision,
           operation_id, operation, payload_json, occurred_at
         )
         SELECT ?, ?, ?, card.id, card.revision, ?, 'upsert', NULL, ?
         FROM fsrs_cards card
         WHERE card.id = ? AND card.user_id = ? AND card.reset_epoch = ?
           AND card.revision = ?
           AND EXISTS (
             SELECT 1 FROM review_logs log
             WHERE log.id = ? AND log.user_id = card.user_id
               AND log.card_id = card.id
               AND log.reset_epoch = card.reset_epoch
           )`,
      ).bind(
        userId,
        command.resetEpoch,
        NORMALIZED_LEARNING_CHANGE_ENTITY.fsrsCard,
        normalizedLearningChangeOperationId.reviewCardGraded(
          command.idempotencyKey,
        ),
        timestamp,
        current.cardId,
        userId,
        command.resetEpoch,
        postCard.revision,
        reviewLogId,
      ),
      this.database.prepare(
        `INSERT INTO sync_changes (
           user_id, reset_epoch, entity_type, entity_id, revision,
           operation_id, operation, payload_json, occurred_at
         )
         SELECT ?, ?, ?, log.id, 1, ?, 'upsert', NULL, ?
         FROM review_logs log
         WHERE log.id = ? AND log.user_id = ? AND log.reset_epoch = ?`,
      ).bind(
        userId,
        command.resetEpoch,
        NORMALIZED_LEARNING_CHANGE_ENTITY.reviewLog,
        normalizedLearningChangeOperationId.reviewLogRecorded(
          command.idempotencyKey,
        ),
        timestamp,
        reviewLogId,
        userId,
        command.resetEpoch,
      ),
    ];

    try {
      const results = await this.database.batch(statements);
      if (!committedExactlyOnce(results)) {
        throw new ReviewCardRevisionConflictError(
          "The review card changed before the grade committed.",
        );
      }
      return receipt;
    } catch (error) {
      const winner = await this.getIdempotency(
        userId,
        command.idempotencyKey,
      );
      if (winner) return this.resolveExisting(winner, requestHash, command);
      const conflictingSequence = await this.database.prepare(
        `SELECT id
         FROM idempotency_records
         WHERE user_id = ? AND device_id = ? AND device_sequence = ?
         LIMIT 1`,
      ).bind(
        userId,
        deviceRecordId,
        command.deviceSequence,
      ).first<{ id: string }>();
      if (conflictingSequence) {
        throw new ReviewGradeDeviceSequenceConflictError(
          "Device sequence already belongs to another operation.",
        );
      }
      await requireCurrentLearningResetEpoch(
        this.database,
        userId,
        command.resetEpoch,
      );
      const latestReleaseState = this.requirePromotedPackage();
      if (latestReleaseState !== releaseState) {
        throw new ReviewGradeUnavailableError(
          "The released review package changed before the grade committed.",
        );
      }
      const latestRevision = await this.database.prepare(
        `SELECT revision
         FROM fsrs_cards
         WHERE user_id = ? AND id = ? AND reset_epoch = ?
         LIMIT 1`,
      ).bind(
        userId,
        command.cardId,
        command.resetEpoch,
      ).first<{ revision: number }>();
      if (
        latestRevision
        && latestRevision.revision !== command.expectedCardRevision
      ) {
        throw new ReviewCardRevisionConflictError(
          "The review card changed before the grade committed.",
        );
      }
      const latest = await this.requireDueCard(
        userId,
        command,
        timestamp,
        latestReleaseState,
      );
      if (latest.revision !== command.expectedCardRevision) {
        throw new ReviewCardRevisionConflictError(
          "The review card changed before the grade committed.",
        );
      }
      if (
        latest.cardId !== current.cardId
        || latest.enrollmentId !== current.enrollmentId
        || latest.activationSessionId !== current.activationSessionId
        || latest.resetEpoch !== current.resetEpoch
        || latest.contentVersion !== current.contentVersion
        || latest.wordId !== current.wordId
        || latest.wordVersion !== current.wordVersion
        || latest.modality !== current.modality
        || latest.schedulerVersion !== current.schedulerVersion
        || latest.dueAt !== current.dueAt
        || latest.lessonId !== current.lessonId
        || latest.lessonVersion !== current.lessonVersion
      ) {
        throw new ReviewGradeUnavailableError(
          "The exact released review-card binding changed before commit.",
        );
      }
      if (
        error instanceof ReviewGradeIdempotencyConflictError
        || error instanceof ReviewGradeDeviceSequenceConflictError
        || error instanceof ReviewGradeUnavailableError
        || error instanceof ReviewGradeIntegrityError
      ) {
        throw error;
      }
      throw new ReviewGradeUnavailableError(
        "The exact due review card or released enrollment changed before commit.",
      );
    }
  }

  private requirePromotedPackage() {
    const releaseState = promotedCourseReleaseState(this.releasePolicy);
    if (
      !isPromotedContentReleasePolicy(this.releasePolicy)
      || releaseState === null
    ) {
      throw new ReviewGradeUnavailableError(
        "The immutable current content package has not passed promotion gates.",
      );
    }
    return releaseState;
  }

  private async requireDueCard(
    userId: string,
    command: GradeReviewCommandV1,
    timestamp: number,
    releaseState: "beta" | "published",
  ): Promise<CardContext> {
    const card = await this.database.prepare(
      `SELECT card.id AS cardId, card.enrollment_id AS enrollmentId,
              card.activation_session_id AS activationSessionId,
              card.reset_epoch AS resetEpoch,
              card.content_version AS contentVersion,
              card.knowledge_item_id AS wordId,
              card.knowledge_item_version AS wordVersion,
              card.modality AS modality,
              card.scheduler_version AS schedulerVersion,
              card.due_at AS dueAt, card.stability AS stability,
              card.difficulty AS difficulty,
              card.elapsed_days AS elapsedDays,
              card.scheduled_days AS scheduledDays,
              card.learning_steps AS learningSteps, card.reps AS reps,
              card.lapses AS lapses, card.state AS state,
              card.last_review_at AS lastReviewAt,
              card.revision AS revision,
              activation.lesson_id AS lessonId,
              activation.lesson_version AS lessonVersion
       FROM fsrs_cards card
       INNER JOIN lesson_sessions activation
         ON activation.user_id = card.user_id
        AND activation.id = card.activation_session_id
        AND activation.reset_epoch = card.reset_epoch
        AND activation.enrollment_id = card.enrollment_id
        AND activation.content_version = card.content_version
        AND activation.status = 'submitted'
        AND activation.passed = 1
       INNER JOIN enrollments enrollment
         ON enrollment.user_id = card.user_id
        AND enrollment.id = card.enrollment_id
        AND enrollment.status = 'active'
       INNER JOIN course_versions course
         ON course.id = enrollment.course_version_id
       WHERE card.user_id = ? AND card.id = ?
         AND card.reset_epoch = ? AND card.content_version = ?
         AND card.knowledge_item_type = 'vocabulary'
         AND card.knowledge_item_id = ?
         AND card.knowledge_item_version = ?
         AND card.modality = ? AND card.scheduler_version = ?
         AND card.due_at <= ?
         AND enrollment.course_version_id = ?
         AND course.manifest_hash = ?
         AND course.release_state = ?
         AND course.linguistic_review_status = 'approved'
       LIMIT 1`,
    ).bind(
      userId,
      command.cardId,
      command.resetEpoch,
      CONTENT_VERSION,
      command.wordId,
      command.wordVersion,
      REVIEW_MODALITY,
      REVIEW_SCHEDULER_VERSION,
      timestamp,
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState,
    ).first<CardContext>();
    if (!card) {
      throw new ReviewGradeUnavailableError(
        "A due tenant-owned card in the exact released enrollment is required.",
      );
    }
    const lesson = LESSON_BY_ID.get(card.lessonId);
    const stateIsValid = (
      safeTimestamp(card.dueAt)
      && safeNonNegativeNumber(card.stability)
      && safeNonNegativeNumber(card.difficulty)
      && safeNonNegativeInteger(card.elapsedDays)
      && safeNonNegativeInteger(card.scheduledDays)
      && safeNonNegativeInteger(card.learningSteps)
      && safeNonNegativeInteger(card.reps)
      && safeNonNegativeInteger(card.lapses)
      && safeNonNegativeInteger(card.state)
      && card.state <= 3
      && (
        card.lastReviewAt === null
        || (
          safeTimestamp(card.lastReviewAt)
          && card.lastReviewAt <= timestamp
        )
      )
      && safePositiveInteger(card.revision)
    );
    if (
      !card.activationSessionId
      || card.resetEpoch !== command.resetEpoch
      || card.contentVersion !== CONTENT_VERSION
      || card.wordId !== command.wordId
      || card.wordVersion !== command.wordVersion
      || !RELEASED_WORD_BY_ID.has(card.wordId)
      || card.wordVersion !== reviewWordVersion(card.wordId)
      || card.modality !== REVIEW_MODALITY
      || card.schedulerVersion !== REVIEW_SCHEDULER_VERSION
      || card.dueAt > timestamp
      || !lesson
      || !["beta", "published"].includes(lesson.releaseState)
      || lesson.contentVersion !== CONTENT_VERSION
      || card.lessonVersion !== `${CONTENT_VERSION}:${lesson.id}:1`
      || !lesson.wordIds.includes(card.wordId)
      || !stateIsValid
    ) {
      throw new ReviewGradeIntegrityError(
        "Stored review card failed its release or scheduler binding.",
      );
    }
    return card;
  }

  private cardState(card: CardContext): AuthoritativeReviewCardState {
    return {
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      dueAt: card.dueAt,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsedDays: card.elapsedDays,
      scheduledDays: card.scheduledDays,
      learningSteps: card.learningSteps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      lastReviewAt: card.lastReviewAt,
      revision: card.revision,
    };
  }

  private async registerDevice(
    userId: string,
    command: GradeReviewCommandV1,
    timestamp: number,
  ) {
    const candidateDeviceId = crypto.randomUUID();
    await this.database.prepare(
      `INSERT INTO devices (
         id, user_id, installation_id, label, last_acked_cursor,
         created_at, last_seen_at
       ) VALUES (?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(user_id, installation_id) DO UPDATE SET
         label = excluded.label,
         last_seen_at = excluded.last_seen_at,
         revoked_at = NULL`,
    ).bind(
      candidateDeviceId,
      userId,
      command.installationId,
      command.deviceId,
      timestamp,
      timestamp,
    ).run();
    const device = await this.database.prepare(
      `SELECT id
       FROM devices
       WHERE user_id = ? AND installation_id = ?
       LIMIT 1`,
    ).bind(
      userId,
      command.installationId,
    ).first<{ id: string }>();
    if (!device) {
      throw new ReviewGradeUnavailableError(
        "Unable to register the review device.",
      );
    }
    return device.id;
  }

  private async getIdempotency(
    userId: string,
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
      REVIEW_IDEMPOTENCY_SCOPE,
      idempotencyKey,
    ).first<ExistingIdempotency>();
  }

  private resolveExisting(
    existing: ExistingIdempotency,
    requestHash: string,
    command: GradeReviewCommandV1,
  ): GradeReviewReceiptV1 {
    if (existing.requestHash !== requestHash) {
      throw new ReviewGradeIdempotencyConflictError(
        "Idempotency key was already used with another review payload.",
      );
    }
    if (existing.status !== "completed" || !existing.responseJson) {
      throw new ReviewGradeIntegrityError(
        "A matching review grade is not yet recoverable.",
      );
    }
    if (existing.resetEpoch !== command.resetEpoch) {
      throw new ReviewGradeIntegrityError(
        "Stored review-grade reset scope is invalid.",
      );
    }
    return {
      ...parseStoredReceipt(existing.responseJson, command),
      duplicate: true,
    };
  }
}
