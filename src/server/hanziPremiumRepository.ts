import { premiumPlan, type CommerceOrder, type PremiumPlanId } from "../commerce/policy";
import type { D1Database } from "./d1";

export class HanziPremiumConflict extends Error {}
export type HanziPremiumOrder = {
  id: string; userId: string; planId: PremiumPlanId; amount: number; idempotencyKey: string;
  status: "paid" | "refunded"; paidAt: number; refundRequestedAt: number | null;
  refundReason: string | null; refundedBy: string | null;
  refundRejectedAt: number | null; refundRejectedBy: string | null; refundRejectionReason: string | null;
};
export function asCommerceOrder(order: HanziPremiumOrder): CommerceOrder {
  return { ...order, id: `hanzi:${order.id}`, paymentMethod: "hanzi", hanziAmount: order.amount,
    createdAt: order.paidAt, updatedAt: order.paidAt };
}
const columns = `id,user_id AS userId,plan_id AS planId,amount,idempotency_key AS idempotencyKey,
  status,paid_at AS paidAt,refund_requested_at AS refundRequestedAt,
  refund_reason AS refundReason,refunded_by AS refundedBy,
  refund_rejected_at AS refundRejectedAt,refund_rejected_by AS refundRejectedBy,
  refund_rejection_reason AS refundRejectionReason`;

/** Local Hanzi payments. Prices are explicitly set by an admin; VND is never implied. */
export class HanziPremiumRepository {
  constructor(private database: D1Database, private now = Date.now()) {}

  async prices() {
    const result = await this.database.prepare("SELECT plan_id AS planId,amount FROM hanzi_plan_prices ORDER BY plan_id")
      .all<{ planId: PremiumPlanId; amount: number }>();
    if (!result.success) throw new Error("Hanzi prices unavailable");
    return result.results ?? [];
  }

