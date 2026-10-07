import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { PremiumSupportConflict, PremiumSupportRepository } from "./premiumSupportRepository";

class Statement implements D1PreparedStatement {
  private values: (string | number | null)[] = [];
  constructor(private statement: StatementSync) {}
  bind(...values: unknown[]) { this.values = values as (string | number | null)[]; return this; }
  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const row = this.statement.get(...this.values) as Record<string, unknown> | undefined;
    return row ? (columnName ? row[columnName] : row) as T : null;
  }
  async all<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    return { success: true, results: this.statement.all(...this.values) as T[] };
  }
  async run<T = Record<string, unknown>>(): Promise<D1RunResult<T>> {
    const result = this.statement.run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}
function database(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE premium_support_tickets (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL,category TEXT NOT NULL,subject TEXT NOT NULL,
    message TEXT NOT NULL,status TEXT NOT NULL,response TEXT,responded_by TEXT,
    created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL
  )`);
  db.exec(`CREATE TABLE audit_events (
    id TEXT PRIMARY KEY,category TEXT NOT NULL,action TEXT NOT NULL,outcome TEXT NOT NULL,
    actor_user_id TEXT,actor_session_id TEXT,target_type TEXT NOT NULL,target_id TEXT,
    request_id TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at INTEGER NOT NULL,
    CHECK(category IN ('auth','account','role','config','approval','publication')),
    UNIQUE(request_id,action,target_type,target_id)
  )`);
  return {
    prepare(query) { return new Statement(db.prepare(query)); },
    async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run<T>());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

describe("Premium support account boundary", () => {
  it("keeps requests and replies with their owner, and answers only once", async () => {
    const repository = new PremiumSupportRepository(database(), 1000);
    const ticket = await repository.create("owner-a", "access", "Không mở bài", "Tôi không mở được bài HSK4");
    expect(await repository.forOwner("owner-b")).toEqual([]);
    expect((await repository.queue()).map(item => item.id)).toEqual([ticket.id]);
    const answered = await repository.answerWithAudit(ticket.id, "admin-a", "session-a", "Đã kiểm tra quyền truy cập.", "request-1");
    expect(answered?.response).toBe("Đã kiểm tra quyền truy cập.");
    expect((await repository.forOwner("owner-a"))[0]?.status).toBe("answered");
    expect(await repository.queue()).toEqual([]);
    await expect(repository.answerWithAudit(ticket.id, "admin-b", "session-b", "Trả lời lần hai", "request-2")).rejects.toBeInstanceOf(PremiumSupportConflict);
  });
  it("rolls back the reply when audit fails, then records one event on retry", async () => {
    const db = database();
    const repository = new PremiumSupportRepository(db, 1000);
    const ticket = await repository.create("owner-a", "billing", "Kiểm tra gói", "Xin kiểm tra quyền bài học.");
    await db.prepare(`CREATE TRIGGER reject_support_audit BEFORE INSERT ON audit_events
      BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END`).run();
    await expect(repository.answerWithAudit(ticket.id, "admin", "session", "Đã kiểm tra gói học.", "request-fail"))
      .rejects.toThrow("audit unavailable");
    expect((await repository.forOwner("owner-a"))[0]).toMatchObject({ status: "open", response: null });
    await db.prepare("DROP TRIGGER reject_support_audit").run();
    await repository.answerWithAudit(ticket.id, "admin", "session", "Đã kiểm tra gói học.", "request-ok");
    const events = await db.prepare("SELECT actor_user_id AS actorUserId, request_id AS requestId FROM audit_events WHERE target_id=?")
      .bind(ticket.id).all<{ actorUserId: string; requestId: string }>();
    expect(events.results).toEqual([{ actorUserId: "admin", requestId: "request-ok" }]);
    await expect(repository.answerWithAudit(ticket.id, "admin", "session", "Đã trả lời.", "request-repeat"))
      .rejects.toBeInstanceOf(PremiumSupportConflict);
    expect((await db.prepare("SELECT id FROM audit_events").all()).results).toHaveLength(1);
  });
  it("limits outstanding requests per account", async () => {
    const repository = new PremiumSupportRepository(database());
    for (let index = 0; index < 3; index += 1) await repository.create("owner-a", "technical", `Lỗi ${index}`, "Ứng dụng không tải nội dung.");
    await expect(repository.create("owner-a", "technical", "Lỗi nữa", "Ứng dụng vẫn không tải.")).rejects.toBeInstanceOf(PremiumSupportConflict);
    await expect(repository.create("owner-b", "billing", "Gói học", "Xin kiểm tra giao dịch.")).resolves.toMatchObject({ userId: "owner-b" });
  });
});
