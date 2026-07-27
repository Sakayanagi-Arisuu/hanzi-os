import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  RELEASED_LESSONS,
} from "../data/curriculum";
import type { OpenLessonSessionCommandV1 } from "../learning/lessonSessionProtocol";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  LessonSessionContentUnavailableError,
  LessonSessionDeviceSequenceConflictError,
  LessonSessionEnrollmentUnavailableError,
  LessonSessionIdempotencyConflictError,
  LessonSessionPrerequisiteUnavailableError,
  LessonSessionRepository,
  MAX_ACTIVE_LESSON_SESSIONS,
  type LessonSessionPublicationPolicy,
} from "./lessonSessionRepository";

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

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
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

const firstLesson = RELEASED_LESSONS[0];
const secondLesson = RELEASED_LESSONS[1];

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
const draftLesson = authoringCatalog.items.find(
  (item) => item.itemType === "lesson" && item.releaseState === "draft",
);
if (!draftLesson) throw new Error("Missing authoring-only draft lesson fixture.");
const promotedPolicy: LessonSessionPublicationPolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const repository = (database: SQLiteD1) =>
  new LessonSessionRepository(database, promotedPolicy, () => 0.5);

const command = (
  userId = "user-a",
  overrides: Partial<OpenLessonSessionCommandV1> = {},
): OpenLessonSessionCommandV1 => ({
  protocolVersion: 1,
  idempotencyKey: "lesson-session:repository:1",
  installationId: `${userId}-installation`,
  deviceId: `${userId}-device`,
  deviceSequence: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  enrollmentId: `${userId}-enrollment`,
  lessonId: firstLesson.id,
  ...overrides,
});

const seedUser = (
  database: SQLiteD1,
  userId: string,
  releaseState: "review" | "beta" | "published" = "beta",
) => {
  const timestamp = Date.parse("2026-07-22T05:00:00.000Z");
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, timestamp, timestamp);
  database.database.prepare(
    "INSERT INTO profiles (user_id, display_name, goal, daily_minutes, script, starting_level, onboarded, revision, created_at, updated_at) VALUES (?, 'Learner', 'conversation', 20, 'simplified', 'zero', 1, 1, ?, ?)",
  ).run(userId, timestamp, timestamp);
  database.database.prepare(
    "INSERT OR IGNORE INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, ?, 'approved', ?)",
  ).run(
    CONTENT_VERSION,
    CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState,
    timestamp,
  );
  database.database.prepare(
    "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)",
  ).run(
    `${userId}-enrollment`,
    userId,
    CONTENT_VERSION,
    timestamp,
    timestamp,
  );
};

const seedPassedSession = (
  database: SQLiteD1,
  userId: string,
  lessonId: string,
) => {
  const timestamp = Date.parse("2026-07-22T05:30:00.000Z");
  const receiptId = `${userId}-${lessonId}-passed-idempotency`;
  database.database.prepare(
    "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, response_status, response_json, created_at, updated_at, completed_at) VALUES (?, ?, 0, 'lesson-session-v1', ?, 'fixture', 'completed', 201, '{}', ?, ?, ?)",
  ).run(
    receiptId,
    userId,
    `${userId}-${lessonId}-passed-key`,
    timestamp,
    timestamp,
    timestamp,
  );
  database.database.prepare(
    "INSERT INTO lesson_sessions (id, user_id, enrollment_id, device_id, idempotency_record_id, schema_version, content_version, lesson_id, lesson_version, expected_evidence_count, form_schema_version, form_script, form_manifest_json, form_manifest_hash, status, raw_score, gate_score, required_evidence_count, required_correct_count, passed, started_at, submitted_at, created_at) VALUES (?, ?, ?, NULL, ?, 1, ?, ?, ?, 10, 1, 'simplified', '{}', ?, 'submitted', 100, 100, 0, 0, 1, ?, ?, ?)",
  ).run(
    `${userId}-${lessonId}-passed-session`,
    userId,
    `${userId}-enrollment`,
    receiptId,
    CONTENT_VERSION,
    lessonId,
    `${CONTENT_VERSION}:${lessonId}:1`,
    `sha256:${"a".repeat(64)}`,
    timestamp,
    timestamp,
    timestamp,
  );
};

