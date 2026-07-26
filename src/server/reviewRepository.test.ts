import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
} from "../data/curriculum";
import {
  REVIEW_IDEMPOTENCY_SCOPE,
  REVIEW_MODALITY,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type GradeReviewCommandV1,
} from "../learning/reviewProtocol";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import type { ContentReleasePolicy } from "./contentReleasePolicy";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import {
  ReviewCardRevisionConflictError,
  ReviewGradeDeviceSequenceConflictError,
  ReviewGradeIdempotencyConflictError,
  ReviewGradeIntegrityError,
  ReviewGradeUnavailableError,
  ReviewRepository,
} from "./reviewRepository";
import { createAuthoritativeReviewCard } from "./reviewScheduler";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migrations = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];

  constructor(
    private readonly statement: StatementSync,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.parameters = values;
    return this;
  }

  private sqliteParameters() {
    return this.parameters as Array<
      string | number | bigint | Uint8Array | null
    >;
  }

  async first<T = Record<string, unknown>>(
    columnName?: string,
  ): Promise<T | null> {
    const row = this.statement.get(...this.sqliteParameters()) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return {
      success: true,
      results: this.statement.all(...this.sqliteParameters()) as T[],
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*SELECT\b/iu.test(this.query)) {
      return {
        success: true,
        results: this.statement.all(...this.sqliteParameters()) as T[],
      };
    }
    const result = this.statement.run(...this.sqliteParameters());
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

class SQLiteD1 implements D1Database {
  readonly database = new DatabaseSync(":memory:");
  beforeNextBatch: (() => void | Promise<void>) | null = null;

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migrations);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query), query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    const beforeBatch = this.beforeNextBatch;
    this.beforeNextBatch = null;
    await beforeBatch?.();
    this.database.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) {
        results.push(await statement.run<T>());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const NOW = Date.parse("2026-07-26T03:00:00.000Z");
const ACTIVATED_AT = NOW - 60_000;
const lesson = RELEASED_LESSONS[0];
const wordId = lesson.wordIds[0];
const otherWordId = RELEASED_LESSONS
  .flatMap((candidate) => candidate.wordIds)
  .find((candidate) => candidate !== wordId)!;
const incompatibleLesson = RELEASED_LESSONS.find(
  (candidate) => !candidate.wordIds.includes(wordId),
)!;
const cardId = "user-a-review-card";
const enrollmentId = "user-a-enrollment";
const sessionId = "user-a-session";

const promotedPolicy: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const unpromotedPolicy: ContentReleasePolicy = {
  ...promotedPolicy,
  lifecycle: "candidate",
  closedAlphaEligible: false,
  promotionChannel: null,
  promotionManifestSha256: null,
};

const command = (
  overrides: Partial<GradeReviewCommandV1> = {},
): GradeReviewCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "review-grade:repository:1",
  installationId: "review-installation",
  deviceId: "review-device",
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  cardId,
  wordId,
  wordVersion: reviewWordVersion(wordId),
  expectedCardRevision: 1,
  rating: 3,
  durationMs: 1_250,
  ...overrides,
});

const repositoryFor = (
  database: SQLiteD1,
  policy = promotedPolicy,
) => new ReviewRepository(database, policy, () => NOW);

