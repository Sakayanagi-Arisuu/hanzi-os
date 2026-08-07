import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type {
  D1Database,
  D1PreparedStatement,
  D1RunResult,
} from "./d1";
import {
  AuthRepository,
  IdentityAlreadyLinkedError,
  SESSION_COOKIE_NAME,
  serializeSessionCookie,
} from "./authRepository";
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
    return { success: true, meta: { changes: Number(result.changes) } };
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

const identity = (provider: "google" | "email_otp", subject: string, email: string) => ({
  provider,
  providerSubject: subject,
  email,
  emailVerified: true,
  displayName: "Học viên",
} as const);

describe("multi-method identity repository", () => {
  it("migrates session, challenge and passkey tables with their safety constraints", () => {
    const d1 = new SQLiteD1();
    const tables = d1.database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all().map((row) => row.name);
    expect(tables).toEqual(expect.arrayContaining([
      "auth_challenges",
      "auth_sessions",
      "passkey_credentials",
    ]));
    expect(() => d1.database.prepare(
      "INSERT INTO auth_sessions (id, user_id, token_hash, auth_method, authenticated_at, created_at, last_seen_at, expires_at) VALUES ('invalid', 'missing', 'hash', 'password', 1, 1, 1, 2)",
    ).run()).toThrow();
  });

  it("never auto-links providers solely because verified emails match", async () => {
    const repository = new AuthRepository(new SQLiteD1());
    const google = await repository.resolveOrCreateIdentity(
      identity("google", "google-subject-a", "same@example.com"),
    );
    const email = await repository.resolveOrCreateIdentity(
      identity("email_otp", "same@example.com", "same@example.com"),
    );
    expect(email.userId).not.toBe(google.userId);
  });

  it("links only after an explicit target account and rejects cross-account takeover", async () => {
    const repository = new AuthRepository(new SQLiteD1());
    const accountA = await repository.resolveOrCreateIdentity(
      identity("google", "google-a", "a@example.com"),
    );
    const accountB = await repository.resolveOrCreateIdentity(
      identity("google", "google-b", "b@example.com"),
    );
    const linked = await repository.resolveOrCreateIdentity(
      identity("email_otp", "a@example.com", "a@example.com"),
      accountA.userId,
    );
    expect(linked.userId).toBe(accountA.userId);
    await expect(repository.resolveOrCreateIdentity(
      identity("email_otp", "a@example.com", "a@example.com"),
      accountB.userId,
    )).rejects.toBeInstanceOf(IdentityAlreadyLinkedError);
  });

  it("stores only a digest of the session bearer and revokes the device session", async () => {
    const d1 = new SQLiteD1();
    const repository = new AuthRepository(d1);
    const account = await repository.resolveOrCreateIdentity(
      identity("email_otp", "learner@example.com", "learner@example.com"),
    );
    const session = await repository.createSession({
      userId: account.userId,
      identityId: account.identityId,
      authMethod: "email_otp",
      userAgent: "test-browser",
      deviceLabel: "Máy thử",
    });
    const stored = d1.database.prepare(
      "SELECT token_hash AS tokenHash FROM auth_sessions WHERE id = ?",
    ).get(session.sessionId) as { tokenHash: string };
    expect(stored.tokenHash).not.toBe(session.token);
    await expect(repository.resolveSession(session.token)).resolves.toMatchObject({
      userId: account.userId,
      sessionId: session.sessionId,
    });
    await expect(repository.revokeSession(account.userId, session.sessionId)).resolves.toBe(true);
    await expect(repository.resolveSession(session.token)).resolves.toBeNull();
  });

  it("keeps the stable internal user when local guest progress enters sync", async () => {
    const d1 = new SQLiteD1();
    const repository = new AuthRepository(d1);
    const account = await repository.resolveOrCreateIdentity(
      identity("google", "google-guest-merge", "merge@example.com"),
    );
    const resolved = await new SyncRepository(d1).resolveUser({
      userId: account.userId,
      displayName: "Merge",
      email: "merge@example.com",
      fullName: "Merge",
    });
    expect(resolved).toBe(account.userId);
  });

  it("uses a host-only secure HttpOnly cookie with no localStorage token", () => {
    const cookie = serializeSessionCookie("opaque-token");
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=opaque-token`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Domain=");
  });
});
