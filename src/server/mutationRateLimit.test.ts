import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  ACCOUNT_DELETE_MUTATION_POLICY,
  consumeMutationRateLimit,
  LEARNING_ATTEMPT_MUTATION_POLICY,
  LESSON_SESSION_ABANDON_MUTATION_POLICY,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
  READER_ATTEMPT_MUTATION_POLICY,
  READER_SESSION_ABANDON_MUTATION_POLICY,
  READER_SESSION_OPEN_MUTATION_POLICY,
  READER_SESSION_SUBMIT_MUTATION_POLICY,
  REVIEW_GRADE_MUTATION_POLICY,
  SYNC_PUSH_MUTATION_POLICY,
  type MutationRateLimitPolicy,
} from "./mutationRateLimit";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migration = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n");

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
    return new SQLiteStatement(this.database.prepare(query));
  }

  async batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<Array<D1RunResult<T>>> {
    return Promise.all(statements.map((statement) => statement.run<T>()));
  }
}

const TEST_POLICY = {
  scope: "test.mutation.write",
  policyVersion: "test-v1",
  maxRequests: 3,
  windowSeconds: 60,
} as const satisfies MutationRateLimitPolicy;

const createDatabase = () => {
  const d1 = new SQLiteD1();
  d1.database.exec(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES ('user-a', 'active', 1, 1), ('user-b', 'active', 1, 1)",
  );
  return d1;
};

describe("persistent mutation rate limiting", () => {
  it("publishes an explicit versioned attempt policy", () => {
    expect(LEARNING_ATTEMPT_MUTATION_POLICY).toEqual({
      scope: "learning.attempts.write",
      policyVersion: "2026-07-22.v1",
      maxRequests: 60,
      windowSeconds: 60,
    });
    expect(SYNC_PUSH_MUTATION_POLICY).toEqual({
      scope: "sync.push.write",
      policyVersion: "2026-07-22.v1",
      maxRequests: 120,
      windowSeconds: 300,
    });
    expect(ACCOUNT_DELETE_MUTATION_POLICY).toEqual({
      scope: "account.delete",
      policyVersion: "2026-07-22.v1",
      maxRequests: 3,
      windowSeconds: 3_600,
    });
    expect(LESSON_SESSION_ABANDON_MUTATION_POLICY).toEqual({
      scope: "learning.lesson-sessions.abandon",
      policyVersion: "2026-07-22.v1",
      maxRequests: 30,
      windowSeconds: 600,
    });
    expect(REVIEW_GRADE_MUTATION_POLICY).toEqual({
      scope: "learning.reviews.grade",
      policyVersion: "2026-07-26.v1",
      maxRequests: 120,
      windowSeconds: 600,
    });
    expect(READER_SESSION_OPEN_MUTATION_POLICY).toEqual({
      scope: "learning.reader-sessions.open",
      policyVersion: "2026-07-26.v1",
      maxRequests: 30,
      windowSeconds: 600,
    });
    expect(READER_ATTEMPT_MUTATION_POLICY).toEqual({
      scope: "learning.reader-attempts.write",
      policyVersion: "2026-07-26.v1",
      maxRequests: 120,
      windowSeconds: 600,
    });
    expect(READER_SESSION_SUBMIT_MUTATION_POLICY).toEqual({
      scope: "learning.reader-sessions.submit",
      policyVersion: "2026-07-26.v1",
      maxRequests: 30,
      windowSeconds: 600,
    });
    expect(READER_SESSION_ABANDON_MUTATION_POLICY).toEqual({
      scope: "learning.reader-sessions.abandon",
      policyVersion: "2026-07-26.v1",
      maxRequests: 30,
      windowSeconds: 600,
    });
  });

  it("returns consistent pacing headers for accepted and rejected decisions", () => {
    expect(mutationRateLimitHeaders({
      allowed: true,
      limit: 120,
      remaining: 119,
      resetAfterSeconds: 300,
      retryAfterSeconds: 0,
      windowEndsAt: 300_000,
      policyVersion: "sync-v1",
    })).toEqual({
      "ratelimit-limit": "120",
      "ratelimit-remaining": "119",
      "ratelimit-reset": "300",
      "x-rate-limit-policy-version": "sync-v1",
    });
    expect(mutationRateLimitHeaders({
      allowed: false,
      limit: 3,
      remaining: 0,
      resetAfterSeconds: 42,
      retryAfterSeconds: 42,
      windowEndsAt: 42_000,
      policyVersion: "delete-v1",
    })).toMatchObject({
      "retry-after": "42",
      "ratelimit-limit": "3",
      "ratelimit-remaining": "0",
      "ratelimit-reset": "42",
      "x-rate-limit-policy-version": "delete-v1",
    });
  });

  it("allows the boundary request and denies the next request", async () => {
    const d1 = createDatabase();
    const now = Date.UTC(2026, 6, 22, 8, 0, 0);

    await expect(consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now))
      .resolves.toMatchObject({ allowed: true, remaining: 2 });
    await expect(consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + 1))
      .resolves.toMatchObject({ allowed: true, remaining: 1 });
    await expect(consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + 2))
      .resolves.toMatchObject({ allowed: true, remaining: 0 });
    await expect(consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + 3))
      .resolves.toMatchObject({
        allowed: false,
        remaining: 0,
        retryAfterSeconds: 60,
      });
  });

  it("atomically rolls the same persistent row over at the next window", async () => {
    const d1 = createDatabase();
    const now = Date.UTC(2026, 6, 22, 8, 0, 0);
    for (let index = 0; index < TEST_POLICY.maxRequests; index += 1) {
      await consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + index);
    }

    await expect(consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + 60_000))
      .resolves.toMatchObject({ allowed: true, remaining: 2 });
    expect(d1.database.prepare(
      "SELECT COUNT(*) AS count FROM mutation_rate_limits WHERE user_id = 'user-a'",
    ).get()).toEqual({ count: 1 });
  });

  it("isolates counters by authenticated user without an IP or client key", async () => {
    const d1 = createDatabase();
    const now = Date.UTC(2026, 6, 22, 8, 0, 0);
    for (let index = 0; index < TEST_POLICY.maxRequests; index += 1) {
      await consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + index);
    }

    await expect(consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + 4))
      .resolves.toMatchObject({ allowed: false });
    await expect(consumeMutationRateLimit(d1, "user-b", TEST_POLICY, now + 4))
      .resolves.toMatchObject({ allowed: true, remaining: 2 });
  });

  it("does not over-admit when many requests consume the same window", async () => {
    const d1 = createDatabase();
    const now = Date.UTC(2026, 6, 22, 8, 0, 0);
    const decisions = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        consumeMutationRateLimit(d1, "user-a", TEST_POLICY, now + index)),
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(3);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(9);
  });

  it("fails closed when D1 cannot persist the counter", async () => {
    const database = {
      prepare() {
        throw new Error("D1 unavailable");
      },
      async batch() {
        return [];
      },
    } satisfies D1Database;

    await expect(consumeMutationRateLimit(
      database,
      "user-a",
      TEST_POLICY,
      Date.UTC(2026, 6, 22),
    )).rejects.toBeInstanceOf(MutationRateLimitBackendError);
  });
});
