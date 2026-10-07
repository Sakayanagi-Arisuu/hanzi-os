import type { D1Database } from "./d1";

export type PremiumSupportCategory = "access" | "billing" | "technical";
export type PremiumSupportTicket = {
  id: string;
  userId: string;
  category: PremiumSupportCategory;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  response: string | null;
  respondedBy: string | null;
  createdAt: number;
  updatedAt: number;
};
export class PremiumSupportConflict extends Error {}

const columns = `id, user_id AS userId, category, subject, message, status,
  response, responded_by AS respondedBy, created_at AS createdAt, updated_at AS updatedAt`;

export class PremiumSupportRepository {
  constructor(private database: D1Database, private now = Date.now()) {}

  async forOwner(userId: string) {
    const result = await this.database.prepare(`SELECT ${columns} FROM premium_support_tickets WHERE user_id=? ORDER BY created_at DESC LIMIT 50`).bind(userId).all<PremiumSupportTicket>();
    if (!result.success) throw new Error("Support read failed");
    return result.results ?? [];
  }

  async create(userId: string, category: PremiumSupportCategory, subject: string, message: string) {
    const pending = await this.database.prepare("SELECT COUNT(*) AS count FROM premium_support_tickets WHERE user_id=? AND status='open'").bind(userId).first<{ count: number }>();
    if ((pending?.count ?? 0) >= 3) throw new PremiumSupportConflict("Bạn đã có ba yêu cầu đang chờ. Hãy đợi phản hồi trước khi gửi thêm.");
    const id = crypto.randomUUID();
    await this.database.prepare(`INSERT INTO premium_support_tickets
      (id,user_id,category,subject,message,status,created_at,updated_at)
      VALUES (?,?,?,?,?,'open',?,?)`).bind(id, userId, category, subject, message, this.now, this.now).run();
    const ticket = await this.database.prepare(`SELECT ${columns} FROM premium_support_tickets WHERE id=? AND user_id=?`).bind(id, userId).first<PremiumSupportTicket>();
    if (!ticket) throw new Error("Support write failed");
    return ticket;
  }

  async queue() {
    const result = await this.database.prepare(`SELECT ${columns} FROM premium_support_tickets WHERE status='open' ORDER BY created_at ASC LIMIT 100`).all<PremiumSupportTicket>();
    if (!result.success) throw new Error("Support read failed");
    return result.results ?? [];
  }

  async answerWithAudit(id: string, actorId: string, actorSessionId: string | null, response: string, requestId: string) {
    let result;
    try {
      result = await this.database.batch([
        this.database.prepare(`UPDATE premium_support_tickets
          SET status='answered',response=?,responded_by=?,updated_at=? WHERE id=? AND status='open'`)
          .bind(response, actorId, this.now, id),
        this.database.prepare(`INSERT INTO audit_events
          (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
          VALUES (?,CASE WHEN changes() = 1 THEN 'account' ELSE 'invalid' END,
            'premium_support_answer','success',?,?,'premium_support_ticket',?,?,'{}',?)`)
          .bind(crypto.randomUUID(), actorId, actorSessionId, id, requestId, this.now),
      ]);
    } catch (error) {
      const ticket = await this.database.prepare("SELECT status FROM premium_support_tickets WHERE id=?")
        .bind(id).first<{ status: string }>();
      if (!ticket || ticket.status !== "open") throw new PremiumSupportConflict("Yêu cầu đã được xử lý hoặc không còn hợp lệ.");
      throw error;
    }
    if (!result[0]?.success || result[0].meta?.changes !== 1 || !result[1]?.success || result[1].meta?.changes !== 1) {
      throw new PremiumSupportConflict("Yêu cầu đã được xử lý hoặc không còn hợp lệ.");
    }
    const ticket = await this.database.prepare(`SELECT ${columns} FROM premium_support_tickets WHERE id=?`).bind(id).first<PremiumSupportTicket>();
    if (ticket?.status !== "answered" || ticket.respondedBy !== actorId) throw new Error("Support transition could not be verified.");
    return ticket;
  }
}