const seedReviewAuthority = (
  database: SQLiteD1,
  userId = "user-a",
) => {
  const userEnrollmentId = `${userId}-enrollment`;
  const userSessionId = `${userId}-session`;
  const userCardId = `${userId}-review-card`;
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, ACTIVATED_AT, ACTIVATED_AT);
  database.database.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
  ).run(userId, ACTIVATED_AT, ACTIVATED_AT);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, published_at, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'beta', 'approved', ?, ?)",
  ).run(
    CONTENT_VERSION,
    CURRENT_CONTENT_MANIFEST_SHA256,
    ACTIVATED_AT,
    ACTIVATED_AT,
  );
  database.database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
  ).run(
    userEnrollmentId,
    userId,
    CONTENT_VERSION,
    ACTIVATED_AT,
    ACTIVATED_AT,
  );
  const openIdempotencyId = `${userId}-open-idempotency`;
  database.database.prepare(
    "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, ?, 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
  ).run(
    openIdempotencyId,
    userId,
    `${userId}-open-key`,
    ACTIVATED_AT,
    ACTIVATED_AT,
    ACTIVATED_AT,
  );
  database.database.prepare(
    `INSERT INTO lesson_sessions (
       id, user_id, enrollment_id, device_id, idempotency_record_id,
       schema_version, reset_epoch, content_version, lesson_id, lesson_version,
       expected_evidence_count, form_schema_version, form_script,
       form_manifest_json, form_manifest_hash, status, raw_score, gate_score,
       required_evidence_count, required_correct_count, passed, started_at,
       submitted_at, created_at
     ) VALUES (
       ?, ?, ?, NULL, ?, 1, 0, ?, ?, ?, 1, 1, 'simplified',
       '{"schemaVersion":1,"script":"simplified","activities":[]}', ?,
       'submitted', 100, 100, 1, 1, 1, ?, ?, ?
     )`,
  ).run(
    userSessionId,
    userId,
    userEnrollmentId,
    openIdempotencyId,
    CONTENT_VERSION,
    lesson.id,
    `${CONTENT_VERSION}:${lesson.id}:1`,
    `sha256:${"a".repeat(64)}`,
    ACTIVATED_AT,
    ACTIVATED_AT,
    ACTIVATED_AT,
  );
  const initialCard = createAuthoritativeReviewCard(ACTIVATED_AT);
  database.database.prepare(
    `INSERT INTO fsrs_cards (
       id, user_id, enrollment_id, activation_session_id, reset_epoch,
       content_version, knowledge_item_type, knowledge_item_id,
       knowledge_item_version, modality, scheduler_version, due_at,
       stability, difficulty, elapsed_days, scheduled_days, learning_steps,
       reps, lapses, state, last_review_at, revision, created_at, updated_at
     ) VALUES (
       ?, ?, ?, ?, 0, ?, 'vocabulary', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?
     )`,
  ).run(
    userCardId,
    userId,
    userEnrollmentId,
    userSessionId,
    CONTENT_VERSION,
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
    ACTIVATED_AT,
    ACTIVATED_AT,
  );
};

const reviewGraphCounts = (database: SQLiteD1) =>
  database.database.prepare(
    `SELECT
       (SELECT COUNT(*) FROM idempotency_records
          WHERE scope = ?) AS idempotencyCount,
       (SELECT COUNT(*) FROM learning_attempts
          WHERE source = 'review') AS attemptCount,
       (SELECT COUNT(*) FROM learning_evidence
          WHERE source = 'review') AS evidenceCount,
       (SELECT COUNT(*) FROM review_logs) AS reviewLogCount,
       (SELECT COUNT(*) FROM outbox_events
          WHERE event_type = 'review.graded') AS outboxCount,
       (SELECT COUNT(*) FROM sync_changes
          WHERE entity_type IN ('fsrs_card', 'review_log')) AS changeCount,
       (SELECT COUNT(*) FROM xp_ledger) AS xpCount`,
  ).get(REVIEW_IDEMPOTENCY_SCOPE) as Record<string, number>;

