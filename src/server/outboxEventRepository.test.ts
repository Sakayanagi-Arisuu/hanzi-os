import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  OutboxEventRepository,
  OutboxEventRepositoryError,
} from "./outboxEventRepository";
import { OutboxPublisher } from "./outboxPublisher";

const LEASE_ONE = "00000000-0000-4000-8000-000000000001";
const LEASE_TWO = "00000000-0000-4000-8000-000000000002";
const LEASE_THREE = "00000000-0000-4000-8000-000000000003";
const LEASE_FOUR = "00000000-0000-4000-8000-000000000004";

class SQLiteStatement implements D1PreparedStatement {
  private parameters: unknown[] = [];

  constructor(private readonly statement: StatementSync) {}

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
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE users (
        id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE learning_documents (
        user_id TEXT PRIMARY KEY NOT NULL,
        document_json TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE outbox_events (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        reset_epoch INTEGER NOT NULL DEFAULT 0,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        available_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        published_at INTEGER,
        last_error TEXT,
        lease_token TEXT,
        lease_expires_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX outbox_events_status_available_idx
        ON outbox_events(status, available_at);
      CREATE INDEX outbox_events_status_lease_expiry_idx
        ON outbox_events(status, lease_expires_at);
    `);
  }

  prepare(query: string) {
    return new SQLiteStatement(this.database.prepare(query));
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
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

type MutableClock = {
  now: number;
};

const tokenSequence = (...tokens: string[]) => {
  let index = 0;
  return () => tokens[index++] ?? LEASE_FOUR;
};

const repository = (
  database: SQLiteD1,
  clock: MutableClock,
  ...tokens: string[]
) =>
  new OutboxEventRepository(database, {
    now: () => clock.now,
    createLeaseToken: tokenSequence(...tokens),
    leaseDurationMs: 1_000,
  });

const seedUser = (
  database: SQLiteD1,
  userId: string,
  options: {
    status?: "active" | "deletion_pending" | "deleted";
    resetEpoch?: number | null;
  } = {},
) => {
  database.database.prepare(
    "INSERT INTO users (id, status) VALUES (?, ?)",
  ).run(userId, options.status ?? "active");
  if (options.resetEpoch !== null) {
    database.database.prepare(
      "INSERT INTO learning_documents (user_id, document_json) VALUES (?, ?)",
    ).run(
      userId,
      JSON.stringify({ reset: { epoch: options.resetEpoch ?? 0 } }),
    );
  }
};

const seedEvent = (
  database: SQLiteD1,
  input: {
    id: string;
    userId: string;
    resetEpoch?: number;
    availableAt?: number;
    createdAt?: number;
    status?: "pending" | "processing" | "published" | "dead";
    attempts?: number;
    leaseToken?: string | null;
    leaseExpiresAt?: number | null;
  },
) => {
  database.database.prepare(
    `INSERT INTO outbox_events (
       id, user_id, aggregate_type, aggregate_id, event_type, schema_version,
       reset_epoch, payload_json, status, attempts, available_at, created_at,
       lease_token, lease_expires_at
     ) VALUES (?, ?, 'lesson_session', ?, 'lesson.completed', 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.userId,
    `aggregate-${input.id}`,
    input.resetEpoch ?? 0,
    JSON.stringify({ eventId: input.id }),
    input.status ?? "pending",
    input.attempts ?? 0,
    input.availableAt ?? 0,
    input.createdAt ?? 0,
    input.leaseToken ?? null,
    input.leaseExpiresAt ?? null,
  );
};

const readEvent = (database: SQLiteD1, eventId: string) =>
  database.database.prepare(
    `SELECT
       id,
       user_id AS userId,
       status,
       attempts,
       available_at AS availableAt,
       published_at AS publishedAt,
       last_error AS lastError,
       lease_token AS leaseToken,
       lease_expires_at AS leaseExpiresAt
     FROM outbox_events
     WHERE id = ?`,
  ).get(eventId) as
    | {
        id: string;
        userId: string;
        status: string;
        attempts: number;
        availableAt: number;
        publishedAt: number | null;
        lastError: string | null;
        leaseToken: string | null;
        leaseExpiresAt: number | null;
      }
    | undefined;

describe("OutboxEventRepository", () => {
  it("lets only one of two competing claimers lease a single event", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedEvent(database, { id: "event-a", userId: "user-a" });

    const firstRepository = repository(database, clock, LEASE_ONE);
    const secondRepository = repository(database, clock, LEASE_TWO);
    const claims = await Promise.all([
      firstRepository.claimNext(),
      secondRepository.claimNext(),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.filter(Boolean)[0]).toMatchObject({
      id: "event-a",
      userId: "user-a",
      attempts: 1,
      leaseExpiresAt: 2_000,
    });
    expect(readEvent(database, "event-a")).toMatchObject({
      status: "processing",
      attempts: 1,
    });
  });

  it("claims globally in deterministic available, created, and id order", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    seedEvent(database, {
      id: "event-later",
      userId: "user-a",
      availableAt: 900,
      createdAt: 1,
    });
    seedEvent(database, {
      id: "event-b",
      userId: "user-b",
      availableAt: 500,
      createdAt: 2,
    });
    seedEvent(database, {
      id: "event-a",
      userId: "user-a",
      availableAt: 500,
      createdAt: 2,
    });

    const outbox = repository(
      database,
      clock,
      LEASE_ONE,
      LEASE_TWO,
      LEASE_THREE,
    );

    expect((await outbox.claimNext())?.id).toBe("event-a");
    expect((await outbox.claimNext())?.id).toBe("event-b");
    expect((await outbox.claimNext())?.id).toBe("event-later");
  });

  it("recovers an expired lease without incrementing attempts and rejects every stale completion", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedEvent(database, { id: "event-a", userId: "user-a" });
    const outbox = repository(
      database,
      clock,
      LEASE_ONE,
      LEASE_TWO,
      LEASE_THREE,
    );

    const firstClaim = await outbox.claimNext();
    expect(firstClaim).toMatchObject({ attempts: 1, leaseToken: LEASE_ONE });
    expect(await outbox.leaseIsCurrent({
      eventId: "event-a",
      userId: "user-a",
      leaseToken: LEASE_ONE,
    })).toBe(true);

    clock.now = 2_000;
    expect(await outbox.leaseIsCurrent({
      eventId: "event-a",
      userId: "user-a",
      leaseToken: LEASE_ONE,
    })).toBe(false);
    expect(await outbox.recoverExpiredLeases()).toBe(1);
    expect(readEvent(database, "event-a")).toMatchObject({
      status: "pending",
      attempts: 1,
      leaseToken: null,
      leaseExpiresAt: null,
    });

    const secondClaim = await outbox.claimNext();
    expect(secondClaim).toMatchObject({ attempts: 2, leaseToken: LEASE_TWO });
    const staleIdentity = {
      eventId: "event-a",
      userId: "user-a",
      leaseToken: LEASE_ONE,
    };
    expect(await outbox.acknowledgePublished(staleIdentity)).toBe(false);
    expect(await outbox.scheduleRetry({
      ...staleIdentity,
      retryAt: 3_000,
      failureCode: "provider-timeout",
    })).toBe(false);
    expect(await outbox.markDead({
      ...staleIdentity,
      failureCode: "provider-rejected",
    })).toBe(false);
    expect(await outbox.acknowledgePublished({
      ...staleIdentity,
      leaseToken: LEASE_TWO,
    })).toBe(true);
  });

  it("schedules retry exactly at its due time and increments attempts only on the next claim", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedEvent(database, { id: "event-a", userId: "user-a" });
    const outbox = repository(
      database,
      clock,
      LEASE_ONE,
      LEASE_TWO,
      LEASE_THREE,
    );

    const claim = await outbox.claimNext();
    expect(claim?.attempts).toBe(1);
    expect(await outbox.scheduleRetry({
      eventId: "event-a",
      userId: "user-a",
      leaseToken: LEASE_ONE,
      retryAt: 6_000,
      failureCode: "provider-timeout",
    })).toBe(true);
    expect(readEvent(database, "event-a")).toMatchObject({
      status: "pending",
      attempts: 1,
      availableAt: 6_000,
      lastError: "provider-timeout",
      leaseToken: null,
    });

    clock.now = 5_999;
    expect(await outbox.claimNext()).toBeNull();
    clock.now = 6_000;
    expect(await outbox.claimNext()).toMatchObject({
      id: "event-a",
      attempts: 2,
      leaseToken: LEASE_THREE,
    });
  });

  it("dead-letters and explicitly requeues the same event without resetting its attempt history", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedEvent(database, { id: "event-a", userId: "user-a" });
    const outbox = repository(
      database,
      clock,
      LEASE_ONE,
      LEASE_TWO,
      LEASE_THREE,
    );

    await outbox.claimNext();
    expect(await outbox.markDead({
      eventId: "event-a",
      userId: "user-a",
      leaseToken: LEASE_ONE,
      failureCode: "delivery-exhausted",
    })).toBe(true);
    expect(readEvent(database, "event-a")).toMatchObject({
      id: "event-a",
      status: "dead",
      attempts: 1,
      lastError: "delivery-exhausted",
    });
    expect(await outbox.claimNext()).toBeNull();

    expect(await outbox.requeueDead({
      eventId: "event-a",
      userId: "user-a",
      expectedAttempts: 0,
    })).toBe(false);
    expect(await outbox.requeueDead({
      eventId: "event-a",
      userId: "user-a",
      expectedAttempts: 1,
    })).toBe(true);
    expect(readEvent(database, "event-a")).toMatchObject({
      id: "event-a",
      status: "pending",
      attempts: 1,
      availableAt: 1_000,
      lastError: null,
    });
    expect(await outbox.claimNext()).toMatchObject({
      id: "event-a",
      attempts: 2,
      leaseToken: LEASE_THREE,
    });
  });

