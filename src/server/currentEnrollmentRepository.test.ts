import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type { ContentReleasePolicy } from "./contentReleasePolicy";
import {
  CurrentEnrollmentContentUnavailableError,
  CurrentEnrollmentProfileUnavailableError,
  CurrentEnrollmentRepository,
} from "./currentEnrollmentRepository";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";

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

const promotedPolicy: ContentReleasePolicy = {
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: true,
  productionEligible: false,
  promotionChannel: "closed-alpha",
  promotionManifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
};

const seedUser = (
  database: SQLiteD1,
  userId: string,
  options: {
    goal?: "conversation" | "hsk" | "career" | "travel";
    onboarded?: boolean;
  } = {},
) => {
  const now = Date.parse("2026-07-22T06:00:00.000Z");
  database.database.prepare(
    "INSERT INTO users (id, status, created_at, updated_at) VALUES (?, 'active', ?, ?)",
  ).run(userId, now, now);
  database.database.prepare(
    `INSERT INTO profiles (
       user_id, display_name, goal, daily_minutes, script, starting_level,
       onboarded, revision, created_at, updated_at
     ) VALUES (?, 'Learner', ?, 20, 'simplified', 'zero', ?, 1, ?, ?)`,
  ).run(
    userId,
    options.goal ?? "conversation",
    options.onboarded === false ? 0 : 1,
    now,
    now,
  );
};

const seedStoredCurrentRelease = (database: SQLiteD1) => {
  const now = Date.parse("2026-07-22T06:00:00.000Z");
  database.database.prepare(
    `INSERT INTO course_versions (
       id, course_id, schema_version, manifest_hash, release_state,
       linguistic_review_status, created_at, published_at
     ) VALUES (?, 'hanzi-os-core', 1, ?, 'beta', 'approved', ?, ?)`,
  ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256, now, now);
};

const seedPreviousEnrollment = (
  database: SQLiteD1,
  userId: string,
  enrollmentId = `${userId}-previous`,
) => {
  const now = Date.parse("2026-07-21T06:00:00.000Z");
  const previousVersion = `${CONTENT_VERSION}-previous`;
  database.database.prepare(
    `INSERT OR IGNORE INTO course_versions (
       id, course_id, schema_version, manifest_hash, release_state,
       linguistic_review_status, created_at
     ) VALUES (?, 'hanzi-os-core', 1, ?, 'retired', 'approved', ?)`,
  ).run(previousVersion, `sha256:${"b".repeat(64)}`, now);
  database.database.prepare(
    `INSERT INTO enrollments (
       id, user_id, course_version_id, goal, status, revision,
       started_at, last_activity_at
     ) VALUES (?, ?, ?, 'conversation', 'active', 1, ?, ?)`,
  ).run(enrollmentId, userId, previousVersion, now, now);
  return enrollmentId;
};

describe("current enrollment repository", () => {
  it("fails closed under the default unpromoted policy even if D1 looks released", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    seedStoredCurrentRelease(database);

    await expect(new CurrentEnrollmentRepository(database).activate("user-a"))
      .rejects.toBeInstanceOf(CurrentEnrollmentContentUnavailableError);
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM enrollments WHERE user_id = 'user-a'",
    ).get()).toEqual({ count: 0 });
  });

  it("atomically creates the exact enrollment and archives its predecessor", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const previousId = seedPreviousEnrollment(database, "user-a");

    const receipt = await new CurrentEnrollmentRepository(
      database,
      promotedPolicy,
    ).activate("user-a");

    expect(receipt).toMatchObject({
      protocolVersion: 1,
      courseId: "hanzi-os-core",
      contentVersion: CONTENT_VERSION,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "beta",
      goal: "conversation",
    });
    expect(database.database.prepare(
      `SELECT id, status, supersedes_enrollment_id AS supersedesEnrollmentId
       FROM enrollments WHERE user_id = ?
       ORDER BY CASE status WHEN 'archived' THEN 0 ELSE 1 END, id`,
    ).all("user-a")).toEqual([
      { id: previousId, status: "archived", supersedesEnrollmentId: null },
      {
        id: receipt.enrollmentId,
        status: "active",
        supersedesEnrollmentId: previousId,
      },
    ]);
    expect(database.database.prepare(
      `SELECT entity_type AS entityType, entity_id AS entityId,
              revision, reset_epoch AS resetEpoch, payload_json AS payloadJson
       FROM sync_changes WHERE user_id = ?`,
    ).all("user-a")).toEqual([{
      entityType: "enrollment",
      entityId: receipt.enrollmentId,
      revision: 1,
      resetEpoch: 0,
      payloadJson: '{"kind":"current-enrollment"}',
    }]);
  });

  it("returns the same enrollment on exact retry without revision churn", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = new CurrentEnrollmentRepository(database, promotedPolicy);

    const first = await repository.activate("user-a");
    const second = await repository.activate("user-a");

    expect(second).toEqual(first);
    expect(database.database.prepare(
      `SELECT COUNT(*) AS count, MIN(revision) AS revision
       FROM enrollments WHERE user_id = ? AND course_version_id = ?`,
    ).get("user-a", CONTENT_VERSION)).toEqual({ count: 1, revision: 1 });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM sync_changes WHERE user_id = ? AND entity_type = 'enrollment'",
    ).get("user-a")).toEqual({ count: 1 });
  });

  it("reactivates the current row and copies only the current profile goal", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a");
    const repository = new CurrentEnrollmentRepository(database, promotedPolicy);
    const first = await repository.activate("user-a");
    database.database.prepare(
      "UPDATE enrollments SET status = 'paused' WHERE id = ?",
    ).run(first.enrollmentId);
    database.database.prepare(
      "UPDATE profiles SET goal = 'travel' WHERE user_id = 'user-a'",
    ).run();

    const receipt = await repository.activate("user-a");

    expect(receipt).toMatchObject({
      enrollmentId: first.enrollmentId,
      goal: "travel",
    });
    expect(database.database.prepare(
      "SELECT status, goal, revision FROM enrollments WHERE id = ?",
    ).get(first.enrollmentId)).toEqual({
      status: "active",
      goal: "travel",
      revision: 2,
    });
    expect(database.database.prepare(
      `SELECT revision, operation_id AS operationId
       FROM sync_changes
       WHERE user_id = ? AND entity_type = 'enrollment'
       ORDER BY revision`,
    ).all("user-a")).toEqual([
      {
        revision: 1,
        operationId: `normalized:enrollment-activated:${first.enrollmentId}:1`,
      },
      {
        revision: 2,
        operationId: `normalized:enrollment-activated:${first.enrollmentId}:2`,
      },
    ]);
  });

  it("does not archive an old enrollment when the profile is not onboarded", async () => {
    const database = new SQLiteD1();
    seedUser(database, "user-a", { onboarded: false });
    const previousId = seedPreviousEnrollment(database, "user-a");

    await expect(new CurrentEnrollmentRepository(
      database,
      promotedPolicy,
    ).activate("user-a")).rejects.toBeInstanceOf(
      CurrentEnrollmentProfileUnavailableError,
    );
    expect(database.database.prepare(
      "SELECT status FROM enrollments WHERE id = ?",
    ).get(previousId)).toEqual({ status: "active" });
    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM enrollments WHERE user_id = ? AND course_version_id = ?",
    ).get("user-a", CONTENT_VERSION)).toEqual({ count: 0 });
  });
});
