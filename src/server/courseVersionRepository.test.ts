import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import type { ContentReleasePolicy } from "./contentReleasePolicy";
import {
  CourseVersionBindingError,
  ensureCurrentCourseVersion,
} from "./courseVersionRepository";
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
    if (/^\s*SELECT\b/iu.test(this.query)) {
      return this.all<T>();
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
    const results: Array<D1RunResult<T>> = [];
    for (const statement of statements) results.push(await statement.run<T>());
    return results;
  }
}

const policy = (
  channel: "closed-alpha" | "production" | null,
): ContentReleasePolicy => ({
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  audience: channel === "production" ? "public" : "closed-alpha",
  lifecycle: "published",
  closedAlphaEligible: channel !== null,
  productionEligible: channel === "production",
  promotionChannel: channel,
  promotionManifestSha256: channel
    ? CURRENT_CONTENT_MANIFEST_SHA256
    : null,
});

const storedState = (database: SQLiteD1) => database.database.prepare(
  "SELECT manifest_hash AS manifestHash, release_state AS releaseState, linguistic_review_status AS linguisticReviewStatus FROM course_versions WHERE id = ?",
).get(CONTENT_VERSION);

describe("course-version release activation", () => {
  it("creates an exact but unapproved review anchor for an honest candidate", async () => {
    const database = new SQLiteD1();

    await ensureCurrentCourseVersion(database, policy(null));

    expect(storedState(database)).toEqual({
      manifestHash: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "review",
      linguisticReviewStatus: "pending",
    });
  });

  it("activates an exact closed-alpha package as beta and remains idempotent", async () => {
    const database = new SQLiteD1();

    await ensureCurrentCourseVersion(database, policy("closed-alpha"));
    await ensureCurrentCourseVersion(database, policy("closed-alpha"));

    expect(storedState(database)).toEqual({
      manifestHash: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "beta",
      linguisticReviewStatus: "approved",
    });
  });

  it("allows an exact approved beta package to advance to production", async () => {
    const database = new SQLiteD1();
    await ensureCurrentCourseVersion(database, policy("closed-alpha"));

    await ensureCurrentCourseVersion(database, policy("production"));

    expect(storedState(database)).toEqual({
      manifestHash: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "published",
      linguisticReviewStatus: "approved",
    });
  });

  it("never overwrites a manifest collision for the same version", async () => {
    const database = new SQLiteD1();
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'review', 'pending', 1)",
    ).run(CONTENT_VERSION, `sha256:${"0".repeat(64)}`);

    await expect(
      ensureCurrentCourseVersion(database, policy("closed-alpha")),
    ).rejects.toBeInstanceOf(CourseVersionBindingError);
    expect(storedState(database)).toEqual({
      manifestHash: `sha256:${"0".repeat(64)}`,
      releaseState: "review",
      linguisticReviewStatus: "pending",
    });
  });

  it("does not revive an explicitly rejected exact package", async () => {
    const database = new SQLiteD1();
    database.database.prepare(
      "INSERT INTO course_versions (id, course_id, schema_version, manifest_hash, release_state, linguistic_review_status, created_at) VALUES (?, 'hanzi-os-core', 1, ?, 'review', 'rejected', 1)",
    ).run(CONTENT_VERSION, CURRENT_CONTENT_MANIFEST_SHA256);

    await expect(
      ensureCurrentCourseVersion(database, policy("closed-alpha")),
    ).rejects.toBeInstanceOf(CourseVersionBindingError);
    expect(storedState(database)).toEqual({
      manifestHash: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "review",
      linguisticReviewStatus: "rejected",
    });
  });
});
