import type { LearningEvidence, StoredFsrsCard } from "../types";

export type ReviewForecastDay = {
  count: number;
  label: string;
};

export type ReviewMemoryDistribution = {
  consolidating: number;
  newCards: number;
  stable: number;
  total: number;
};

export type ReviewSessionEntry = {
  hintUsed: boolean;
  rating: number;
  wordId: string;
};

const localDayKey = (value: Date) => [
  value.getFullYear(),
  String(value.getMonth() + 1).padStart(2, "0"),
  String(value.getDate()).padStart(2, "0"),
].join("-");

export const buildReviewForecast = (
  cards: Record<string, StoredFsrsCard>,
  now = new Date(),
): ReviewForecastDay[] => {
  const formatter = new Intl.DateTimeFormat("vi-VN", { weekday: "short" });
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return {
      count: 0,
      key: localDayKey(date),
      label: index === 0 ? "Hôm nay" : formatter.format(date),
    };
  });
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  Object.values(cards).forEach((card) => {
    const due = new Date(card.due);
    if (Number.isNaN(due.getTime())) return;
    const bucket = bucketByKey.get(localDayKey(due));
    if (bucket) bucket.count += 1;
  });
  return buckets.map(({ count, label }) => ({ count, label }));
};

export const buildReviewMemoryDistribution = (
  cards: Record<string, StoredFsrsCard>,
): ReviewMemoryDistribution => Object.values(cards).reduce<ReviewMemoryDistribution>(
  (result, card) => {
    result.total += 1;
    if (card.reps === 0) result.newCards += 1;
    else if (card.stability >= 14 && card.lapses <= 1) result.stable += 1;
    else result.consolidating += 1;
    return result;
  },
  { consolidating: 0, newCards: 0, stable: 0, total: 0 },
);

export const countReviewsToday = (
  evidence: readonly LearningEvidence[],
  now = new Date(),
) => {
  const today = localDayKey(now);
  return evidence.filter((item) =>
    item.source === "review" && localDayKey(new Date(item.occurredAt)) === today
  ).length;
};

export const getNextReviewDate = (
  cards: Record<string, StoredFsrsCard>,
  now = new Date(),
) => Object.values(cards)
  .map((card) => new Date(card.due))
  .filter((due) => !Number.isNaN(due.getTime()) && due.getTime() > now.getTime())
  .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;

export const summarizeReviewSession = (entries: readonly ReviewSessionEntry[]) => ({
  independent: entries.filter((entry) => !entry.hintUsed && entry.rating >= 3).length,
  needsReview: entries.filter((entry) => entry.rating <= 2).length,
  total: entries.length,
  withHint: entries.filter((entry) => entry.hintUsed).length,
});
