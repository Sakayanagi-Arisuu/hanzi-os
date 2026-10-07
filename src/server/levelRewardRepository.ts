import { interactionLevel, LEVEL_REWARD_COINS, LEVEL_XP, type LevelRewardSnapshot } from "../learning/levelRewards";
import type { D1Database } from "./d1";
import { InteractionXpRepository } from "./interactionXpRepository";
import { CURRENT_LEARNING_RESET_EPOCH_SQL } from "./learningResetEpoch";
import { HanziWalletRepository } from "./hanziWalletRepository";

export class LevelRewardRepository {
  constructor(private database: D1Database, private now = Date.now()) {}

  private async source(userId: string) {
    const start = Math.floor(this.now / 86400000) * 86400000;
    const xp = await new InteractionXpRepository(this.database, () => this.now).read(userId, start, start + 86400000);
    const entries = await this.database.prepare("SELECT reference_id AS reference FROM hanzi_wallet_entries WHERE user_id=? AND kind='level_reward'")
      .bind(userId).all<{ reference: string }>();
    if (!entries.success) throw new Error("Reward history unavailable");
    const claimed = new Set((entries.results ?? []).map(item => Number(/^level:(\d+)$/.exec(item.reference)?.[1])).filter(Number.isSafeInteger));
    return { xp, level: interactionLevel(xp.totalXp), claimed };
  }

  async read(userId: string): Promise<LevelRewardSnapshot> {
    const { xp, level, claimed } = await this.source(userId);
    const wallet = await new HanziWalletRepository(this.database).forOwner(userId);
    const pendingCount = Math.max(0, level - 1 - [...claimed].filter(value => value >= 2 && value <= level).length);
    return { level, totalXp: xp.totalXp, xpToNext: LEVEL_XP - xp.totalXp % LEVEL_XP,
      progress: xp.totalXp % LEVEL_XP / LEVEL_XP * 100, balance: wallet.balance,
      coinsPerLevel: LEVEL_REWARD_COINS, pendingCount, pendingCoins: pendingCount * LEVEL_REWARD_COINS };
  }

  async claim(userId: string) {
    const { xp, level, claimed } = await this.source(userId);
    // Bound each transaction; older levels remain claimable on the next request.
    const levels: number[] = [];
    for (let n = 2; n <= level && levels.length < 50; n++) if (!claimed.has(n)) levels.push(n);
    for (const milestone of levels) {
      const reference = `level:${milestone}`;
      const result = await this.database.batch([
        this.database.prepare("INSERT OR IGNORE INTO hanzi_wallets (user_id,balance,updated_at) VALUES (?,0,?)").bind(userId, this.now),
        this.database.prepare(`UPDATE hanzi_wallets SET balance=balance+?,updated_at=? WHERE user_id=?
          AND balance+? <= 1000000000 AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}
          AND NOT EXISTS (SELECT 1 FROM hanzi_wallet_entries WHERE user_id=? AND reference_id=?)`)
          .bind(LEVEL_REWARD_COINS, this.now, userId, LEVEL_REWARD_COINS, userId, xp.resetEpoch, userId, reference),
        this.database.prepare(`INSERT INTO hanzi_wallet_entries (id,user_id,delta,kind,reference_id,actor_user_id,created_at)
          SELECT ?,?,?,'level_reward',?,NULL,? WHERE changes()=1`)
          .bind(crypto.randomUUID(), userId, LEVEL_REWARD_COINS, reference, this.now),
      ]);
      if (result.some(item => !item.success)) throw new Error("Reward transaction failed");
    }
    return this.read(userId);
  }
}
