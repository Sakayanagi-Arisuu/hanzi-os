import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import {
  REVIEW_MODALITY,
  REVIEW_QUEUE_MAX_OFFERS,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
} from "../learning/reviewProtocol";
import type { ContentReleasePolicy } from "./contentReleasePolicy";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  ReviewQueueIntegrityError,
  ReviewQueueRepository,
  ReviewQueueResetRaceError,
  ReviewQueueUnavailableError,
} from "./reviewQueueRepository";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
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
    if (/^\s*SELECT\b/iu.test(this.query)) return this.all<T>();
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

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec(migration);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query), query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    this.database.exec("BEGIN");
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const NOW = Date.parse("2026-07-26T08:00:00.000Z");
const FORM_HASH = `sha256:${"a".repeat(64)}`;

type AuthoringLessonFixture = {
  itemId: string;
  itemType: "lesson";
  releaseState: "draft" | "review" | "beta" | "published" | "retired";
  payload: { wordIds: string[] };
};

const authoringCatalog = JSON.parse(readFileSync(
  new URL(
    `../../content/packages/${CONTENT_VERSION}/item-catalog.json`,
    import.meta.url,
  ),
  "utf8",
)) as { items: AuthoringLessonFixture[] };

const promotedPolicy: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const seedCourse = (
  database: SQLiteD1,
  {
    manifestHash = CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState = "beta",
    linguisticReviewStatus = "approved",
  }: {
    manifestHash?: string;
    releaseState?: "draft" | "review" | "beta" | "published" | "retired";
    linguisticReviewStatus?: "pending" | "approved" | "rejected";
  } = {},
) => {
  database.database.prepare(
    `INSERT INTO course_versions (
       id, course_id, schema_version, manifest_hash, release_state,
       linguistic_review_status, created_at, published_at
     ) VALUES (?, 'hanzi-os-core', 1, ?, ?, ?, ?, ?)`,
  ).run(
    CONTENT_VERSION,
    manifestHash,
    releaseState,
    linguisticReviewStatus,
    NOW - 10_000,
    releaseState === "beta" || releaseState === "published"
      ? NOW - 9_000
      : null,
  );
};

const seedTenant = (
  database: SQLiteD1,
  userId: string,
  status: "active" | "paused" | "completed" | "archived" = "active",
) => {
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, NOW - 8_000, NOW - 8_000);
  const enrollmentId = `${userId}-current-enrollment`;
  database.database.prepare(
    `INSERT INTO enrollments (
       id, user_id, course_version_id, goal, status, revision,
       started_at, last_activity_at
     ) VALUES (?, ?, ?, 'conversation', ?, 1, ?, ?)`,
  ).run(
    enrollmentId,
    userId,
    CONTENT_VERSION,
    status,
    NOW - 7_000,
    NOW - 7_000,
  );
  return enrollmentId;
};

const seedPassedSession = (
  database: SQLiteD1,
  {
    userId,
    enrollmentId = `${userId}-current-enrollment`,
    sessionId,
    lessonId,
    lessonVersion = `${CONTENT_VERSION}:${lessonId}:1`,
    resetEpoch = 0,
  }: {
    userId: string;
    enrollmentId?: string;
    sessionId: string;
    lessonId: string;
    lessonVersion?: string;
    resetEpoch?: number;
  },
) => {
  const idempotencyRecordId = `${sessionId}-idempotency`;
  database.database.prepare(
    `INSERT INTO idempotency_records (
       id, user_id, reset_epoch, scope, idempotency_key, request_hash,
       status, response_status, response_json, created_at, updated_at,
       completed_at
     ) VALUES (?, ?, ?, 'lesson-session-v1', ?, 'fixture', 'completed',
               201, '{}', ?, ?, ?)`,
  ).run(
    idempotencyRecordId,
    userId,
    resetEpoch,
    `${sessionId}-open`,
    NOW - 6_000,
    NOW - 6_000,
    NOW - 6_000,
  );
  database.database.prepare(
    `INSERT INTO lesson_sessions (
       id, user_id, enrollment_id, device_id, idempotency_record_id,
       schema_version, reset_epoch, content_version, lesson_id,
       lesson_version, expected_evidence_count, form_schema_version,
       form_script, form_manifest_json, form_manifest_hash, status,
       raw_score, gate_score, required_evidence_count,
       required_correct_count, passed, started_at, submitted_at, created_at
     ) VALUES (?, ?, ?, NULL, ?, 1, ?, ?, ?, ?, 10, 1, 'simplified',
               '{}', ?, 'submitted', 100, 100, 0, 0, 1, ?, ?, ?)`,
  ).run(
    sessionId,
    userId,
    enrollmentId,
    idempotencyRecordId,
    resetEpoch,
    CONTENT_VERSION,
    lessonId,
    lessonVersion,
    FORM_HASH,
    NOW - 5_000,
    NOW - 4_000,
    NOW - 5_000,
  );
};

