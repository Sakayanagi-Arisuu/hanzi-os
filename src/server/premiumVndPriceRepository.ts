import { premiumPlan, type PremiumPlanId } from "../commerce/policy";
import type { D1Database } from "./d1";

/** Display prices only. Never used to debit Hanzi or grant an entitlement. */
export class PremiumVndPriceRepository {
  constructor(private database: D1Database, private now = Date.now()) {}
  async prices() {
    const result = await this.database.prepare("SELECT plan_id AS planId,amount FROM premium_vnd_prices ORDER BY plan_id")
      .all<{ planId: PremiumPlanId; amount: number }>();
    if (!result.success) throw new Error("VNĐ prices unavailable");
    return result.results ?? [];
  }

  async setPrice(planId: PremiumPlanId, amount: number, actorId: string, actorSessionId: string | null, requestId: string) {
    if (!premiumPlan(planId) || !Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000) {
      throw new RangeError("Gói hoặc giá VNĐ không hợp lệ.");
    }
    const result = await this.database.batch([
      this.database.prepare(`INSERT INTO premium_vnd_prices (plan_id,amount,updated_by,updated_at) VALUES (?,?,?,?)
        ON CONFLICT(plan_id) DO UPDATE SET amount=excluded.amount,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
        .bind(planId, amount, actorId, this.now),
      this.database.prepare(`INSERT INTO audit_events
        (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        VALUES (?,'config','premium_vnd_price','success',?,?,'premium_vnd_plan',?,?,?,?)`)
        .bind(crypto.randomUUID(), actorId, actorSessionId, planId, requestId, JSON.stringify({ amount }), this.now),
    ]);
    if (result[0]?.meta?.changes !== 1 || result[1]?.meta?.changes !== 1) throw new Error("Price update failed");
    return { planId, amount };
  }

}
