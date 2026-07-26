import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import {
  REVIEW_MODALITY,
  REVIEW_QUEUE_MAX_OFFERS,
  REVIEW_QUEUE_PROTOCOL_VERSION,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type ReviewQueueCardV1,
  type ReviewQueueV1,
} from "../learning/reviewProtocol";
import type { D1Database, D1RunResult } from "./d1";
import {
  CURRENT_CONTENT_RELEASE_POLICY,
  isPromotedContentReleasePolicy,
  promotedCourseReleaseState,
  type ContentReleasePolicy,
} from "./contentReleasePolicy";
import { readCurrentLearningResetEpoch } from "./learningResetEpoch";

const MAX_RESET_READ_ATTEMPTS = 2;

export class ReviewQueueUnavailableError extends Error {
  readonly code = "REVIEW_QUEUE_UNAVAILABLE";

  constructor(
    message = "The review queue is unavailable for the exact released enrollment.",
  ) {
    super(message);
    this.name = "ReviewQueueUnavailableError";
  }
}

export class ReviewQueueIntegrityError extends Error {
  readonly code = "REVIEW_QUEUE_INTEGRITY_ERROR";

  constructor(message = "Stored review cards cannot form a safe queue.") {
    super(message);
    this.name = "ReviewQueueIntegrityError";
  }
}

export class ReviewQueueResetRaceError extends Error {
  readonly code = "REVIEW_QUEUE_RESET_RACE";

  constructor() {
    super("The learning reset epoch changed while reading the review queue.");
    this.name = "ReviewQueueResetRaceError";
  }
}

type EnrollmentRow = { enrollmentId: string };

type ReviewCardRow = {
  cardId: string;
  cardRevision: number;
  enrollmentId: string;
  wordId: string;
  wordVersion: string;
  modality: string;
  dueAt: number;
  schedulerVersion: string;
  activationLessonId: string;
  activationLessonVersion: string;
};

const rows = <T>(result: D1RunResult<T> | undefined, label: string): T[] => {
  if (!result?.success || !Array.isArray(result.results)) {
    throw new ReviewQueueIntegrityError(`Unable to read ${label}.`);
  }
  return result.results;
};

const safePositiveInteger = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 1;

const safeTimestamp = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && !Number.isNaN(new Date(value).getTime());

const releasedReviewActivations = RELEASED_LESSONS.flatMap((lesson) =>
  lesson.wordIds.map((wordId) => ({
    lessonId: lesson.id,
    lessonVersion: `${lesson.contentVersion}:${lesson.id}:1`,
    wordId,
  }))
);

const releasedReviewActivationsJson = JSON.stringify(
  releasedReviewActivations,
);

const releasedReviewActivationKeys = new Set(
  releasedReviewActivations.map(
    ({ lessonId, lessonVersion, wordId }) =>
      `${lessonId}\u0000${lessonVersion}\u0000${wordId}`,
  ),
);

const isReleasedReviewActivation = (row: ReviewCardRow) =>
  releasedReviewActivationKeys.has(
    `${row.activationLessonId}\u0000${row.activationLessonVersion}\u0000${row.wordId}`,
  );

export class ReviewQueueRepository {
  constructor(
    private readonly database: D1Database,
    private readonly releasePolicy: ContentReleasePolicy =
      CURRENT_CONTENT_RELEASE_POLICY,
    private readonly readResetEpoch = readCurrentLearningResetEpoch,
  ) {}

  async read(
    userId: string,
    now = Date.now(),
  ): Promise<ReviewQueueV1> {
    const releaseState = promotedCourseReleaseState(this.releasePolicy);
    if (
      !isPromotedContentReleasePolicy(this.releasePolicy)
      || releaseState === null
    ) {
      throw new ReviewQueueUnavailableError(
        "The immutable current content package has not passed promotion gates.",
      );
    }
    if (!userId || !safeTimestamp(now)) {
      throw new ReviewQueueIntegrityError("Review queue scope is invalid.");
    }

    for (let attempt = 0; attempt < MAX_RESET_READ_ATTEMPTS; attempt += 1) {
      const resetEpoch = await this.readResetEpoch(this.database, userId);
      try {
        const queue = await this.readAtEpoch(
          userId,
          resetEpoch,
          now,
          releaseState,
        );
        if (
          await this.readResetEpoch(this.database, userId)
            === resetEpoch
        ) return queue;
      } catch (error) {
        if (
          await this.readResetEpoch(this.database, userId)
            === resetEpoch
        ) throw error;
      }
    }
    throw new ReviewQueueResetRaceError();
  }

