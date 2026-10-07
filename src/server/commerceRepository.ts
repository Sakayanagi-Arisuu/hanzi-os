import { premiumAccess, premiumPlan, type CommerceOrder, type PremiumPlanId } from "../commerce/policy";
import type { D1Database } from "./d1";

export class CommerceConflict extends Error {}
const columns = `id, user_id AS userId, plan_id AS planId, idempotency_key AS idempotencyKey,
 status, created_at AS createdAt, paid_at AS paidAt, updated_at AS updatedAt,
 refund_requested_at AS refundRequestedAt, refund_reason AS refundReason, refunded_by AS refundedBy`;

/** Sandbox ledger only. Never use these rows as evidence of a real payment. */
export class CommerceRepository {
  constructor(private database: D1Database, private now = Date.now()) {}
  async orders(userId: string) {
    const result = await this.database.prepare(`SELECT ${columns} FROM commerce_sandbox_orders WHERE user_id = ? ORDER BY created_at DESC, id DESC`).bind(userId).all<CommerceOrder>();
    if (!result.success) throw new Error("Commerce read failed");
    return result.results ?? [];
  }
  async access(userId: string) { return premiumAccess(await this.orders(userId), this.now); }
  async get(userId: string, id: string) {
    const order = await this.database.prepare(`SELECT ${columns} FROM commerce_sandbox_orders WHERE id = ? AND user_id = ?`).bind(id, userId).first<CommerceOrder>();
    if (!order) throw new CommerceConflict("Không tìm thấy giao dịch của tài khoản này.");
    return order;
  }
  async create(userId: string, planId: PremiumPlanId, key: string) {
    if (!premiumPlan(planId)) throw new CommerceConflict("Gói không hợp lệ.");
    await this.database.prepare(`INSERT INTO commerce_sandbox_orders
      (id,user_id,plan_id,idempotency_key,status,created_at,updated_at)
      VALUES (?,?,?,?,'pending',?,?) ON CONFLICT(user_id,idempotency_key) DO NOTHING`)
      .bind(crypto.randomUUID(), userId, planId, key, this.now, this.now).run();
    const order = await this.database.prepare(`SELECT ${columns} FROM commerce_sandbox_orders WHERE user_id = ? AND idempotency_key = ?`).bind(userId, key).first<CommerceOrder>();
    if (!order || order.planId !== planId) throw new CommerceConflict("Yêu cầu này đã dùng cho một gói khác.");
    return order;
  }
  async settle(userId: string, id: string, status: "paid" | "failed" | "cancelled") {
    // Compare-and-set makes concurrent callbacks/retries unable to grant twice.
    await this.database.prepare(`UPDATE commerce_sandbox_orders SET status=?,paid_at=?,updated_at=?
      WHERE id=? AND user_id=? AND status='pending' AND created_at>?`)
      .bind(status, status === "paid" ? this.now : null, this.now, id, userId, this.now - 30 * 60_000).run();
    const order = await this.get(userId, id);
    if (order.status !== status) throw new CommerceConflict("Giao dịch đã hết thời gian xác nhận hoặc đã được xử lý. Hãy tạo giao dịch mới.");
    return order;
  }
  async requestRefund(userId: string, id: string, reason: string) {
    const order = await this.get(userId, id);
    if (order.status !== "paid") throw new CommerceConflict("Chỉ gửi yêu cầu cho giao dịch đã kích hoạt.");
    await this.database.prepare(`UPDATE commerce_sandbox_orders SET refund_requested_at=?,refund_reason=?,updated_at=? WHERE id=? AND user_id=? AND status='paid' AND refund_requested_at IS NULL`)
      .bind(this.now, reason, this.now, id, userId).run();
    return this.get(userId, id);
  }
  async refundWithAudit(id: string, actorId: string, actorSessionId: string | null, requestId: string) {
    let result;
    try {
      result = await this.database.batch([
        this.database.prepare(`UPDATE commerce_sandbox_orders
          SET status='refunded',refunded_by=?,updated_at=?
          WHERE id=? AND status='paid' AND refund_requested_at IS NOT NULL`)
          .bind(actorId, this.now, id),
        this.database.prepare(`INSERT INTO audit_events
          (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
          VALUES (?,CASE WHEN changes() = 1 THEN 'account' ELSE 'invalid' END,
            'commerce_sandbox_refund','success',?,?,'commerce_order',?,?,'{}',?)`)
          .bind(crypto.randomUUID(), actorId, actorSessionId, id, requestId, this.now),
      ]);
    } catch (error) {
      const order = await this.database.prepare(`SELECT status, refund_requested_at AS refundRequestedAt FROM commerce_sandbox_orders WHERE id=?`)
        .bind(id).first<{ status: string; refundRequestedAt: number | null }>();
      if (!order || order.status !== "paid" || order.refundRequestedAt === null) {
        throw new CommerceConflict("Yêu cầu hoàn đã được xử lý hoặc không còn hợp lệ.");
      }
      throw error;
    }
    if (!result[0]?.success || result[0].meta?.changes !== 1 || !result[1]?.success || result[1].meta?.changes !== 1) {
      throw new CommerceConflict("Yêu cầu hoàn đã được xử lý hoặc không còn hợp lệ.");
    }
    const order = await this.database.prepare(`SELECT ${columns} FROM commerce_sandbox_orders WHERE id=?`).bind(id).first<CommerceOrder>();
    if (order?.status !== "refunded" || order.refundedBy !== actorId) throw new Error("Refund transition could not be verified.");
    return order;
  }
  async recentOrders() {
    const result = await this.database.prepare(`SELECT ${columns} FROM commerce_sandbox_orders ORDER BY created_at DESC LIMIT 200`).all<CommerceOrder>();
    if (!result.success) throw new Error("Commerce read failed");
    return result.results ?? [];
  }
  async dashboard() {
    const result = await this.database.prepare(`SELECT ${columns} FROM commerce_sandbox_orders ORDER BY created_at DESC, id DESC`).all<CommerceOrder>();
    if (!result.success) throw new Error("Commerce read failed");
    const walletResult = await this.database.prepare(`SELECT id,user_id AS userId,plan_id AS planId,
      idempotency_key AS idempotencyKey,status,paid_at AS createdAt,paid_at AS paidAt,
      paid_at AS updatedAt,refund_requested_at AS refundRequestedAt,
      refund_reason AS refundReason,refunded_by AS refundedBy,amount AS hanziAmount
      FROM hanzi_premium_orders ORDER BY paid_at DESC,id DESC`).all<CommerceOrder>();
    if (!walletResult.success) throw new Error("Hanzi orders unavailable");
    const sandboxOrders = result.results ?? [];
    const orders = [...sandboxOrders, ...(walletResult.results ?? []).map(order => ({
      ...order, id: `hanzi:${order.id}`, paymentMethod: "hanzi" as const,
    }))].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    const byUser = new Map<string, CommerceOrder[]>();
    for (const order of orders) {
      const userOrders = byUser.get(order.userId) ?? [];
      userOrders.push(order);
      byUser.set(order.userId, userOrders);
    }
    const accessByUser = [...byUser.values()].map(userOrders => ({
      access: premiumAccess(userOrders, this.now),
      paidOrders: userOrders.filter(order => order.status === "paid" || order.status === "refunded").length,
    }));
    return {
      totalOrders: orders.length,
      customers: byUser.size,
      activeCustomers: accessByUser.filter(user => user.access.active).length,
      expiringNext7Days: accessByUser.filter(user => user.access.active && user.access.expiresAt! <= this.now + 7 * 86_400_000).length,
      repeatCustomers: accessByUser.filter(user => user.paidOrders >= 2).length,
      walletPurchases: orders.filter(order => order.paymentMethod === "hanzi").length,
      refundedOrders: orders.filter(order => order.status === "refunded").length,
      pendingRefunds: sandboxOrders.filter(order => order.status === "paid" && order.refundRequestedAt !== null),
      recentOrders: orders.slice(0, 200),
    };
  }
}
