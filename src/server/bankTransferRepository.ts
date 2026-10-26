import { premiumPlan, type CommerceOrder, type PremiumPlanId } from "../commerce/policy";
import { merchantReadiness } from "../commerce/merchant";
import { CommerceOperationsRepository } from "./commerceOperationsRepository";
import type { D1Database } from "./d1";
export function cashLedgerEnabled(url: string) {
  const target = new URL(url);
  return process.env.HANZI_CASH_LEDGER_ENABLED === "1" && process.env.NODE_ENV === "production"
    && target.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
}
export type BankOrder = {
  id: string; userId: string; planId: PremiumPlanId; amount: number; status: CommerceOrder["status"];
  createdAt: number; paidAt: number | null; idempotencyKey: string; bankSnapshot: string;
  refundRequestedAt: number | null; refundReason: string | null;
};
const columns = `id,user_id AS userId,plan_id AS planId,amount,status,created_at AS createdAt,paid_at AS paidAt,
  idempotency_key AS idempotencyKey,bank_snapshot AS bankSnapshot,refund_requested_at AS refundRequestedAt,refund_reason AS refundReason`;
export class BankTransferRepository {
  constructor(private db: D1Database, private now = Date.now()) {}
  async availability(url: string) {
    if (!cashLedgerEnabled(url)) return { enabled: false };
    const { value } = await new CommerceOperationsRepository(this.db).settings();
    const enabled = process.env.HANZI_BANK_TRANSFER_ENABLED === "1" && value.provider === "bank_transfer"
      && merchantReadiness(value).slice(0,5).every(item => item.ready)
      && new URL(value.website).origin === new URL(url).origin;
    return { enabled, supportEmail: value.supportEmail };
  }
  async orders(userId: string) {
    const result = await this.db.prepare(`SELECT ${columns} FROM commerce_cash_orders WHERE user_id=? ORDER BY created_at DESC,id DESC`).bind(userId).all<BankOrder>();
    if (!result.success) throw new Error("Cash orders unavailable");
    return result.results ?? [];
  }
  async create(userId: string, planId: PremiumPlanId, key: string, expectedAmount: number, url: string) {
    if (!(await this.availability(url)).enabled) throw new Error("Chuyển khoản chưa được mở.");
    if (!premiumPlan(planId) || !/^[A-Za-z0-9-]{16,80}$/.test(key)) throw new Error("Gói hoặc yêu cầu không hợp lệ.");
    const previous = (await this.orders(userId)).find(order => order.idempotencyKey === key);
    if (previous) {
      if (previous.planId !== planId || previous.amount !== expectedAmount) throw new Error("Yêu cầu đã dùng cho đơn khác.");
      return previous;
    }
    const price = await this.db.prepare("SELECT amount FROM premium_vnd_prices WHERE plan_id=?").bind(planId).first<{amount:number}>();
    if (!price || price.amount !== expectedAmount) throw new Error("Giá gói đã thay đổi. Tải lại giá trước khi mua.");
    const existing = await this.db.prepare("SELECT COUNT(*) AS count FROM commerce_cash_orders WHERE user_id=? AND status='pending'").bind(userId).first<{count:number}>();
    if ((existing?.count ?? 0) >= 3) throw new Error("Bạn đang có ba đơn chờ. Hãy xử lý đơn cũ trước.");
    const { value } = await new CommerceOperationsRepository(this.db).settings();
    const snapshot = JSON.stringify({ bankName:value.bankName, bankAccount:value.bankAccount, bankHolder:value.bankHolder, supportEmail:value.supportEmail });
    await this.db.prepare(`INSERT INTO commerce_cash_orders (id,user_id,plan_id,amount,currency,provider,status,created_at,idempotency_key,bank_snapshot)
      SELECT ?,?,?,?,'VND','bank_transfer','pending',?,?,? WHERE EXISTS (SELECT 1 FROM premium_vnd_prices WHERE plan_id=? AND amount=?)
      ON CONFLICT(user_id,idempotency_key) DO NOTHING`).bind(crypto.randomUUID(),userId,planId,price.amount,this.now,key,snapshot,planId,price.amount).run();
    const order = (await this.orders(userId)).find(entry => entry.idempotencyKey === key);
    if (!order || order.planId !== planId || order.amount !== expectedAmount) throw new Error("Chưa tạo được đơn. Hãy tải lại giá và thử lại.");
    return order;
  }
  async cancel(userId: string, id: string) {
    const result = await this.db.prepare("UPDATE commerce_cash_orders SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'").bind(id,userId).run();
    if (!result.success || result.meta?.changes !== 1) throw new Error("Đơn đã thay đổi; hãy tải lại.");
  }
  async requestRefund(userId: string, id: string, reason: string) {
    if (reason.trim().length < 10 || reason.length > 500) throw new Error("Vui lòng nêu lý do từ 10–500 ký tự.");
    const result = await this.db.prepare("UPDATE commerce_cash_orders SET refund_requested_at=?,refund_reason=? WHERE id=? AND user_id=? AND status='paid' AND refund_requested_at IS NULL")
      .bind(this.now,reason.trim(),id,userId).run();
    if (!result.success || result.meta?.changes !== 1) throw new Error("Yêu cầu đã gửi hoặc đơn không còn phù hợp.");
  }
  async reconcile(id: string, action: "capture" | "refund", bankReference: string, amount: number, actorId: string, sessionId: string | null, requestId: string) {
    if (!/^[A-Za-z0-9._:/-]{6,100}$/.test(bankReference) || !Number.isSafeInteger(amount)) throw new Error("Nhập mã giao dịch ngân hàng và số tiền chính xác.");
    const order = await this.db.prepare(`SELECT ${columns} FROM commerce_cash_orders WHERE id=? AND provider='bank_transfer'`).bind(id).first<BankOrder>();
    if (!order || amount !== order.amount) throw new Error("Số tiền không khớp đơn. Không cấp quyền khi thiếu hoặc thừa tiền.");
    const expected = action === "capture" ? "pending" : "paid";
    if (order.status !== expected || (action === "refund" && order.refundRequestedAt === null)) throw new Error("Đơn không ở trạng thái có thể xử lý.");
    const results = await this.db.batch([
      this.db.prepare(`UPDATE commerce_cash_orders SET status=?,paid_at=CASE WHEN ?='capture' THEN ? ELSE paid_at END,
        bank_reference=CASE WHEN ?='capture' THEN ? ELSE bank_reference END
        WHERE id=? AND status=?`).bind(action === "capture" ? "paid" : "refunded",action,this.now,action,bankReference,id,expected),
      this.db.prepare(`INSERT INTO commerce_cash_events (id,order_id,provider,provider_event_id,kind,amount,occurred_at,verified_at)
        VALUES (?,?, 'bank_transfer',?,CASE WHEN changes()=1 THEN ? ELSE 'invalid' END,?,?,?)`)
        .bind(crypto.randomUUID(),id,bankReference,action,amount,this.now,this.now),
      this.db.prepare(`INSERT INTO audit_events (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        VALUES (?,'account',?,'success',?,?,'commerce_cash_order',?,?,?,?)`)
        .bind(crypto.randomUUID(),`commerce.bank.${action}`,actorId,sessionId,id,requestId,JSON.stringify({amount,bankReference}),this.now),
    ]);
    if (results.some(result=>!result.success || result.meta?.changes !== 1)) throw new Error("Chưa xác nhận được giao dịch.");
  }
  async pending() {
    const result = await this.db.prepare(`SELECT ${columns} FROM commerce_cash_orders WHERE provider='bank_transfer' AND (status='pending' OR (status='paid' AND refund_requested_at IS NOT NULL)) ORDER BY created_at ASC LIMIT 100`).all<BankOrder>();
    if (!result.success) throw new Error("Bank queue unavailable");
    return result.results ?? [];
  }
}
export const bankOrderForAccess = (order: BankOrder): CommerceOrder => ({
  id: `vnd:${order.id}`, userId:order.userId, planId:order.planId, idempotencyKey:order.idempotencyKey,
  status:order.status, createdAt:order.createdAt, paidAt:order.paidAt, updatedAt:order.paidAt ?? order.createdAt,
  refundRequestedAt:order.refundRequestedAt,refundReason:order.refundReason,refundedBy:null,paymentMethod:"bank_transfer",vndAmount:order.amount,
});
