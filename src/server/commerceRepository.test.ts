import { DatabaseSync, type StatementSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import { CommerceConflict, CommerceRepository } from "./commerceRepository";
import { addCalendarMonths, premiumAccess } from "../commerce/policy";

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
  db.exec(`CREATE TABLE commerce_sandbox_orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL,
    paid_at INTEGER, updated_at INTEGER NOT NULL, refund_requested_at INTEGER,
    refund_reason TEXT, refunded_by TEXT,
    UNIQUE(user_id,idempotency_key)
  )`);
  db.exec(`CREATE TABLE audit_events (
    id TEXT PRIMARY KEY, category TEXT NOT NULL, action TEXT NOT NULL,
    outcome TEXT NOT NULL, actor_user_id TEXT, actor_session_id TEXT,
    target_type TEXT NOT NULL, target_id TEXT, request_id TEXT NOT NULL,
    metadata_json TEXT NOT NULL, created_at INTEGER NOT NULL,
    CHECK(category IN ('auth','account','role','config','approval','publication')),
    UNIQUE(request_id,action,target_type,target_id)
  )`);
  db.exec(`CREATE TABLE hanzi_premium_orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL,
    amount INTEGER NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL,
    paid_at INTEGER NOT NULL, refund_requested_at INTEGER, refund_reason TEXT,
    refunded_by TEXT
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
describe("Premium HSK4 sandbox ledger", () => {
  it("commits the admin refund and audit together, and rolls both back when audit insert fails", async () => {
    const db = database();
    const repository = new CommerceRepository(db, Date.UTC(2026, 8, 25));
    const order = await repository.create("learner", "hsk4-month", "key-0000000000000005");
    await repository.settle("learner", order.id, "paid");
    await repository.requestRefund("learner", order.id, "Không còn nhu cầu học bài HSK4");
    await db.prepare(`CREATE TRIGGER reject_commerce_audit BEFORE INSERT ON audit_events
      BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END`).run();
    await expect(repository.refundWithAudit(order.id, "admin", "admin-session", "request-1"))
      .rejects.toThrow("audit unavailable");
    expect((await repository.get("learner", order.id)).status).toBe("paid");
    expect((await repository.access("learner")).active).toBe(true);
    await db.prepare("DROP TRIGGER reject_commerce_audit").run();
    await repository.refundWithAudit(order.id, "admin", "admin-session", "request-2");
    expect((await repository.access("learner")).active).toBe(false);
    const events = await db.prepare("SELECT actor_user_id AS actorUserId, request_id AS requestId FROM audit_events WHERE target_id=?")
      .bind(order.id).all<{ actorUserId: string; requestId: string }>();
    expect(events.results).toEqual([{ actorUserId: "admin", requestId: "request-2" }]);
    await expect(repository.refundWithAudit(order.id, "admin", "admin-session", "request-3"))
      .rejects.toBeInstanceOf(CommerceConflict);
    expect((await db.prepare("SELECT id FROM audit_events").all()).results).toHaveLength(1);
  });
  it("keeps access during a refund request and revokes it only after the refund transition", async () => {
    const db = database();
    const repository = new CommerceRepository(db, Date.UTC(2026, 8, 25));
    const order = await repository.create("learner", "hsk4-month", "key-0000000000000004");
    await repository.settle("learner", order.id, "paid");
    expect((await repository.access("learner")).active).toBe(true);
    await repository.requestRefund("learner", order.id, "Không còn nhu cầu học bài HSK4");
    expect((await repository.access("learner")).active).toBe(true);
    await repository.refundWithAudit(order.id, "admin", "admin-session", "request-4");
    expect(await repository.access("learner")).toEqual({ active: false, expiresAt: null });
    expect((await repository.get("learner", order.id)).status).toBe("refunded");
  });
  it("grants only the purchasing account, remains idempotent, extends from expiry, and revokes a refunded order", async () => {
    const db = database();
    const start = Date.UTC(2026, 0, 31, 12);
    const repository = new CommerceRepository(db, start);
    const first = await repository.create("user-a", "hsk4-month", "key-0000000000000001");
    expect((await repository.create("user-a", "hsk4-month", "key-0000000000000001")).id).toBe(first.id);
    await expect(repository.create("user-a", "hsk4-year", "key-0000000000000001")).rejects.toBeInstanceOf(CommerceConflict);
    await repository.settle("user-a", first.id, "paid");
    await repository.settle("user-a", first.id, "paid");
    expect((await repository.access("user-b")).active).toBe(false);
    expect((await repository.access("user-a")).expiresAt).toBe(Date.UTC(2026, 1, 28, 12));
    const renewal = await repository.create("user-a", "hsk4-month", "key-0000000000000002");
    await repository.settle("user-a", renewal.id, "paid");
    expect((await repository.access("user-a")).expiresAt).toBe(Date.UTC(2026, 2, 28, 12));
    await repository.requestRefund("user-a", renewal.id, "Không còn nhu cầu");
    await repository.refundWithAudit(renewal.id, "admin-a", "admin-session", "request-5");
    await expect(repository.refundWithAudit(renewal.id, "admin-b", "admin-session", "request-6")).rejects.toBeInstanceOf(CommerceConflict);
    expect((await repository.get("user-a", renewal.id)).refundedBy).toBe("admin-a");
    expect((await repository.access("user-a")).expiresAt).toBe(Date.UTC(2026, 1, 28, 12));
    expect(premiumAccess(await repository.orders("user-a"), Date.UTC(2026, 2, 1)).active).toBe(false);
    expect(addCalendarMonths(Date.UTC(2024, 0, 31), 1)).toBe(Date.UTC(2024, 1, 29));
  });
  it("does not let another account settle or request a refund", async () => {
    const db = database();
    const repository = new CommerceRepository(db, Date.UTC(2026, 8, 25));
    const order = await repository.create("user-a", "hsk4-year", "key-0000000000000003");
    await expect(repository.settle("user-b", order.id, "paid")).rejects.toBeInstanceOf(CommerceConflict);
    await repository.settle("user-a", order.id, "paid");
    await expect(repository.requestRefund("user-b", order.id, "Không còn nhu cầu")).rejects.toBeInstanceOf(CommerceConflict);
  });
  it("counts every order and refund request while limiting only the recent table", async () => {
    const db = database();
    const now = Date.UTC(2026, 8, 25);
    for (let index = 0; index < 201; index += 1) {
      await db.prepare(`INSERT INTO commerce_sandbox_orders
        (id,user_id,plan_id,idempotency_key,status,created_at,paid_at,updated_at,refund_requested_at,refund_reason)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(`order-${index}`, index === 0 ? "refund-user" : "other-user", "hsk4-month", `key-${index}`,
          "paid", now - index, now - index, now - index,
          index === 200 ? now : null, index === 200 ? "Yêu cầu hoàn" : null).run();
    }
    const dashboard = await new CommerceRepository(db, now).dashboard();
    expect(dashboard.totalOrders).toBe(201);
    expect(dashboard.customers).toBe(2);
    expect(dashboard.activeCustomers).toBe(2);
    expect(dashboard.pendingRefunds.map(order => order.id)).toEqual(["order-200"]);
    expect(dashboard.recentOrders).toHaveLength(200);
    expect(dashboard.recentOrders.some(order => order.id === "order-200")).toBe(false);
  });
  it("includes Hanzi purchases and refunds in admin totals and recent history", async () => {
    const db = database();
    const now = Date.UTC(2026, 8, 26);
    const sandbox = new CommerceRepository(db, now);
    const oldOrder = await sandbox.create("same-user", "hsk4-month", "sandbox-0000000001");
    await sandbox.settle("same-user", oldOrder.id, "paid");
    await db.prepare(`INSERT INTO hanzi_premium_orders
      (id,user_id,plan_id,amount,idempotency_key,status,paid_at,refund_requested_at)
      VALUES ('wallet-1','same-user','hsk4-year',100,'wallet-key-1','paid',?,?),
             ('wallet-2','wallet-user','hsk4-month',80,'wallet-key-2','refunded',?,NULL)`)
      .bind(now + 1, now + 1, now + 2).run();
    const dashboard = await sandbox.dashboard();
    expect(dashboard.totalOrders).toBe(3);
    expect(dashboard.customers).toBe(2);
    expect(dashboard.activeCustomers).toBe(1);
    expect(dashboard.refundedOrders).toBe(1);
    expect(dashboard.walletPurchases).toBe(2);
    expect(dashboard.repeatCustomers).toBe(1);
    expect(dashboard.expiringNext7Days).toBe(0);
    expect(dashboard.pendingRefunds).toHaveLength(0);
    expect(dashboard.recentOrders.map(order => order.id)).toEqual(["hanzi:wallet-2", "hanzi:wallet-1", oldOrder.id]);
    expect(dashboard.recentOrders[1]).toMatchObject({ paymentMethod: "hanzi", hanziAmount: 100 });
  });
  it("counts active plans nearing expiry without treating them as revenue", async () => {
    const db = database();
    const now = Date.UTC(2026, 8, 27);
    await db.prepare(`INSERT INTO hanzi_premium_orders
      (id,user_id,plan_id,amount,idempotency_key,status,paid_at)
      VALUES ('soon','user-soon','hsk4-month',80,'key-soon','paid',?)`)
      .bind(Date.UTC(2026, 7, 31)).run();
    const dashboard = await new CommerceRepository(db, now).dashboard();
    expect(dashboard.activeCustomers).toBe(1);
    expect(dashboard.expiringNext7Days).toBe(1);
    expect(dashboard.walletPurchases).toBe(1);
  });
});