const seedCard = (
  database: SQLiteD1,
  {
    id,
    userId,
    enrollmentId = `${userId}-current-enrollment`,
    activationSessionId,
    resetEpoch = 0,
    wordId,
    wordVersion = reviewWordVersion(wordId),
    modality = REVIEW_MODALITY,
    schedulerVersion = REVIEW_SCHEDULER_VERSION,
    dueAt = NOW,
    revision = 1,
  }: {
    id: string;
    userId: string;
    enrollmentId?: string;
    activationSessionId: string | null;
    resetEpoch?: number;
    wordId: string;
    wordVersion?: string;
    modality?: string;
    schedulerVersion?: string;
    dueAt?: number;
    revision?: number;
  },
) => {
  database.database.prepare(
    `INSERT INTO fsrs_cards (
       id, user_id, enrollment_id, activation_session_id, reset_epoch,
       content_version, knowledge_item_type, knowledge_item_id,
       knowledge_item_version, modality, scheduler_version, due_at,
       stability, difficulty, elapsed_days, scheduled_days, learning_steps,
       reps, lapses, state, last_review_at, revision, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'vocabulary', ?, ?, ?, ?, ?,
               0, 0, 0, 0, 0, 0, 0, 0, NULL, ?, ?, ?)`,
  ).run(
    id,
    userId,
    enrollmentId,
    activationSessionId,
    resetEpoch,
    CONTENT_VERSION,
    wordId,
    wordVersion,
    modality,
    schedulerVersion,
    dueAt,
    revision,
    NOW - 3_000,
    NOW - 3_000,
  );
};

const releasedLessonForWord = (wordId: string) => {
  const lesson = RELEASED_LESSONS.find((candidate) =>
    candidate.wordIds.includes(wordId)
  );
  if (!lesson) throw new Error(`No released lesson contains ${wordId}.`);
  return lesson;
};

const seedActivationForWord = (
  database: SQLiteD1,
  userId: string,
  wordId: string,
  resetEpoch = 0,
) => {
  const lesson = releasedLessonForWord(wordId);
  const sessionId = `${userId}-${resetEpoch}-${lesson.id}-activation`;
  const exists = database.database.prepare(
    "SELECT id FROM lesson_sessions WHERE id = ?",
  ).get(sessionId);
  if (!exists) {
    seedPassedSession(database, {
      userId,
      sessionId,
      lessonId: lesson.id,
      resetEpoch,
    });
  }
  return sessionId;
};

const repository = (
  database: SQLiteD1,
  readResetEpoch?: (
    database: D1Database,
    userId: string,
  ) => Promise<number>,
) => new ReviewQueueRepository(
  database,
  promotedPolicy,
  readResetEpoch,
);