  it("scopes lease completion and dead-letter replay to the claimed tenant", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedUser(database, "user-b");
    seedEvent(database, { id: "event-a", userId: "user-a" });
    const outbox = repository(database, clock, LEASE_ONE);
    await outbox.claimNext();

    const foreignIdentity = {
      eventId: "event-a",
      userId: "user-b",
      leaseToken: LEASE_ONE,
    };
    expect(await outbox.acknowledgePublished(foreignIdentity)).toBe(false);
    expect(await outbox.scheduleRetry({
      ...foreignIdentity,
      retryAt: 2_000,
      failureCode: "provider-timeout",
    })).toBe(false);
    expect(await outbox.markDead({
      ...foreignIdentity,
      failureCode: "delivery-exhausted",
    })).toBe(false);
    expect(readEvent(database, "event-a")?.status).toBe("processing");

    expect(await outbox.markDead({
      ...foreignIdentity,
      userId: "user-a",
      failureCode: "delivery-exhausted",
    })).toBe(true);
    expect(await outbox.requeueDead({
      eventId: "event-a",
      userId: "user-b",
      expectedAttempts: 1,
    })).toBe(false);
    expect(await outbox.requeueDead({
      eventId: "event-a",
      userId: "user-a",
      expectedAttempts: 1,
    })).toBe(true);
  });

  it("makes late lease completion a no-op after reset or account deletion", async () => {
    const resetDatabase = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(resetDatabase, "user-reset");
    seedEvent(resetDatabase, {
      id: "event-reset",
      userId: "user-reset",
    });
    const resetOutbox = repository(resetDatabase, clock, LEASE_ONE);
    await resetOutbox.claimNext();
    resetDatabase.database.prepare(
      "UPDATE learning_documents SET document_json = ? WHERE user_id = ?",
    ).run(JSON.stringify({ reset: { epoch: 1 } }), "user-reset");

    const resetLease = {
      eventId: "event-reset",
      userId: "user-reset",
      leaseToken: LEASE_ONE,
    };
    expect(await resetOutbox.leaseIsCurrent(resetLease)).toBe(false);
    expect(await resetOutbox.acknowledgePublished(resetLease)).toBe(false);
    expect(await resetOutbox.scheduleRetry({
      ...resetLease,
      retryAt: 2_000,
      failureCode: "provider-timeout",
    })).toBe(false);
    expect(await resetOutbox.markDead({
      ...resetLease,
      failureCode: "delivery-exhausted",
    })).toBe(false);
    expect(await resetOutbox.recoverExpiredLeases()).toBe(0);

    const deletedDatabase = new SQLiteD1();
    seedUser(deletedDatabase, "user-deleted");
    seedEvent(deletedDatabase, {
      id: "event-deleted",
      userId: "user-deleted",
    });
    const deletedOutbox = repository(deletedDatabase, clock, LEASE_TWO);
    await deletedOutbox.claimNext();
    deletedDatabase.database.prepare(
      "DELETE FROM users WHERE id = ?",
    ).run("user-deleted");
    const deletedLease = {
      eventId: "event-deleted",
      userId: "user-deleted",
      leaseToken: LEASE_TWO,
    };
    expect(await deletedOutbox.leaseIsCurrent(deletedLease)).toBe(false);
    expect(await deletedOutbox.acknowledgePublished(deletedLease)).toBe(false);
    expect(await deletedOutbox.scheduleRetry({
      ...deletedLease,
      retryAt: 2_000,
      failureCode: "provider-timeout",
    })).toBe(false);
    expect(await deletedOutbox.markDead({
      ...deletedLease,
      failureCode: "delivery-exhausted",
    })).toBe(false);
  });

  it("skips stale epochs and inactive accounts while claiming a current active event", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-stale", { resetEpoch: 2 });
    seedUser(database, "user-inactive", {
      status: "deletion_pending",
      resetEpoch: 0,
    });
    seedUser(database, "user-current", { resetEpoch: 3 });
    seedEvent(database, {
      id: "event-stale",
      userId: "user-stale",
      resetEpoch: 1,
      availableAt: 1,
    });
    seedEvent(database, {
      id: "event-inactive",
      userId: "user-inactive",
      resetEpoch: 0,
      availableAt: 2,
    });
    seedEvent(database, {
      id: "event-current",
      userId: "user-current",
      resetEpoch: 3,
      availableAt: 3,
    });
    const outbox = repository(database, clock, LEASE_ONE, LEASE_TWO);

    expect(await outbox.claimNext()).toMatchObject({
      id: "event-current",
      userId: "user-current",
      resetEpoch: 3,
    });
    expect(await outbox.claimNext()).toBeNull();
    expect(readEvent(database, "event-stale")?.status).toBe("pending");
    expect(readEvent(database, "event-inactive")?.status).toBe("pending");
  });

  it("rejects raw diagnostic text instead of persisting provider errors", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedEvent(database, { id: "event-a", userId: "user-a" });
    const outbox = repository(database, clock, LEASE_ONE);
    await outbox.claimNext();

    await expect(outbox.scheduleRetry({
      eventId: "event-a",
      userId: "user-a",
      leaseToken: LEASE_ONE,
      retryAt: 2_000,
      failureCode: "HTTP 500: raw provider body",
    })).rejects.toBeInstanceOf(OutboxEventRepositoryError);
    expect(readEvent(database, "event-a")).toMatchObject({
      status: "processing",
      lastError: null,
    });
  });

  it("drains the concrete D1 lease repository through the publisher contract", async () => {
    const database = new SQLiteD1();
    const clock = { now: 1_000 };
    seedUser(database, "user-a");
    seedEvent(database, { id: "event-a", userId: "user-a" });
    database.database.prepare(
      `UPDATE outbox_events
       SET aggregate_id = 'lesson-session',
           event_type = 'lesson.started',
           payload_json = ?
       WHERE id = 'event-a'`,
    ).run(JSON.stringify({
      sessionId: "lesson-session",
      enrollmentId: "enrollment",
      contentVersion: "foundation-2026.07.3",
      resetEpoch: 0,
      contentManifestSha256: `sha256:${"a".repeat(64)}`,
      lessonId: "lesson-1",
      lessonVersion: "lesson-1-v1",
      expectedEvidenceCount: 3,
      formSchemaVersion: 1,
      formHash: `sha256:${"b".repeat(64)}`,
      startedAt: "2026-07-25T00:00:00.000Z",
    }));
    const outbox = repository(database, clock, LEASE_ONE);
    const deliveredEventIds: string[] = [];

    const summary = await new OutboxPublisher({
      repository: outbox,
      sink: {
        publish: async (event) => {
          deliveredEventIds.push(event.eventId);
          return { ok: true } as const;
        },
      },
      clock: { now: () => clock.now },
      policy: {
        batchSize: 2,
        maximumAttempts: 3,
        initialRetryDelayMs: 1_000,
        maximumRetryDelayMs: 60_000,
        maximumPayloadBytes: 64 * 1024,
      },
    }).drain();

    expect(deliveredEventIds).toEqual(["event-a"]);
    expect(summary).toMatchObject({
      claimed: 1,
      published: 1,
      repositoryFailures: 0,
      staleLeaseTransitions: 0,
    });
    expect(readEvent(database, "event-a")).toMatchObject({
      status: "published",
      attempts: 1,
      publishedAt: 1_000,
      leaseToken: null,
      leaseExpiresAt: null,
    });
  });
});
