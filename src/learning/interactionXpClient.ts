export const INTERACTION_XP_CHANGED_EVENT = "hanzi-interaction-xp-changed";

export const notifyInteractionXpChanged = () => {
  window.dispatchEvent(new CustomEvent(INTERACTION_XP_CHANGED_EVENT));
};

export type AccountInteractionXpSnapshot = {
  protocolVersion: 2;
  resetEpoch: number;
  totalXp: number;
  dailyXp: number;
  rewardedLessonCount: number;
  rewardedReviewCount: number;
  pronunciationRewardCount: number;
  lessonRewards: Array<{
    lessonId: string;
    amount: number;
    status: "pending" | "claimed";
  }>;
};

const finiteCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const parseSnapshot = (value: unknown): AccountInteractionXpSnapshot | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Partial<AccountInteractionXpSnapshot>;
  const lessonRewards = Array.isArray(item.lessonRewards)
    && item.lessonRewards.every((reward) =>
      reward
      && typeof reward === "object"
      && !Array.isArray(reward)
      && typeof reward.lessonId === "string"
      && reward.lessonId.length > 0
      && reward.lessonId.length <= 120
      && finiteCount(reward.amount)
      && (reward.status === "pending" || reward.status === "claimed")
    );
  return item.protocolVersion === 2
    && finiteCount(item.resetEpoch)
    && finiteCount(item.totalXp)
    && finiteCount(item.dailyXp)
    && finiteCount(item.rewardedLessonCount)
    && finiteCount(item.rewardedReviewCount)
    && finiteCount(item.pronunciationRewardCount)
    && lessonRewards
    ? item as AccountInteractionXpSnapshot
    : null;
};

export const claimLessonInteractionXp = async (
  lessonId: string,
  resetEpoch: number,
) => {
  const response = await fetch("/api/learning/xp", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "lesson", lessonId, resetEpoch }),
  });
  if (!response.ok) return null;
  const value = await response.json() as {
    awarded?: unknown;
    amount?: unknown;
    status?: unknown;
  };
  if (
    typeof value.awarded !== "boolean"
    || !finiteCount(value.amount)
    || value.status !== "claimed"
  ) return null;
  notifyInteractionXpChanged();
  return { awarded: value.awarded, amount: value.amount };
};

export const fetchAccountInteractionXp = async (
  dayStart: number,
  dayEnd: number,
): Promise<AccountInteractionXpSnapshot | null> => {
  const search = new URLSearchParams({
    dayStart: String(dayStart),
    dayEnd: String(dayEnd),
  });
  const response = await fetch(`/api/learning/xp?${search}`, {
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) return null;
  return parseSnapshot(await response.json());
};

export const claimPronunciationInteractionXp = async (
  rewardKey: string,
  resetEpoch: number,
) => {
  const response = await fetch("/api/learning/xp", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rewardKey, resetEpoch }),
  });
  if (!response.ok) return false;
  const value = await response.json() as { awarded?: unknown };
  notifyInteractionXpChanged();
  return value.awarded === true;
};
