import type { D1Database } from "./d1";
import { premiumAccess, type CommerceOrder } from "../commerce/policy";
import { parseMerchantSettings, type MerchantSettings } from "../commerce/merchant";

export type CashSummary = { gross: number; refunded: number; fees: number; net: number; paidOrders: number };
export class CommerceOperationsRepository {
  constructor(private db: D1Database, private now = Date.now()) {}
  async cashCustomers() {
    const result = await this.db.prepare(`SELECT id,user_id AS userId,plan_id AS planId,status,paid_at AS paidAt FROM commerce_cash_orders WHERE status='paid' AND paid_at<=?`).bind(this.now).all<CommerceOrder>();
    if (!result.success) throw new Error("Cash customer summary unavailable");
    const owners = new Map<string, CommerceOrder[]>();
    for (const order of result.results ?? []) owners.set(order.userId, [...(owners.get(order.userId) ?? []), order]);
    const access = [...owners.values()].map(orders => premiumAccess(orders, this.now));
    return { active: access.filter(a => a.active).length, expiring: access.filter(a => a.active && a.expiresAt! <= this.now + 7 * 86_400_000).length };
  }
  async settings() {
    const row = await this.db.prepare("SELECT revision,value_json AS valueJson,updated_at AS updatedAt FROM commerce_merchant_settings WHERE id=1")
      .first<{ revision: number; valueJson: string; updatedAt: number }>();
    if (!row) throw new Error("Merchant settings unavailable");
    return { ...row, value: parseMerchantSettings(JSON.parse(row.valueJson)) };
  }
  async saveSettings(value: MerchantSettings, revision: number, actorId: string, sessionId: string | null, requestId: string) {
    const safe = parseMerchantSettings(value);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Phiên cấu hình không hợp lệ.");
    const results = await this.db.batch([
      this.db.prepare("UPDATE commerce_merchant_settings SET value_json=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=1 AND revision=?")
        .bind(JSON.stringify(safe), this.now, actorId, revision),
      this.db.prepare(`INSERT INTO audit_events (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        VALUES (?,CASE WHEN changes()=1 THEN 'config' ELSE 'invalid' END,'commerce.merchant.updated','success',?,?,'commerce_merchant','1',?,?,?)`)
        .bind(crypto.randomUUID(), actorId, sessionId, requestId, JSON.stringify({ revision: revision + 1, provider: safe.provider }), this.now),
    ]);
    if (results.some(r => !r.success || r.meta?.changes !== 1)) throw new Error("Cấu hình đã đổi ở phiên khác. Tải lại trước khi lưu.");
  }
  async revenue(days = 30) {
    const start = this.now - days * 86_400_000;
    const rows = await this.db.prepare(`SELECT kind,SUM(amount) AS amount,COUNT(DISTINCT order_id) AS orders
      FROM commerce_cash_events WHERE occurred_at>=? AND occurred_at<=? AND verified_at<=? GROUP BY kind`)
      .bind(start, this.now, this.now).all<{ kind: string; amount: number; orders: number }>();
    if (!rows.success) throw new Error("Revenue unavailable");
    const amount = (kind: string) => rows.results?.find(r => r.kind === kind)?.amount ?? 0;
    const summary: CashSummary = { gross: amount("capture"), refunded: amount("refund"), fees: amount("fee"),
      net: amount("capture") - amount("refund") - amount("fee"), paidOrders: rows.results?.find(r => r.kind === "capture")?.orders ?? 0 };
    const daily = await this.db.prepare(`SELECT date(occurred_at/1000,'unixepoch','+7 hours') AS day,
      SUM(CASE WHEN kind='capture' THEN amount ELSE -amount END) AS net
      FROM commerce_cash_events WHERE occurred_at>=? AND occurred_at<=? AND verified_at<=? GROUP BY day ORDER BY day`)
      .bind(start, this.now, this.now).all<{ day: string; net: number }>();
    if (!daily.success) throw new Error("Revenue trend unavailable");
    return { ...summary, days, start, end: this.now, daily: daily.results ?? [] };
  }
  async orders(input: { query?: string; method?: string; status?: string; page?: number }) {
    const query = (input.query ?? "").trim().slice(0, 100);
    const method = ["vnd", "hanzi", "sandbox"].includes(input.method ?? "") ? input.method! : "";
    const status = ["pending", "paid", "failed", "cancelled", "refunded"].includes(input.status ?? "") ? input.status! : "";
    const source = `WITH orders AS (
      SELECT id,user_id,plan_id,status,created_at,'sandbox' AS method,0 AS amount FROM commerce_sandbox_orders
      UNION ALL SELECT 'hanzi:'||id,user_id,plan_id,status,paid_at,'hanzi',amount FROM hanzi_premium_orders
      UNION ALL SELECT 'vnd:'||id,user_id,plan_id,status,created_at,'vnd',amount FROM commerce_cash_orders
    ), matched AS (SELECT o.*,COALESCE(p.display_name,h.normalized_username,'Tài khoản') AS customer,
      h.normalized_username AS username FROM orders o LEFT JOIN profiles p ON p.user_id=o.user_id
      LEFT JOIN hanzi_password_credentials h ON h.user_id=o.user_id
      WHERE (?='' OR o.method=?) AND (?='' OR o.status=?) AND (?='' OR instr(lower(o.id),lower(?))>0
        OR instr(lower(o.user_id),lower(?))>0 OR instr(lower(COALESCE(p.display_name,'')),lower(?))>0
        OR instr(lower(COALESCE(h.normalized_username,'')),lower(?))>0))`;
    const binds = [method, method, status, status, query, query, query, query, query];
    const total = await this.db.prepare(`${source} SELECT COUNT(*) AS total FROM matched`).bind(...binds).first<{ total: number }>();
    const pages = Math.max(1, Math.ceil((total?.total ?? 0) / 25));
    const page = Math.min(pages, Math.max(1, Number.isSafeInteger(input.page) ? input.page! : 1));
    const rows = await this.db.prepare(`${source} SELECT id,user_id AS userId,plan_id AS planId,status,created_at AS createdAt,method,amount,customer,username FROM matched ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?`)
      .bind(...binds, (page - 1) * 25).all<{ id: string; userId: string; planId: string; status: string; createdAt: number; method: string; amount: number; customer: string; username: string | null }>();
    if (!rows.success) throw new Error("Orders unavailable");
    return { rows: rows.results ?? [], total: total?.total ?? 0, pages, page, query, method, status };
  }
}