  private async readAtEpoch(
    userId: string,
    resetEpoch: number,
    now: number,
    releaseState: "beta" | "published",
  ): Promise<ReviewQueueV1> {
    const enrollmentBindings = [
      userId,
      CONTENT_VERSION,
      CONTENT_VERSION,
      CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState,
    ];
    const eligibleEnrollmentSql = `
      enrollment.user_id = ?
      AND enrollment.course_version_id = ?
      AND enrollment.status = 'active'
      AND course.id = enrollment.course_version_id
      AND course.id = ?
      AND course.manifest_hash = ?
      AND course.release_state = ?
      AND course.linguistic_review_status = 'approved'`;
    const results = await this.database.batch([
      this.database.prepare(
        `SELECT enrollment.id AS enrollmentId
         FROM enrollments enrollment
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         WHERE ${eligibleEnrollmentSql}
         LIMIT 2`,
      ).bind(...enrollmentBindings),
      this.database.prepare(
        `SELECT card.id AS cardId, card.revision AS cardRevision,
                card.enrollment_id AS enrollmentId,
                card.knowledge_item_id AS wordId,
                card.knowledge_item_version AS wordVersion,
                card.modality AS modality, card.due_at AS dueAt,
                card.scheduler_version AS schedulerVersion,
                activation.lesson_id AS activationLessonId,
                activation.lesson_version AS activationLessonVersion
         FROM fsrs_cards card
         INNER JOIN lesson_sessions activation
           ON activation.user_id = card.user_id
          AND activation.id = card.activation_session_id
          AND activation.reset_epoch = card.reset_epoch
          AND activation.enrollment_id = card.enrollment_id
          AND activation.content_version = card.content_version
          AND activation.status = 'submitted'
          AND activation.passed = 1
          AND EXISTS (
            SELECT 1
            FROM json_each(?) released_activation
            WHERE json_extract(released_activation.value, '$.lessonId')
                    = activation.lesson_id
              AND json_extract(released_activation.value, '$.lessonVersion')
                    = activation.lesson_version
              AND json_extract(released_activation.value, '$.wordId')
                    = card.knowledge_item_id
          )
         INNER JOIN enrollments enrollment
           ON enrollment.user_id = card.user_id
          AND enrollment.id = card.enrollment_id
         INNER JOIN course_versions course
           ON course.id = enrollment.course_version_id
         WHERE card.user_id = ?
           AND card.reset_epoch = ?
           AND card.content_version = ?
           AND card.knowledge_item_type = 'vocabulary'
           AND card.modality = ?
           AND card.scheduler_version = ?
           AND card.due_at <= ?
           AND ${eligibleEnrollmentSql}
         ORDER BY card.due_at ASC, card.id ASC
         LIMIT ?`,
      ).bind(
        releasedReviewActivationsJson,
        userId,
        resetEpoch,
        CONTENT_VERSION,
        REVIEW_MODALITY,
        REVIEW_SCHEDULER_VERSION,
        now,
        ...enrollmentBindings,
        REVIEW_QUEUE_MAX_OFFERS,
      ),
    ]);
    if (results.length !== 2) {
      throw new ReviewQueueIntegrityError(
        "Review queue query returned an incomplete result set.",
      );
    }
    const enrollmentRows = rows(
      results[0] as D1RunResult<EnrollmentRow>,
      "the current review enrollment",
    );
    const cardRows = rows(
      results[1] as D1RunResult<ReviewCardRow>,
      "due review cards",
    );
    if (enrollmentRows.length !== 1) {
      throw new ReviewQueueUnavailableError(
        "An exact active released enrollment is required for review.",
      );
    }

    const cardIds = new Set<string>();
    const wordIds = new Set<string>();
    const cards: ReviewQueueCardV1[] = cardRows.map((row) => {
      if (
        !row.cardId
        || cardIds.has(row.cardId)
        || !safePositiveInteger(row.cardRevision)
        || row.enrollmentId !== enrollmentRows[0].enrollmentId
        || !RELEASED_WORD_BY_ID.has(row.wordId)
        || wordIds.has(row.wordId)
        || row.wordVersion !== reviewWordVersion(row.wordId)
        || row.modality !== REVIEW_MODALITY
        || !safeTimestamp(row.dueAt)
        || row.dueAt > now
        || row.schedulerVersion !== REVIEW_SCHEDULER_VERSION
        || !isReleasedReviewActivation(row)
      ) {
        throw new ReviewQueueIntegrityError();
      }
      cardIds.add(row.cardId);
      wordIds.add(row.wordId);
      return {
        cardId: row.cardId,
        cardRevision: row.cardRevision,
        wordId: row.wordId,
        wordVersion: row.wordVersion,
        modality: REVIEW_MODALITY,
        dueAt: new Date(row.dueAt).toISOString(),
        schedulerVersion: REVIEW_SCHEDULER_VERSION,
      };
    });

    return {
      protocolVersion: REVIEW_QUEUE_PROTOCOL_VERSION,
      resetEpoch,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      generatedAt: new Date(now).toISOString(),
      cards,
    };
  }
}
