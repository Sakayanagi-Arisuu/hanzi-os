import type { StartingLevel } from "../learning/startingLevels";

export type PlacementLevel = 1 | 2 | 3 | 4;
export type PlacementBand = "step-down" | "matched" | "advance";

export type PlacementSkillResult = {
  correct: number;
  total: number;
};

export type PlacementRecommendation = {
  band: PlacementBand;
  acceptedStartingLevel: Exclude<StartingLevel, "basic"> | null;
  acceptedLevelLabel: string | null;
  nextAssessmentLevel: PlacementLevel | null;
  overallAccuracy: number;
  lowestSkillAccuracy: number;
};

export const PLACEMENT_REFERENCE_LINKS = [
  {
    label: "GF0025-2021 · Bộ Giáo dục Trung Quốc",
    href: "https://jsj.moe.gov.cn/n2/7001/7001/1573.shtml",
  },
  {
    label: "Mô tả năng lực HSK 3.0 · Chinese Test International",
    href: "https://hsk.cn-bj.ufileos.com/3.0/HSK3.0%E8%80%83%E8%AF%95%E8%83%BD%E5%8A%9B%E6%8F%8F%E8%BF%B0.pdf",
  },
  {
    label: "Cấu trúc và mô tả HSK · Chinese Test International",
    href: "https://www.chinesetest.cn/HSK/1?type=1",
  },
  {
    label: "Thông báo thử nghiệm HSK 3.0 · Chinese Test International",
    href: "https://www.chinesetest.cn/notice",
  },
] as const;

export const PLACEMENT_LEVEL_OPTIONS = [
  {
    level: 1,
    title: "HSK1 · Căn cơ sơ khởi",
    description: "Câu ngắn, thông tin cá nhân và tình huống sinh hoạt cơ bản.",
    itemCount: 12,
    duration: "8–12 phút",
  },
  {
    level: 2,
    title: "HSK2 · Căn cơ sơ cấp",
    description: "Hội thoại quen thuộc, chuỗi câu và ngữ pháp nền.",
    itemCount: 12,
    duration: "8–12 phút",
  },
  {
    level: 3,
    title: "HSK3 · Cảnh giới trung cấp I",
    description: "Đoạn ngắn, ý chính–chi tiết và tường thuật trong ngữ cảnh.",
    itemCount: 12,
    duration: "8–12 phút",
  },
  {
    level: 4,
    title: "HSK4 · Cảnh giới trung cấp II",
    description: "Văn bản dài hơn, suy luận và diễn đạt có cấu trúc.",
    itemCount: 12,
    duration: "8–12 phút",
  },
] as const satisfies ReadonlyArray<{
  level: PlacementLevel;
  title: string;
  description: string;
  itemCount: number;
  duration: string;
}>;

export const defaultPlacementLevel = (
  startingLevel: StartingLevel,
): PlacementLevel => startingLevel === "hsk4"
  ? 4
  : startingLevel === "hsk3"
    ? 3
    : startingLevel === "hsk2"
      ? 2
      : 1;

const asStartingLevel = (
  level: 0 | PlacementLevel,
): Exclude<StartingLevel, "basic"> => level === 0 ? "zero" : `hsk${level}`;

export const derivePlacementRecommendation = (
  assessedLevel: PlacementLevel,
  skillResults: readonly PlacementSkillResult[],
): PlacementRecommendation => {
  if (skillResults.length === 0) {
    throw new Error("Placement requires at least one measured skill");
  }

  const normalized = skillResults.map(({ correct, total }) => {
    if (
      !Number.isInteger(correct)
      || !Number.isInteger(total)
      || total <= 0
      || correct < 0
      || correct > total
    ) throw new Error("Invalid placement skill result");
    return { correct, total, accuracy: correct / total };
  });
  const correct = normalized.reduce((sum, result) => sum + result.correct, 0);
  const total = normalized.reduce((sum, result) => sum + result.total, 0);
  const overallAccuracy = correct / total;
  const lowestSkillAccuracy = Math.min(...normalized.map((result) => result.accuracy));

  // This is a conservative HANZI.OS pathway rule, not an official HSK cut score:
  // advance only with >=80% overall and no observed skill below 60%; remain at
  // the assessed stage from 60%; otherwise step down one stage.
  const band: PlacementBand = overallAccuracy >= 0.8 && lowestSkillAccuracy >= 0.6
    ? "advance"
    : overallAccuracy >= 0.6
      ? "matched"
      : "step-down";
  const nextAssessmentLevel = band === "advance" && assessedLevel < 4
    ? assessedLevel + 1 as PlacementLevel
    : band === "step-down" && assessedLevel > 1
      ? assessedLevel - 1 as PlacementLevel
      : null;
  const acceptedLevel = band === "step-down"
    ? assessedLevel === 1 ? 0 : null
    : assessedLevel;

  return {
    band,
    acceptedStartingLevel: acceptedLevel === null
      ? null
      : asStartingLevel(acceptedLevel),
    acceptedLevelLabel: acceptedLevel === null
      ? null
      : acceptedLevel === 0 ? "HSK0 · Từ số 0" : `HSK${acceptedLevel}`,
    nextAssessmentLevel,
    overallAccuracy,
    lowestSkillAccuracy,
  };
};
