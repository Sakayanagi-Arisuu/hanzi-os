import type { D1Database } from "./d1";

export class HanziWalletConflict extends Error {}
export type HanziWalletEntry = {
  id: string; userId: string; delta: number; kind: string; referenceId: string;
  actorUserId: string | null; createdAt: number;
};

const entryColumns = `id, user_id AS userId, delta, kind, reference_id AS referenceId,
  actor_user_id AS actorUserId, created_at AS createdAt`;

/** Internal test units; never represents VND or a provider payment. */
export class HanziWalletRepository {
  constructor(private database: D1Database, private now = Date.now()) {}

  async forOwner(userId: string) {
    const wallet = await this.database.prepare("SELECT balance, updated_at AS updatedAt FROM hanzi_wallets WHERE user_id=?")
      .bind(userId).first<{ balance: number; updatedAt: number }>();
    const entries = await this.database.prepare(`SELECT ${entryColumns} FROM hanzi_wallet_entries WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 50`)
      .bind(userId).all<HanziWalletEntry>();
    if (!entries.success) throw new Error("Wallet read failed");
    return { balance: wallet?.balance ?? 0, updatedAt: wallet?.updatedAt ?? null, entries: entries.results ?? [] };
  }

  async recent() {
    const result = await this.database.prepare(`SELECT ${entryColumns} FROM hanzi_wallet_entries ORDER BY created_at DESC, id DESC LIMIT 100`)
      .all<HanziWalletEntry>();
    if (!result.success) throw new Error("Wallet read failed");
    return result.results ?? [];
  }

  async adjustByAdmin(userId: string, amount: number, actorId: string, actorSessionId: string | null, referenceId: string) {
    if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000 ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(referenceId)) throw new HanziWalletConflict("Số Hanzi hoặc mã thao tác không hợp lệ.");
    const kind = amount > 0 ? "admin_credit" : "admin_debit";
    const existing = async () => this.database.prepare(`SELECT ${entryColumns} FROM hanzi_wallet_entries WHERE user_id=? AND reference_id=?`)
      .bind(userId, referenceId).first<HanziWalletEntry>();
    const prior = await existing();
    if (prior) {
      if (prior.delta !== amount || prior.kind !== kind || prior.actorUserId !== actorId) throw new HanziWalletConflict("Mã thao tác đã được dùng cho thay đổi khác.");
      return this.forOwner(userId);
    }
    const entryId = crypto.randomUUID();
    try {
      const result = await this.database.batch([
        this.database.prepare("INSERT OR IGNORE INTO hanzi_wallets (user_id,balance,updated_at) VALUES (?,0,?)")
          .bind(userId, this.now),
        this.database.prepare(`UPDATE hanzi_wallets SET balance=balance+?,updated_at=?
          WHERE user_id=? AND balance+? BETWEEN 0 AND 1000000000
          AND NOT EXISTS (SELECT 1 FROM hanzi_wallet_entries WHERE user_id=? AND reference_id=?)`)
          .bind(amount, this.now, userId, amount, userId, referenceId),
        this.database.prepare(`INSERT INTO hanzi_wallet_entries (id,user_id,delta,kind,reference_id,actor_user_id,created_at)
          SELECT ?,?,?,?,?,?,? WHERE changes()=1`)
          .bind(entryId, userId, amount, kind, referenceId, actorId, this.now),
        this.database.prepare(`INSERT INTO audit_events
          (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
          SELECT ?,'account','hanzi_wallet_adjust','success',?,?,'hanzi_wallet',?,?,?,? WHERE changes()=1`)
          .bind(crypto.randomUUID(), actorId, actorSessionId, userId, referenceId,
            JSON.stringify({ entryId, delta: amount }), this.now),
      ]);
      if (result[1]?.meta?.changes !== 1 || result[2]?.meta?.changes !== 1 || result[3]?.meta?.changes !== 1) {
        throw new HanziWalletConflict("Không thể thay đổi ví: số dư không đủ, vượt giới hạn hoặc thao tác đã được xử lý.");
      }
    } catch (error) {
      const replay = await existing();
      if (replay && replay.delta === amount && replay.kind === kind && replay.actorUserId === actorId) return this.forOwner(userId);
      throw error;
    }
    return this.forOwner(userId);
  }
}