describe("server-owned lesson-session repository", () => {
  it("atomically freezes the released lesson form and emits lesson.started", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");

    const receipt = await repository(database).open(
      "user-a",
      command(),
    );

    expect(receipt).toMatchObject({
      duplicate: false,
      enrollmentId: "user-a-enrollment",
      contentVersion: CONTENT_VERSION,
      lessonId: firstLesson.id,
      lessonVersion: `${CONTENT_VERSION}:${firstLesson.id}:1`,
      expectedEvidenceCount: 10,
      form: expect.objectContaining({
        schemaVersion: 1,
        script: "simplified",
        activities: expect.arrayContaining([
          expect.objectContaining({ position: 0 }),
        ]),
      }),
      formHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      status: "started",
    });
    const stored = database.database.prepare(
      "SELECT user_id AS userId, lesson_version AS lessonVersion, expected_evidence_count AS expectedEvidenceCount, form_schema_version AS formSchemaVersion, form_script AS formScript, form_manifest_json AS formManifestJson, form_manifest_hash AS formManifestHash, status FROM lesson_sessions WHERE id = ?",
    ).get(receipt.sessionId) as Record<string, unknown>;
    const storedForm = JSON.parse(String(stored.formManifestJson));
    expect(stored).toEqual({
      userId: "user-a",
      lessonVersion: `${CONTENT_VERSION}:${firstLesson.id}:1`,
      expectedEvidenceCount: 10,
      formSchemaVersion: 1,
      formScript: "simplified",
      formManifestJson: expect.any(String),
      formManifestHash: receipt.formHash,
      status: "started",
    });
    expect(storedForm).toEqual(receipt.form);
    expect(JSON.stringify(storedForm)).not.toMatch(/answer|correct/iu);
    expect(receipt.form.activities.map((activity) => activity.position)).toEqual(
      Array.from({ length: 10 }, (_, index) => index),
    );
    const event = database.database.prepare(
      "SELECT user_id AS userId, aggregate_id AS aggregateId, event_type AS eventType, payload_json AS payloadJson FROM outbox_events",
    ).get() as Record<string, string>;
    expect(event).toMatchObject({
      userId: "user-a",
      aggregateId: receipt.sessionId,
      eventType: "lesson.started",
    });
    const eventPayload = JSON.parse(event.payloadJson);
    expect(eventPayload).toMatchObject({
      contentManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      lessonVersion: receipt.lessonVersion,
      expectedEvidenceCount: 10,
    });
    expect(eventPayload).not.toHaveProperty("idempotencyKey");
    expect(database.database.prepare(
      "SELECT reset_epoch AS resetEpoch, entity_type AS entityType, entity_id AS entityId, revision, operation_id AS operationId, payload_json AS payloadJson FROM sync_changes",
    ).get()).toEqual({
      resetEpoch: 0,
      entityType: "lesson_session",
      entityId: receipt.sessionId,
      revision: 1,
      operationId:
        `normalized:lesson-session-open:${command().idempotencyKey}`,
      payloadJson: null,
    });
  });

  it("returns the canonical receipt for a same-payload replay", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const sessions = repository(database);
    const first = await sessions.open("user-a", command());
    const replay = await sessions.open("user-a", command());

    expect(replay).toEqual({ ...first, duplicate: true });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM lesson_sessions",
    ).get()).toEqual({ count: 1 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM outbox_events",
    ).get()).toEqual({ count: 1 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM sync_changes",
    ).get()).toEqual({ count: 1 });
  });

  it("fails closed when an idempotency key is reused with another payload", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const sessions = repository(database);
    await sessions.open("user-a", command());

    await expect(sessions.open("user-a", command("user-a", {
      lessonId: secondLesson.id,
    }))).rejects.toBeInstanceOf(LessonSessionIdempotencyConflictError);
  });

  it("fails closed when a device sequence is reused by another command", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const sessions = repository(database);
    await sessions.open("user-a", command());

    await expect(sessions.open("user-a", command("user-a", {
      idempotencyKey: "lesson-session:repository:2",
    }))).rejects.toBeInstanceOf(LessonSessionDeviceSequenceConflictError);
  });

  it("does not accept another tenant's enrollment", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedUser(database, "user-b");

    await expect(repository(database).open(
      "user-a",
      command("user-a", { enrollmentId: "user-b-enrollment" }),
    )).rejects.toBeInstanceOf(LessonSessionEnrollmentUnavailableError);
  });

  it("rejects authoring-only draft lessons and course versions that are still in review", async () => {
    expect(RELEASED_LESSONS.some((lesson) => lesson.id === draftLesson.itemId))
      .toBe(false);
    const draftDatabase = new SQLiteD1();
    seedUser(draftDatabase, "user-a");
    await expect(repository(draftDatabase).open(
      "user-a",
      command("user-a", { lessonId: draftLesson.itemId }),
    )).rejects.toBeInstanceOf(LessonSessionContentUnavailableError);

    const reviewDatabase = new SQLiteD1();
    seedUser(reviewDatabase, "user-a", "review");
    await expect(repository(reviewDatabase).open(
      "user-a",
      command(),
    )).rejects.toBeInstanceOf(LessonSessionEnrollmentUnavailableError);
  });

  it("requires an exact passed server session for every prerequisite", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const sessions = repository(database);
    const nextCommand = command("user-a", {
      lessonId: secondLesson.id,
      idempotencyKey: "lesson-session:next",
    });

    await expect(sessions.open("user-a", nextCommand)).rejects.toBeInstanceOf(
      LessonSessionPrerequisiteUnavailableError,
    );

    seedPassedSession(database, "user-a", firstLesson.id);
    await expect(sessions.open("user-a", nextCommand)).resolves.toMatchObject({
      lessonId: secondLesson.id,
      duplicate: false,
    });
  });

  it("caps concurrently started forms per learner and reset epoch", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const timestamp = Date.parse("2026-07-22T05:30:00.000Z");
    for (let index = 0; index < MAX_ACTIVE_LESSON_SESSIONS; index += 1) {
      database.database.prepare(
        "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, 'user-a', 0, 'lesson-session-v1', ?, 'fixture', 'completed', ?, ?)",
      ).run(`cap-idempotency-${index}`, `cap-key-${index}`, timestamp, timestamp);
      database.database.prepare(
        "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, reset_epoch, content_version, lesson_id, lesson_version, expected_evidence_count, status, started_at, created_at) VALUES (?, 'user-a', 'user-a-enrollment', ?, 1, 0, ?, ?, ?, 10, 'started', ?, ?)",
      ).run(
        `cap-session-${index}`,
        `cap-idempotency-${index}`,
        CONTENT_VERSION,
        firstLesson.id,
        `${CONTENT_VERSION}:${firstLesson.id}:1`,
        timestamp,
        timestamp,
      );
    }

    await expect(repository(database).open("user-a", command()))
      .rejects.toBeInstanceOf(LessonSessionContentUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM lesson_sessions WHERE status = 'started'",
    ).get()).toEqual({ count: MAX_ACTIVE_LESSON_SESSIONS });
  });

  it("does not let historical-version sessions exhaust the current form cap", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const timestamp = Date.parse("2026-07-22T05:30:00.000Z");
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at, retired_at) VALUES ('foundation-previous', 'hanzi-os-core', 1, ?, 'retired', 'approved', ?, ?)",
    ).run(`sha256:${"1".repeat(64)}`, timestamp, timestamp);
    database.database.prepare(
      "INSERT INTO enrollments (id, user_id, course_version_id, goal, status, revision, started_at, last_activity_at) VALUES ('user-a-previous-enrollment', 'user-a', 'foundation-previous', 'conversation', 'archived', 1, ?, ?)",
    ).run(timestamp, timestamp);
    for (let index = 0; index < MAX_ACTIVE_LESSON_SESSIONS; index += 1) {
      database.database.prepare(
        "INSERT INTO idempotency_records (id, user_id, reset_epoch, scope, idempotency_key, request_hash, status, created_at, updated_at) VALUES (?, 'user-a', 0, 'lesson-session-v1', ?, 'fixture', 'completed', ?, ?)",
      ).run(
        `historical-idempotency-${index}`,
        `historical-key-${index}`,
        timestamp,
        timestamp,
      );
      database.database.prepare(
        "INSERT INTO lesson_sessions (id, user_id, enrollment_id, idempotency_record_id, schema_version, reset_epoch, content_version, lesson_id, lesson_version, expected_evidence_count, status, started_at, created_at) VALUES (?, 'user-a', 'user-a-previous-enrollment', ?, 1, 0, 'foundation-previous', 'retired-lesson', 'foundation-previous:retired-lesson:1', 10, 'started', ?, ?)",
      ).run(
        `historical-session-${index}`,
        `historical-idempotency-${index}`,
        timestamp,
        timestamp,
      );
    }

    await expect(repository(database).open("user-a", command()))
      .resolves.toMatchObject({ duplicate: false, lessonId: firstLesson.id });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM lesson_sessions WHERE status = 'started' AND content_version = ?",
    ).get(CONTENT_VERSION)).toEqual({ count: 1 });
  });

  it("fails closed under the real unpromoted current registry policy", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");

    await expect(new LessonSessionRepository(database).open(
      "user-a",
      command(),
    )).rejects.toBeInstanceOf(LessonSessionContentUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM lesson_sessions",
    ).get()).toEqual({ count: 0 });
  });
});