describe("review queue repository", () => {
  it("serves only due cards for the requested tenant in stable due/id order and enforces the offer limit", async () => {
    const database = new SQLiteD1();
    seedCourse(database);
    seedTenant(database, "user-a");
    seedTenant(database, "user-b");
    const wordIds = [...RELEASED_WORD_BY_ID.keys()];
    expect(wordIds.length).toBeGreaterThan(REVIEW_QUEUE_MAX_OFFERS + 1);

    const dueCards = wordIds
      .slice(0, REVIEW_QUEUE_MAX_OFFERS + 2)
      .map((wordId, index) => ({
        id: `user-a-card-${String(index).padStart(2, "0")}`,
        wordId,
        dueAt: NOW - ((index % 4) * 1_000),
      }));
    for (const card of dueCards) {
      seedCard(database, {
        ...card,
        userId: "user-a",
        activationSessionId: seedActivationForWord(
          database,
          "user-a",
          card.wordId,
        ),
      });
    }
    const futureWordId = wordIds[REVIEW_QUEUE_MAX_OFFERS + 2];
    seedCard(database, {
      id: "user-a-future",
      userId: "user-a",
      wordId: futureWordId,
      activationSessionId: seedActivationForWord(
        database,
        "user-a",
        futureWordId,
      ),
      dueAt: NOW + 1,
    });
    const foreignWordId = wordIds[0];
    seedCard(database, {
      id: "user-b-card",
      userId: "user-b",
      wordId: foreignWordId,
      activationSessionId: seedActivationForWord(
        database,
        "user-b",
        foreignWordId,
      ),
      dueAt: NOW - 100_000,
    });

    const queue = await repository(database).read("user-a", NOW);
    const expected = [...dueCards]
      .sort((left, right) =>
        left.dueAt - right.dueAt || left.id.localeCompare(right.id)
      )
      .slice(0, REVIEW_QUEUE_MAX_OFFERS);

    expect(queue).toMatchObject({
      protocolVersion: 1,
      resetEpoch: 0,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      generatedAt: new Date(NOW).toISOString(),
    });
    expect(queue.cards.map((card) => ({
      id: card.cardId,
      wordId: card.wordId,
      dueAt: card.dueAt,
    }))).toEqual(expected.map((card) => ({
      id: card.id,
      wordId: card.wordId,
      dueAt: new Date(card.dueAt).toISOString(),
    })));
    expect(queue.cards).toHaveLength(REVIEW_QUEUE_MAX_OFFERS);
    expect(queue.cards.some((card) => card.cardId === "user-a-future"))
      .toBe(false);
    expect(queue.cards.some((card) => card.cardId === "user-b-card"))
      .toBe(false);
  });

  it("requires activation by the exact released lesson/version that contains the card word", async () => {
    const wordId = [...RELEASED_WORD_BY_ID.keys()][0];
    const correctLesson = releasedLessonForWord(wordId);
    const wrongLesson = RELEASED_LESSONS.find((lesson) =>
      !lesson.wordIds.includes(wordId)
    );
    if (!wrongLesson) throw new Error("Missing wrong-lesson fixture.");

    const valid = new SQLiteD1();
    seedCourse(valid);
    seedTenant(valid, "user-a");
    seedPassedSession(valid, {
      userId: "user-a",
      sessionId: "valid-activation",
      lessonId: correctLesson.id,
    });
    seedCard(valid, {
      id: "valid-card",
      userId: "user-a",
      activationSessionId: "valid-activation",
      wordId,
    });
    await expect(repository(valid).read("user-a", NOW)).resolves
      .toMatchObject({ cards: [{ cardId: "valid-card", wordId }] });

    const wrongLessonDatabase = new SQLiteD1();
    seedCourse(wrongLessonDatabase);
    seedTenant(wrongLessonDatabase, "user-a");
    seedPassedSession(wrongLessonDatabase, {
      userId: "user-a",
      sessionId: "wrong-lesson-activation",
      lessonId: wrongLesson.id,
    });
    seedCard(wrongLessonDatabase, {
      id: "wrong-lesson-card",
      userId: "user-a",
      activationSessionId: "wrong-lesson-activation",
      wordId,
    });
    await expect(repository(wrongLessonDatabase).read("user-a", NOW))
      .resolves.toMatchObject({ cards: [] });

    const wrongVersionDatabase = new SQLiteD1();
    seedCourse(wrongVersionDatabase);
    seedTenant(wrongVersionDatabase, "user-a");
    seedPassedSession(wrongVersionDatabase, {
      userId: "user-a",
      sessionId: "wrong-version-activation",
      lessonId: correctLesson.id,
      lessonVersion: `${CONTENT_VERSION}:${correctLesson.id}:0`,
    });
    seedCard(wrongVersionDatabase, {
      id: "wrong-version-card",
      userId: "user-a",
      activationSessionId: "wrong-version-activation",
      wordId,
    });
    await expect(repository(wrongVersionDatabase).read("user-a", NOW))
      .resolves.toMatchObject({ cards: [] });
  });

  it("excludes draft activation and legacy cards with no activation session", async () => {
    const draftLesson = authoringCatalog.items.find((item) =>
      item.itemType === "lesson"
      && item.releaseState === "draft"
      && item.payload.wordIds.some((wordId) => RELEASED_WORD_BY_ID.has(wordId))
    );
    if (!draftLesson) {
      throw new Error("Missing authoring-only draft activation fixture.");
    }
    expect(RELEASED_LESSONS.some((lesson) => lesson.id === draftLesson.itemId))
      .toBe(false);
    const draftWordId = draftLesson.payload.wordIds.find((wordId) =>
      RELEASED_WORD_BY_ID.has(wordId)
    );
    if (!draftWordId) throw new Error("Missing released draft word fixture.");

    const database = new SQLiteD1();
    seedCourse(database);
    seedTenant(database, "user-a");
    seedPassedSession(database, {
      userId: "user-a",
      sessionId: "draft-activation",
      lessonId: draftLesson.itemId,
    });
    seedCard(database, {
      id: "draft-card",
      userId: "user-a",
      activationSessionId: "draft-activation",
      wordId: draftWordId,
    });
    const legacyWordId = [...RELEASED_WORD_BY_ID.keys()].find((wordId) =>
      wordId !== draftWordId
    );
    if (!legacyWordId) throw new Error("Missing legacy word fixture.");
    seedCard(database, {
      id: "legacy-null-activation",
      userId: "user-a",
      activationSessionId: null,
      wordId: legacyWordId,
    });

    await expect(repository(database).read("user-a", NOW))
      .resolves.toMatchObject({ cards: [] });
  });

  it("requires the exact active enrollment and promoted DB release/hash/review state", async () => {
    const unpromoted = new SQLiteD1();
    seedCourse(unpromoted);
    seedTenant(unpromoted, "user-a");
    await expect(new ReviewQueueRepository(unpromoted).read("user-a", NOW))
      .rejects.toBeInstanceOf(ReviewQueueUnavailableError);

    for (const fixture of [
      { releaseState: "review" as const },
      { releaseState: "published" as const },
      { manifestHash: `sha256:${"b".repeat(64)}` },
      { linguisticReviewStatus: "pending" as const },
    ]) {
      const database = new SQLiteD1();
      seedCourse(database, fixture);
      seedTenant(database, "user-a");
      await expect(repository(database).read("user-a", NOW))
        .rejects.toBeInstanceOf(ReviewQueueUnavailableError);
    }

    const paused = new SQLiteD1();
    seedCourse(paused);
    seedTenant(paused, "user-a", "paused");
    await expect(repository(paused).read("user-a", NOW))
      .rejects.toBeInstanceOf(ReviewQueueUnavailableError);
    await expect(repository(paused).read("foreign-user", NOW))
      .rejects.toBeInstanceOf(ReviewQueueUnavailableError);
  });

  it("fails closed when reset epochs keep changing and retries once when they stabilize", async () => {
    const retryDatabase = new SQLiteD1();
    seedCourse(retryDatabase);
    seedTenant(retryDatabase, "user-a");
    const wordId = [...RELEASED_WORD_BY_ID.keys()][0];
    const staleActivationSessionId = seedActivationForWord(
      retryDatabase,
      "user-a",
      wordId,
      0,
    );
    seedCard(retryDatabase, {
      id: "epoch-zero-stale-card",
      userId: "user-a",
      activationSessionId: staleActivationSessionId,
      resetEpoch: 0,
      wordId,
    });
    const activationSessionId = seedActivationForWord(
      retryDatabase,
      "user-a",
      wordId,
      1,
    );
    seedCard(retryDatabase, {
      id: "epoch-one-card",
      userId: "user-a",
      activationSessionId,
      resetEpoch: 1,
      wordId,
    });
    const retryEpochs = [0, 1, 1, 1];
    const retried = await repository(
      retryDatabase,
      async () => retryEpochs.shift() ?? 1,
    ).read("user-a", NOW);
    expect(retried).toMatchObject({
      resetEpoch: 1,
      cards: [{ cardId: "epoch-one-card" }],
    });
    expect(retried.cards.some((card) =>
      card.cardId === "epoch-zero-stale-card"
    )).toBe(false);

    const racingDatabase = new SQLiteD1();
    seedCourse(racingDatabase);
    seedTenant(racingDatabase, "user-a");
    const racingEpochs = [0, 1, 1, 2];
    await expect(repository(
      racingDatabase,
      async () => racingEpochs.shift() ?? 2,
    ).read("user-a", NOW)).rejects.toBeInstanceOf(
      ReviewQueueResetRaceError,
    );
  });

  it("fails the whole queue for corrupt word version, due time, or card revision", async () => {
    const corruptCases: Array<{
      name: string;
      mutate: (database: SQLiteD1, wordId: string) => void;
    }> = [
      {
        name: "word version",
        mutate: (database, wordId) => {
          seedCard(database, {
            id: "corrupt-word-version",
            userId: "user-a",
            activationSessionId: seedActivationForWord(
              database,
              "user-a",
              wordId,
            ),
            wordId,
            wordVersion: `${CONTENT_VERSION}:vocabulary:${wordId}:0`,
          });
        },
      },
      {
        name: "due time",
        mutate: (database, wordId) => {
          seedCard(database, {
            id: "corrupt-due",
            userId: "user-a",
            activationSessionId: seedActivationForWord(
              database,
              "user-a",
              wordId,
            ),
            wordId,
            dueAt: -1,
          });
        },
      },
      {
        name: "revision",
        mutate: (database, wordId) => {
          database.database.exec("PRAGMA ignore_check_constraints = ON");
          try {
            seedCard(database, {
              id: "corrupt-revision",
              userId: "user-a",
              activationSessionId: seedActivationForWord(
                database,
                "user-a",
                wordId,
              ),
              wordId,
              revision: 0,
            });
          } finally {
            database.database.exec(
              "PRAGMA ignore_check_constraints = OFF",
            );
          }
        },
      },
    ];

    for (const corruptCase of corruptCases) {
      const database = new SQLiteD1();
      seedCourse(database);
      seedTenant(database, "user-a");
      const wordId = [...RELEASED_WORD_BY_ID.keys()][0];
      corruptCase.mutate(database, wordId);
      await expect(
        repository(database).read("user-a", NOW),
        corruptCase.name,
      ).rejects.toBeInstanceOf(ReviewQueueIntegrityError);
    }
  });

  it("quarantines unsupported word/modality/scheduler rows and enforces duplicate storage identity", async () => {
    const database = new SQLiteD1();
    seedCourse(database);
    seedTenant(database, "user-a");
    const wordIds = [...RELEASED_WORD_BY_ID.keys()];
    const firstWord = wordIds[0];
    const secondWord = wordIds[1];
    const thirdWord = wordIds[2];
    seedCard(database, {
      id: "unknown-word",
      userId: "user-a",
      activationSessionId: seedActivationForWord(
        database,
        "user-a",
        firstWord,
      ),
      wordId: "unknown-word",
      wordVersion: `${CONTENT_VERSION}:vocabulary:unknown-word:1`,
    });
    seedCard(database, {
      id: "wrong-modality",
      userId: "user-a",
      activationSessionId: seedActivationForWord(
        database,
        "user-a",
        secondWord,
      ),
      wordId: secondWord,
      modality: "unsupported-modality",
    });
    seedCard(database, {
      id: "wrong-scheduler",
      userId: "user-a",
      activationSessionId: seedActivationForWord(
        database,
        "user-a",
        thirdWord,
      ),
      wordId: thirdWord,
      schedulerVersion: "unsupported-scheduler",
    });

    await expect(repository(database).read("user-a", NOW))
      .resolves.toMatchObject({ cards: [] });

    const duplicateDatabase = new SQLiteD1();
    seedCourse(duplicateDatabase);
    seedTenant(duplicateDatabase, "user-a");
    const activationSessionId = seedActivationForWord(
      duplicateDatabase,
      "user-a",
      firstWord,
    );
    seedCard(duplicateDatabase, {
      id: "first-card",
      userId: "user-a",
      activationSessionId,
      wordId: firstWord,
    });
    expect(() => seedCard(duplicateDatabase, {
      id: "duplicate-card",
      userId: "user-a",
      activationSessionId,
      wordId: firstWord,
    })).toThrow(/UNIQUE constraint failed/u);
  });
});
