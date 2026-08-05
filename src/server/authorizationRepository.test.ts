import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { ChatGPTUser } from "../../app/chatgpt-auth";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  AdminRoleSelfRevocationError,
  AuthorizationRepository,
} from "./authorizationRepository";
import { SyncRepository } from "./syncRepository";

const migrationDirectory = new URL("../../drizzle/", import.meta.url);
const migrations = readdirSync(migrationDirectory)
  .filter((file) => /^\d+.*\.sql$/u.test(file))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationDirectory), "utf8"))
  .join("\n")
  .replaceAll("--> statement-breakpoint", "");

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

  private values() {
    return this.parameters as Array<string | number | bigint | Uint8Array | null>;
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.values()) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return { success: true, results: this.statement.all(...this.values()) as T[] };
  }

  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    if (/^\s*SELECT\b/iu.test(this.query)) return this.all<T>();
    const result = this.statement.run(...this.values());
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
    this.database.exec(migrations);
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

const identity = (email: string): ChatGPTUser => ({
  displayName: email.split("@")[0] ?? email,
  email,
  fullName: null,
});

describe("authorization repository", () => {
  it("materializes learner/admin roles and exposes them in the user directory", async () => {
    const database = new SQLiteD1();
    const sync = new SyncRepository(database);
    const roles = new AuthorizationRepository(database);
    const adminId = await sync.resolveUser(identity("admin@example.com"));
    const learnerId = await sync.resolveUser(identity("learner@example.com"));

    await roles.ensureBaselineRoles(adminId, true);
    await roles.ensureBaselineRoles(learnerId, false);

    await expect(roles.getAuthorization(adminId)).resolves.toMatchObject({
      roles: ["learner", "admin"],
    });
    await expect(roles.listUsers()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ email: "admin@example.com", roles: ["learner", "admin"] }),
      expect.objectContaining({ email: "learner@example.com", roles: ["learner"] }),
    ]));
  });

  it("lets an admin grant and revoke another account without removing learner access", async () => {
    const database = new SQLiteD1();
    const sync = new SyncRepository(database);
    const roles = new AuthorizationRepository(database);
    const adminId = await sync.resolveUser(identity("admin@example.com"));
    const learnerId = await sync.resolveUser(identity("learner@example.com"));
    await roles.ensureBaselineRoles(adminId, true);
    await roles.ensureBaselineRoles(learnerId, false);

    await expect(roles.setAdminRole(adminId, learnerId, true)).resolves.toMatchObject({
      roles: ["learner", "admin"],
    });
    await expect(roles.setAdminRole(adminId, learnerId, false)).resolves.toMatchObject({
      roles: ["learner"],
    });
  });

  it("prevents an administrator from locking themselves out", async () => {
    const database = new SQLiteD1();
    const sync = new SyncRepository(database);
    const roles = new AuthorizationRepository(database);
    const adminId = await sync.resolveUser(identity("admin@example.com"));
    await roles.ensureBaselineRoles(adminId, true);

    await expect(roles.setAdminRole(adminId, adminId, false)).rejects.toBeInstanceOf(
      AdminRoleSelfRevocationError,
    );
  });
});
