import { COURSE_UNITS } from "../data/curriculum";
import { getSystemClass } from "./systemLexicon";
import type { LearningState } from "../types";

export { getSystemClass } from "./systemLexicon";

export const ACTIVITY_RANKS = [
  { min: 0, title: "Khai Ngôn", chinese: "开言境" },
  { min: 500, title: "Tụ Âm", chinese: "聚音境" },
  { min: 1_400, title: "Ngưng Ý", chinese: "凝意境" },
  { min: 2_800, title: "Thông Văn", chinese: "通文境" },
  { min: 5_000, title: "Linh Ngôn", chinese: "灵言境" },
  { min: 8_000, title: "Hóa Cảnh", chinese: "化境" },
] as const;

export type ActivityRankProgress = {
  title: string;
  chinese: string;
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number;
  xpIntoRank: number;
  xpForRank: number | null;
  xpToNext: number | null;
};

export const getInteractionRankProgress = (xp: number): ActivityRankProgress => {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const currentIndex = Math.max(
    0,
    ACTIVITY_RANKS.findLastIndex((rank) => safeXp >= rank.min),
  );
  const current = ACTIVITY_RANKS[currentIndex]!;
  const next = ACTIVITY_RANKS[currentIndex + 1] ?? null;
  const xpIntoRank = safeXp - current.min;
  const xpForRank = next ? next.min - current.min : null;
  const progress = xpForRank === null
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpIntoRank / xpForRank) * 100)));

  return {
    title: current.title,
    chinese: current.chinese,
    currentThreshold: current.min,
    nextThreshold: next?.min ?? null,
    progress,
    xpIntoRank,
    xpForRank,
    xpToNext: next ? Math.max(0, next.min - safeXp) : null,
  };
};

const JOURNEY_REALMS = [
  { id: "hsk0", title: "Khai Âm Giả", unitIds: ["boot"] },
  { id: "hsk1", title: "Tụ Từ Hành Giả", unitIds: ["survival", "hsk1-time-place-events", "daily", "characters", "journey", "professional"] },
  { id: "hsk2", title: "Liên Cú Sư", unitIds: ["hsk2-situational-dialogue", "hsk2-sentence-chains", "hsk2-short-text-production"] },
  { id: "hsk3", title: "Tường Thuật Sư", unitIds: ["hsk3-paragraph-input", "hsk3-narration", "hsk3-guided-production"] },
  { id: "hsk4", title: "Luận Ngôn Sư", unitIds: ["hsk4-deep-comprehension", "hsk4-summary-argument", "hsk4-timed-integration"] },
] as const;

const LESSON_IDS_BY_UNIT = new Map(
  COURSE_UNITS.map((unit) => [unit.id, unit.lessons.map((lesson) => lesson.id)]),
);

export type JourneyTitle = {
  id: string;
  title: string;
  lessonCount: number;
  completed: boolean;
};

export const deriveJourneyTitles = (
  completedLessons: LearningState["completedLessons"],
): JourneyTitle[] => JOURNEY_REALMS.map((realm) => {
  const lessonIds = realm.unitIds.flatMap((unitId) => LESSON_IDS_BY_UNIT.get(unitId) ?? []);
  return {
    id: realm.id,
    title: realm.title,
    lessonCount: lessonIds.length,
    completed: lessonIds.length > 0 && lessonIds.every(
      (lessonId) => (completedLessons[lessonId]?.bestScore ?? 0) >= 70,
    ),
  };
});

export type SystemAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

export const deriveSystemAchievements = (state: LearningState): SystemAchievement[] => [
  {
    id: "awakened",
    title: "Tân Tỉnh",
    description: "Đã kích hoạt hồ sơ học trên thiết bị.",
    unlocked: state.profile.onboarded,
  },
  {
    id: "steadfast-seven",
    title: "Bền Tâm",
    description: "Duy trì nhịp học ít nhất 7 ngày.",
    unlocked: state.streak >= 7,
  },
  {
    id: "adversity-breaker",
    title: "Phá Giải Giả",
    description: "Đã tự gọi đúng để đóng một Nghịch Cảnh.",
    unlocked: state.mistakes.some((mistake) => mistake.resolved),
  },
  {
    id: "lexicon-seal",
    title: "Tàng Tự",
    description: "Đã lưu ít nhất 25 Ấn Ký Từ Vựng.",
    unlocked: state.savedWords.length >= 25,
  },
];

export type SystemCeremony = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  disclosure: string;
};

export const deriveSystemCeremonies = (state: LearningState): SystemCeremony[] => {
  const rank = getInteractionRankProgress(state.xp);
  const systemClass = getSystemClass(state.profile.goal);
  const journeyTitles = deriveJourneyTitles(state.completedLessons)
    .filter((item) => item.completed);
  const highestJourney = journeyTitles.at(-1);
  const ceremonies: SystemCeremony[] = [];

  if (state.profile.onboarded) {
    ceremonies.push({
      id: `awakening:${state.profile.goal}`,
      eyebrow: "AWAKENING PROTOCOL COMPLETE",
      title: systemClass.title,
      subtitle: systemClass.plain,
      disclosure: "Định hướng nội bộ theo Thiên Mệnh đã chọn; không phải cấp năng lực.",
    });
  }
  if (rank.currentThreshold > 0) {
    ceremonies.push({
      id: `activity-rank:${rank.currentThreshold}`,
      eyebrow: "ACTIVITY THRESHOLD REACHED",
      title: rank.title,
      subtitle: `${state.xp.toLocaleString("vi-VN")} XP tương tác đã được ghi nhận.`,
      disclosure: "Cảnh giới hoạt động nội bộ; XP không biểu thị mastery hoặc trình độ HSK.",
    });
  }
  if (highestJourney) {
    ceremonies.push({
      id: `journey:${highestJourney.id}:${state.contentVersion}`,
      eyebrow: "JOURNEY REALM CLEARED",
      title: highestJourney.title,
      subtitle: `Đã thông qua ${highestJourney.lessonCount} Thử Luyện của chặng này.`,
      disclosure: "Danh hiệu hoàn thành hành trình nội bộ HANZI.OS; không phải chứng nhận HSK hoặc xác nhận mastery.",
    });
  }
  return ceremonies.reverse();
};
