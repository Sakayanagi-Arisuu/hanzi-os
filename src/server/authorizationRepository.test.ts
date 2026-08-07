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
  AuthorizationConcurrencyError,
  AuthorizationRepository,
  LastAdminProtectionError,
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

  it("grants the content editor role with optimistic concurrency and append-only audit", async () => {
    const database = new SQLiteD1();
    const sync = new SyncRepository(database);
    const roles = new AuthorizationRepository(database);
    const adminId = await sync.resolveUser(identity("admin@example.com"));
    const learnerId = await sync.resolveUser(identity("editor@example.com"));
    await roles.ensureBaselineRoles(adminId, true);

    await expect(roles.setRole({
      actorUserId: adminId,
      actorSessionId: "session-admin",
      targetUserId: learnerId,
      role: "content_editor",
      enabled: true,
      expectedRevision: 1,
      requestId: "request-role-editor-1",
    })).resolves.toMatchObject({
      authorization: { roles: ["learner", "content_editor"] },
      controlRevision: 2,
    });

    await expect(roles.setRole({
      actorUserId: adminId,
      actorSessionId: "session-admin",
      targetUserId: learnerId,
      role: "admin",
      enabled: true,
      expectedRevision: 1,
      requestId: "request-stale-admin-1",
    })).rejects.toBeInstanceOf(AuthorizationConcurrencyError);

    expect(database.database.prepare(
      "SELECT COUNT(*) AS count FROM audit_events WHERE action = 'role.granted'",
    ).get()).toEqual({ count: 1 });
    expect(() => database.database.prepare(
      "UPDATE audit_events SET outcome = 'failed'",
    ).run()).toThrow(/append-only/u);
    expect(() => database.database.prepare("DELETE FROM audit_events").run())
      .toThrow(/append-only/u);
  });

  it("protects the last active administrator at the database boundary", async () => {
    const database = new SQLiteD1();
    const sync = new SyncRepository(database);
    const roles = new AuthorizationRepository(database);
    const adminId = await sync.resolveUser(identity("admin@example.com"));
    const operatorId = await sync.resolveUser(identity("operator@example.com"));
    await roles.ensureBaselineRoles(adminId, true);

    await expect(roles.setRole({
      actorUserId: operatorId,
      actorSessionId: "session-operator",
      targetUserId: adminId,
      role: "admin",
      enabled: false,
      expectedRevision: 1,
      requestId: "request-last-admin-1",
    })).rejects.toBeInstanceOf(LastAdminProtectionError);
  });

  it("locks an account, revokes authentication, and does not let login unlock it", async () => {
    const database = new SQLiteD1();
    const sync = new SyncRepository(database);
    const roles = new AuthorizationRepository(database);
    const adminId = await sync.resolveUser(identity("admin@example.com"));
    const learnerIdentity = identity("learner@example.com");
    const learnerId = await sync.resolveUser(learnerIdentity);
    await roles.ensureBaselineRoles(adminId, true);

    await expect(roles.setAccountLocked({
      actorUserId: adminId,
      actorSessionId: "session-admin",
      targetUserId: learnerId,
      locked: true,
      reason: "Kiểm tra khóa an toàn",
      expectedRevision: 1,
      requestId: "request-lock-user-1",
    })).resolves.toEqual({ status: "locked", controlRevision: 2 });

    await expect(sync.resolveUser(learnerIdentity)).rejects.toThrow(/locked/u);
    expect(database.database.prepare(
      "SELECT status, control_revision AS revision FROM users WHERE id = ?",
    ).get(learnerId)).toEqual({ status: "locked", revision: 2 });
  });
});