  async setPrice(planId: PremiumPlanId, amount: number, actorId: string, actorSessionId: string | null, requestId: string) {
    if (!premiumPlan(planId) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000) {
      throw new HanziPremiumConflict("Gói hoặc giá Hanzi không hợp lệ.");
    }
    const result = await this.database.batch([
      this.database.prepare(`INSERT INTO hanzi_plan_prices (plan_id,amount,updated_by,updated_at) VALUES (?,?,?,?)
        ON CONFLICT(plan_id) DO UPDATE SET amount=excluded.amount,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .bind(planId, amount, actorId, this.now),
      this.database.prepare(`INSERT INTO audit_events
        (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        VALUES (?,'config','hanzi_plan_price','success',?,?,'hanzi_plan',?,?,?,?)`)
        .bind(crypto.randomUUID(), actorId, actorSessionId, planId, requestId, JSON.stringify({ amount }), this.now),
    ]);
    if (result[0]?.meta?.changes !== 1 || result[1]?.meta?.changes !== 1) throw new Error("Price update failed");
    return { planId, amount };
  }

  async orders(userId: string) {
    const result = await this.database.prepare(`SELECT ${columns} FROM hanzi_premium_orders WHERE user_id=? ORDER BY paid_at DESC,id DESC`)
      .bind(userId).all<HanziPremiumOrder>();
    if (!result.success) throw new Error("Hanzi orders unavailable");
    return result.results ?? [];
  }

  async get(userId: string, id: string) {
    return this.database.prepare(`SELECT ${columns} FROM hanzi_premium_orders WHERE user_id=? AND id=?`)
      .bind(userId, id).first<HanziPremiumOrder>();
  }

  async purchase(userId: string, planId: PremiumPlanId, key: string, expectedAmount: number) {
    if (!premiumPlan(planId) || !/^[a-zA-Z0-9-]{16,80}$/.test(key)
      || !Number.isSafeInteger(expectedAmount) || expectedAmount < 1 || expectedAmount > 1_000_000) {
      throw new HanziPremiumConflict("Gói, giá hoặc mã yêu cầu không hợp lệ.");
    }
    const existing = async () => this.database.prepare(`SELECT ${columns} FROM hanzi_premium_orders WHERE user_id=? AND idempotency_key=?`)
      .bind(userId, key).first<HanziPremiumOrder>();
    const prior = await existing();
    if (prior) {
      if (prior.planId !== planId || prior.amount !== expectedAmount) throw new HanziPremiumConflict("Mã yêu cầu đã được dùng cho gói hoặc giá khác.");
      return prior;
    }
    const price = (await this.prices()).find(item => item.planId === planId)?.amount;
    if (!price) throw new HanziPremiumConflict("Admin chưa đặt giá Hanzi cho gói này.");
    if (price !== expectedAmount) throw new HanziPremiumConflict("Giá Hanzi đã thay đổi. Hãy tải lại gói trước khi mua.");
    const id = crypto.randomUUID();
    try {
      const result = await this.database.batch([
        this.database.prepare("INSERT OR IGNORE INTO hanzi_wallets (user_id,balance,updated_at) VALUES (?,0,?)").bind(userId, this.now),
        this.database.prepare(`UPDATE hanzi_wallets SET balance=balance-?,updated_at=? WHERE user_id=? AND balance>=?
          AND EXISTS (SELECT 1 FROM hanzi_plan_prices WHERE plan_id=? AND amount=?)
          AND NOT EXISTS (SELECT 1 FROM hanzi_premium_orders WHERE user_id=? AND idempotency_key=?)`)
          .bind(price, this.now, userId, price, planId, expectedAmount, userId, key),
        this.database.prepare(`INSERT INTO hanzi_premium_orders (id,user_id,plan_id,amount,idempotency_key,status,paid_at)
          SELECT ?,?,?,?,?,'paid',? WHERE changes()=1`)
          .bind(id, userId, planId, price, key, this.now),
        this.database.prepare(`INSERT INTO hanzi_wallet_entries (id,user_id,delta,kind,reference_id,actor_user_id,created_at)
          SELECT ?,?,?,'purchase',?,NULL,? WHERE changes()=1`)
          .bind(crypto.randomUUID(), userId, -price, `purchase:${id}`, this.now),
        this.database.prepare(`INSERT INTO audit_events
          (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
          SELECT ?,'account','hanzi_premium_purchase','success',?,NULL,'hanzi_premium_order',?,?,?,? WHERE changes()=1`)
          .bind(crypto.randomUUID(), userId, id, key, JSON.stringify({ planId, amount: price }), this.now),
      ]);
      if (result.slice(1).some(item => item?.meta?.changes !== 1)) {
        if ((await this.prices()).find(item => item.planId === planId)?.amount !== expectedAmount) {
          throw new HanziPremiumConflict("Giá Hanzi đã thay đổi. Hãy tải lại gói trước khi mua.");
        }
        throw new HanziPremiumConflict("Ví không đủ Hanzi hoặc giao dịch đã được xử lý.");
      }
    } catch (error) {
      const replay = await existing();
      if (replay && replay.planId === planId && replay.amount === expectedAmount) return replay;
      throw error;
    }
    const order = await this.get(userId, id);
    if (!order) throw new Error("Hanzi purchase unavailable");
    return order;
  }

  async requestRefund(userId: string, id: string, reason: string, requestId: string) {
    if (reason.trim().length < 5 || reason.trim().length > 500) throw new HanziPremiumConflict("Lý do hoàn phải dài từ 5 đến 500 ký tự.");
    const result = await this.database.batch([
      this.database.prepare(`UPDATE hanzi_premium_orders SET refund_requested_at=?,refund_reason=?
        WHERE id=? AND user_id=? AND status='paid' AND refund_requested_at IS NULL`)
        .bind(this.now, reason.trim(), id, userId),
      this.database.prepare(`INSERT INTO audit_events
        (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        SELECT ?,'account','hanzi_premium_refund_requested','success',?,NULL,'hanzi_premium_order',?,?,?,?
        WHERE changes()=1`)
        .bind(crypto.randomUUID(), userId, id, requestId, JSON.stringify({ reasonLength: reason.trim().length }), this.now),
    ]);
    if (result[0]?.meta?.changes !== 1 || result[1]?.meta?.changes !== 1) {
      throw new HanziPremiumConflict("Giao dịch không còn hợp lệ để yêu cầu hoàn.");
    }
    return this.get(userId, id);
  }

  async refundWithAudit(id: string, actorId: string, actorSessionId: string | null, requestId: string) {
    const order = await this.database.prepare(`SELECT ${columns} FROM hanzi_premium_orders WHERE id=?`).bind(id).first<HanziPremiumOrder>();
    if (!order || order.status !== "paid" || !order.refundRequestedAt || order.refundRejectedAt) throw new HanziPremiumConflict("Yêu cầu hoàn không còn hợp lệ.");
    const result = await this.database.batch([
      this.database.prepare(`UPDATE hanzi_premium_orders SET status='refunded',refunded_by=? WHERE id=? AND status='paid'
        AND refund_requested_at IS NOT NULL AND refund_rejected_at IS NULL AND EXISTS
        (SELECT 1 FROM hanzi_wallets WHERE user_id=? AND balance+?<=1000000000)`)
        .bind(actorId, id, order.userId, order.amount),
      this.database.prepare(`UPDATE hanzi_wallets SET balance=balance+?,updated_at=? WHERE user_id=? AND changes()=1`)
        .bind(order.amount, this.now, order.userId),
      this.database.prepare(`INSERT INTO hanzi_wallet_entries (id,user_id,delta,kind,reference_id,actor_user_id,created_at)
        SELECT ?,?,?,'refund',?,?,? WHERE changes()=1`)
        .bind(crypto.randomUUID(), order.userId, order.amount, `refund:${id}`, actorId, this.now),
      this.database.prepare(`INSERT INTO audit_events
        (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        SELECT ?,'account','hanzi_premium_refund','success',?,?,'hanzi_premium_order',?,?,?,? WHERE changes()=1`)
        .bind(crypto.randomUUID(), actorId, actorSessionId, id, requestId, JSON.stringify({ amount: order.amount }), this.now),
    ]);
    if (result.some(item => item?.meta?.changes !== 1)) throw new HanziPremiumConflict("Yêu cầu hoàn đã được xử lý hoặc số dư vượt giới hạn.");
    return this.get(order.userId, id);
  }

  async rejectRefundWithAudit(id: string, actorId: string, actorSessionId: string | null, reason: string, requestId: string) {
    const explanation = reason.trim();
    if (explanation.length < 10 || explanation.length > 500) throw new HanziPremiumConflict("Lý do từ chối phải dài từ 10 đến 500 ký tự.");
    const order = await this.database.prepare(`SELECT ${columns} FROM hanzi_premium_orders WHERE id=?`).bind(id).first<HanziPremiumOrder>();
    if (!order || order.status !== "paid" || !order.refundRequestedAt || order.refundRejectedAt) {
      throw new HanziPremiumConflict("Yêu cầu hoàn không còn hợp lệ.");
    }
    const result = await this.database.batch([
      this.database.prepare(`UPDATE hanzi_premium_orders SET refund_rejected_at=?,refund_rejected_by=?,refund_rejection_reason=?
        WHERE id=? AND status='paid' AND refund_requested_at IS NOT NULL AND refund_rejected_at IS NULL`)
        .bind(this.now, actorId, explanation, id),
      this.database.prepare(`INSERT INTO audit_events
        (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        SELECT ?,'account','hanzi_premium_refund_rejected','success',?,?,'hanzi_premium_order',?,?,?,?
        WHERE changes()=1`)
        .bind(crypto.randomUUID(), actorId, actorSessionId, id, requestId,
          JSON.stringify({ reasonLength: explanation.length }), this.now),
    ]);
    if (result[0]?.meta?.changes !== 1 || result[1]?.meta?.changes !== 1) {
      throw new HanziPremiumConflict("Yêu cầu hoàn đã được xử lý.");
    }
    return this.get(order.userId, id);
  }

  async pendingRefunds() {
    const result = await this.database.prepare(`SELECT ${columns} FROM hanzi_premium_orders WHERE status='paid' AND refund_requested_at IS NOT NULL AND refund_rejected_at IS NULL ORDER BY refund_requested_at ASC LIMIT 100`)
      .all<HanziPremiumOrder>();
    if (!result.success) throw new Error("Hanzi refunds unavailable");
    return result.results ?? [];
  }
}
