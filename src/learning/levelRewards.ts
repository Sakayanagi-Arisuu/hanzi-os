/** Product policy: interaction levels reward persistence, never certify mastery. */
export const LEVEL_XP = 500;
export const LEVEL_REWARD_COINS = 100;
export const interactionLevel = (xp: number) => Math.floor(Math.max(0, xp) / LEVEL_XP) + 1;
export type LevelRewardSnapshot = {
  level: number; totalXp: number; xpToNext: number; progress: number;
  balance: number; coinsPerLevel: number; pendingCount: number; pendingCoins: number;
};