describe("server-authoritative review repository", () => {
  it("atomically writes the nine-step review graph without XP or mastery", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    const input = command();

    const receipt = await repositoryFor(database).grade("user-a", input);

    expect(receipt).toMatchObject({
      duplicate: false,
      cardId,
      wordId,
      wordVersion: reviewWordVersion(wordId),
      previousCardRevision: 1,
      cardRevision: 2,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      rating: 3,
      scheduledAt: new Date(ACTIVATED_AT).toISOString(),
      reviewedAt: new Date(NOW).toISOString(),
      verification: "server-scheduled-self-rating",
      masteryEligible: false,
    });
    expect(reviewGraphCounts(database)).toEqual({
      idempotencyCount: 1,
      attemptCount: 1,
      evidenceCount: 1,
      reviewLogCount: 1,
      outboxCount: 1,
      changeCount: 2,
      xpCount: 0,
    });
    expect(database.database.prepare(
      `SELECT source, method, skill, outcome, score, prior_exposure AS priorExposure,
              required_for_pass AS requiredForPass, scoring_version AS scoringVersion
       FROM learning_attempts WHERE source = 'review'`,
    ).get()).toEqual({
      source: "review",
      method: "fsrs-rating",
      skill: "vocabulary",
      outcome: "unverified",
      score: null,
      priorExposure: 1,
      requiredForPass: 0,
      scoringVersion: REVIEW_SCHEDULER_VERSION,
    });
    expect(database.database.prepare(
      `SELECT outcome, score, verified,
              mastery_eligible AS masteryEligible, metadata_json AS metadataJson
       FROM learning_evidence WHERE source = 'review'`,
    ).get()).toMatchObject({
      outcome: "unverified",
      score: null,
      verified: 0,
      masteryEligible: 0,
    });
    const reviewLog = database.database.prepare(
      `SELECT id, card_id AS cardId, attempt_id AS attemptId,
              rating, scheduler_version AS schedulerVersion,
              scheduled_at AS scheduledAt, reviewed_at AS reviewedAt,
              pre_card_json AS preCardJson, post_card_json AS postCardJson
       FROM review_logs`,
    ).get() as Record<string, unknown>;
    expect(reviewLog).toMatchObject({
      id: receipt.reviewLogId,
      cardId,
      rating: 3,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      scheduledAt: ACTIVATED_AT,
      reviewedAt: NOW,
    });
    expect(JSON.parse(String(reviewLog.preCardJson))).toMatchObject({
      revision: 1,
    });
    expect(JSON.parse(String(reviewLog.postCardJson))).toMatchObject({
      revision: 2,
    });
    expect(database.database.prepare(
      `SELECT revision, due_at AS dueAt, last_review_at AS lastReviewAt
       FROM fsrs_cards WHERE id = ?`,
    ).get(cardId)).toEqual({
      revision: 2,
      dueAt: Date.parse(receipt.nextDueAt),
      lastReviewAt: NOW,
    });
    const outbox = database.database.prepare(
      `SELECT aggregate_type AS aggregateType, aggregate_id AS aggregateId,
              reset_epoch AS resetEpoch, payload_json AS payloadJson
       FROM outbox_events WHERE event_type = 'review.graded'`,
    ).get() as Record<string, unknown>;
    expect(outbox).toMatchObject({
      aggregateType: "review_log",
      aggregateId: receipt.reviewLogId,
      resetEpoch: 0,
    });
    expect(JSON.parse(String(outbox.payloadJson))).toMatchObject({
      reviewLogId: receipt.reviewLogId,
      cardId,
      wordId,
      wordVersion: reviewWordVersion(wordId),
      rating: 3,
      previousCardRevision: 1,
      cardRevision: 2,
      verification: "server-scheduled-self-rating",
      masteryEligible: false,
    });
    expect(database.database.prepare(
      `SELECT entity_type AS entityType, entity_id AS entityId, revision,
              operation_id AS operationId, payload_json AS payloadJson
       FROM sync_changes ORDER BY entity_type`,
    ).all()).toEqual([
      {
        entityType: "fsrs_card",
        entityId: cardId,
        revision: 2,
        operationId: `normalized:review-card-grade:${input.idempotencyKey}`,
        payloadJson: null,
      },
      {
        entityType: "review_log",
        entityId: receipt.reviewLogId,
        revision: 1,
        operationId: `normalized:review-log:${input.idempotencyKey}`,
        payloadJson: null,
      },
    ]);
    expect(database.database.prepare(
      "SELECT revision, last_activity_at AS lastActivityAt FROM enrollments WHERE id = ?",
    ).get(enrollmentId)).toEqual({ revision: 2, lastActivityAt: NOW });
  });

  it("returns the exact stored receipt on retry without duplicating writes", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    const reviews = repositoryFor(database);
    const input = command();

    const first = await reviews.grade("user-a", input);
    const retry = await reviews.grade("user-a", input);

    expect(retry).toEqual({ ...first, duplicate: true });
    expect(reviewGraphCounts(database)).toEqual({
      idempotencyCount: 1,
      attemptCount: 1,
      evidenceCount: 1,
      reviewLogCount: 1,
      outboxCount: 1,
      changeCount: 2,
      xpCount: 0,
    });
    expect(database.database.prepare(
      "SELECT revision FROM fsrs_cards WHERE id = ?",
    ).get(cardId)).toEqual({ revision: 2 });
  });

  it("fails closed when a stored receipt is corrupted or loses its word binding", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    const reviews = repositoryFor(database);
    const input = command();
    const receipt = await reviews.grade("user-a", input);
    const missingWordVersion = {
      ...receipt,
    } as Partial<typeof receipt>;
    delete missingWordVersion.wordVersion;
    for (const corrupted of [
      { ...receipt, rating: String(receipt.rating) },
      {
        ...receipt,
        wordId: otherWordId,
        wordVersion: reviewWordVersion(otherWordId),
      },
      missingWordVersion,
    ]) {
      database.database.prepare(
        `UPDATE idempotency_records
         SET response_json = ?
         WHERE scope = ? AND idempotency_key = ?`,
      ).run(
        JSON.stringify(corrupted),
        REVIEW_IDEMPOTENCY_SCOPE,
        input.idempotencyKey,
      );
      await expect(reviews.grade("user-a", input))
        .rejects.toBeInstanceOf(ReviewGradeIntegrityError);
    }
    expect(reviewGraphCounts(database).reviewLogCount).toBe(1);
  });

  it("rejects idempotency-key and device-sequence reuse", async () => {
    const keyDatabase = new SQLiteD1();
    seedReviewAuthority(keyDatabase);
    const keyRepository = repositoryFor(keyDatabase);
    await keyRepository.grade("user-a", command());
    await expect(keyRepository.grade("user-a", command({ rating: 1 })))
      .rejects.toBeInstanceOf(ReviewGradeIdempotencyConflictError);

    const sequenceDatabase = new SQLiteD1();
    seedReviewAuthority(sequenceDatabase);
    const sequenceRepository = repositoryFor(sequenceDatabase);
    await sequenceRepository.grade("user-a", command());
    sequenceDatabase.database.prepare(
      "UPDATE fsrs_cards SET due_at = ? WHERE id = ?",
    ).run(ACTIVATED_AT, cardId);
    await expect(sequenceRepository.grade("user-a", command({
      idempotencyKey: "review-grade:repository:sequence-reuse",
      expectedCardRevision: 2,
      rating: 2,
    }))).rejects.toBeInstanceOf(ReviewGradeDeviceSequenceConflictError);
    expect(reviewGraphCounts(sequenceDatabase).reviewLogCount).toBe(1);
  });

  it("rejects wrong-tenant, unpromoted, and stale release scopes", async () => {
    const wrongTenant = new SQLiteD1();
    seedReviewAuthority(wrongTenant);
    await expect(repositoryFor(wrongTenant).grade("user-b", command()))
      .rejects.toBeInstanceOf(ReviewGradeUnavailableError);

    const unpromoted = new SQLiteD1();
    seedReviewAuthority(unpromoted);
    await expect(
      repositoryFor(unpromoted, unpromotedPolicy).grade("user-a", command()),
    ).rejects.toBeInstanceOf(ReviewGradeUnavailableError);

    const staleRelease = new SQLiteD1();
    seedReviewAuthority(staleRelease);
    staleRelease.database.prepare(
      "UPDATE course_versions SET manifest_hash = ? WHERE id = ?",
    ).run(`sha256:${"f".repeat(64)}`, CONTENT_VERSION);
    await expect(repositoryFor(staleRelease).grade("user-a", command()))
      .rejects.toBeInstanceOf(ReviewGradeUnavailableError);
    expect(reviewGraphCounts(staleRelease).reviewLogCount).toBe(0);
  });

  it("rejects not-due and legacy cards before any review writes", async () => {
    const notDue = new SQLiteD1();
    seedReviewAuthority(notDue);
    notDue.database.prepare(
      "UPDATE fsrs_cards SET due_at = ? WHERE id = ?",
    ).run(NOW + 1, cardId);
    await expect(repositoryFor(notDue).grade("user-a", command()))
      .rejects.toBeInstanceOf(ReviewGradeUnavailableError);

    const legacy = new SQLiteD1();
    seedReviewAuthority(legacy);
    legacy.database.prepare(
      "UPDATE fsrs_cards SET activation_session_id = NULL WHERE id = ?",
    ).run(cardId);
    await expect(repositoryFor(legacy).grade("user-a", command()))
      .rejects.toBeInstanceOf(ReviewGradeUnavailableError);

    expect(reviewGraphCounts(notDue).attemptCount).toBe(0);
    expect(reviewGraphCounts(legacy).attemptCount).toBe(0);
  });

  it("rejects a tampered card-to-word binding before scheduling or writes", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);

    await expect(repositoryFor(database).grade("user-a", command({
      wordId: otherWordId,
      wordVersion: reviewWordVersion(otherWordId),
    }))).rejects.toBeInstanceOf(ReviewGradeUnavailableError);

    expect(reviewGraphCounts(database)).toEqual({
      idempotencyCount: 0,
      attemptCount: 0,
      evidenceCount: 0,
      reviewLogCount: 0,
      outboxCount: 0,
      changeCount: 0,
      xpCount: 0,
    });
    expect(database.database.prepare(
      "SELECT revision, due_at AS dueAt FROM fsrs_cards WHERE id = ?",
    ).get(cardId)).toEqual({ revision: 1, dueAt: ACTIVATED_AT });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM devices",
    ).get()).toEqual({ count: 0 });
  });

  it("rejects a card whose activation lesson does not contain its word", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    database.database.prepare(
      "UPDATE lesson_sessions SET lesson_id = ?, lesson_version = ? WHERE id = ?",
    ).run(
      incompatibleLesson.id,
      `${CONTENT_VERSION}:${incompatibleLesson.id}:1`,
      sessionId,
    );

    await expect(repositoryFor(database).grade("user-a", command()))
      .rejects.toBeInstanceOf(ReviewGradeIntegrityError);
    expect(reviewGraphCounts(database).attemptCount).toBe(0);
  });

  it("rejects stale card revisions and reset epochs", async () => {
    const staleRevision = new SQLiteD1();
    seedReviewAuthority(staleRevision);
    await expect(repositoryFor(staleRevision).grade("user-a", command({
      expectedCardRevision: 2,
    }))).rejects.toBeInstanceOf(ReviewCardRevisionConflictError);

    const staleReset = new SQLiteD1();
    seedReviewAuthority(staleReset);
    staleReset.database.prepare(
      "INSERT INTO learning_documents (user_id, revision, document_json, schema_version, content_version, updated_at) VALUES ('user-a', 1, ?, 1, ?, ?)",
    ).run(
      JSON.stringify({ reset: { epoch: 1 } }),
      CONTENT_VERSION,
      NOW,
    );
    await expect(repositoryFor(staleReset).grade("user-a", command()))
      .rejects.toBeInstanceOf(LearningResetEpochConflictError);
    expect(reviewGraphCounts(staleRevision).attemptCount).toBe(0);
    expect(reviewGraphCounts(staleReset).attemptCount).toBe(0);
  });

  it("classifies a reset that wins before the batch as a reset conflict", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    database.beforeNextBatch = () => {
      database.database.prepare(
        `INSERT INTO learning_documents (
           user_id, revision, document_json, schema_version,
           content_version, updated_at
         ) VALUES (?, 1, ?, 1, ?, ?)`,
      ).run(
        "user-a",
        JSON.stringify({ reset: { epoch: 1 } }),
        CONTENT_VERSION,
        NOW,
      );
    };

    let failure: unknown;
    try {
      await repositoryFor(database).grade("user-a", command());
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(LearningResetEpochConflictError);
    expect(failure).not.toBeInstanceOf(ReviewCardRevisionConflictError);
    expect(failure).toMatchObject({
      code: "LEARNING_RESET_EPOCH_CONFLICT",
    });
    expect(reviewGraphCounts(database)).toEqual({
      idempotencyCount: 0,
      attemptCount: 0,
      evidenceCount: 0,
      reviewLogCount: 0,
      outboxCount: 0,
      changeCount: 0,
      xpCount: 0,
    });
    expect(database.database.prepare(
      "SELECT revision FROM fsrs_cards WHERE id = ?",
    ).get(cardId)).toEqual({ revision: 1 });
  });

  it.each([
    {
      label: "course release",
      mutate: (database: SQLiteD1) => {
        database.database.prepare(
          "UPDATE course_versions SET release_state = 'retired' WHERE id = ?",
        ).run(CONTENT_VERSION);
      },
    },
    {
      label: "active enrollment",
      mutate: (database: SQLiteD1) => {
        database.database.prepare(
          "UPDATE enrollments SET status = 'paused' WHERE id = ?",
        ).run(enrollmentId);
      },
    },
  ])("classifies a mid-batch $label race as unavailable", async ({ mutate }) => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    database.beforeNextBatch = () => mutate(database);

    let failure: unknown;
    try {
      await repositoryFor(database).grade("user-a", command());
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(ReviewGradeUnavailableError);
    expect(failure).not.toBeInstanceOf(ReviewCardRevisionConflictError);
    expect(reviewGraphCounts(database)).toEqual({
      idempotencyCount: 0,
      attemptCount: 0,
      evidenceCount: 0,
      reviewLogCount: 0,
      outboxCount: 0,
      changeCount: 0,
      xpCount: 0,
    });
    expect(database.database.prepare(
      "SELECT revision FROM fsrs_cards WHERE id = ?",
    ).get(cardId)).toEqual({ revision: 1 });
  });

  it("allows only one winner when two grades race from the same revision", async () => {
    const database = new SQLiteD1();
    seedReviewAuthority(database);
    const reviews = repositoryFor(database);
    const losingCommand = command({
      idempotencyKey: "review-grade:repository:race-loser",
      deviceSequence: 2,
      rating: 1,
    });
    const winningCommand = command({
      idempotencyKey: "review-grade:repository:race-winner",
      deviceSequence: 3,
      rating: 4,
    });
    let winner:
      | Awaited<ReturnType<ReviewRepository["grade"]>>
      | undefined;
    database.beforeNextBatch = async () => {
      winner = await reviews.grade("user-a", winningCommand);
    };

    await expect(reviews.grade("user-a", losingCommand))
      .rejects.toBeInstanceOf(ReviewCardRevisionConflictError);

    expect(winner).toMatchObject({
      duplicate: false,
      idempotencyKey: winningCommand.idempotencyKey,
      previousCardRevision: 1,
      cardRevision: 2,
    });
    expect(reviewGraphCounts(database)).toEqual({
      idempotencyCount: 1,
      attemptCount: 1,
      evidenceCount: 1,
      reviewLogCount: 1,
      outboxCount: 1,
      changeCount: 2,
      xpCount: 0,
    });
    expect(database.database.prepare(
      "SELECT revision FROM fsrs_cards WHERE id = ?",
    ).get(cardId)).toEqual({ revision: 2 });
  });
});
