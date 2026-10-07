import type { LearningState } from "../types";

// A screening is a short-lived observation, not a durable learning credential.
export const PLACEMENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export type PlacementBaseline = { ownerKey: string; startedAt: number; learningSnapshot: string; contextSnapshot?: string; preservePath?: boolean };
export type PlacementSafety = "current" | "legacy" | "owner-changed" | "expired" | "learning-changed";

export const hasLearningProgress = (state: LearningState): boolean =>
  Object.keys(state.completedLessons).length > 0
  || state.reviewCount > 0
  || state.lastStudyDate !== null
  || state.evidence.some((item) => item.source !== "diagnostic")
  || state.activityLog.some((item) => item.type !== "diagnostic");

export const placementLearningSnapshot = (state: LearningState): string => JSON.stringify({
  startingLevel: state.profile.startingLevel,
  diagnostic: state.diagnostic,
  completed: Object.entries(state.completedLessons).sort(([a], [b]) => a.localeCompare(b)),
  reviewCount: state.reviewCount,
  lastStudyDate: state.lastStudyDate,
  evidence: state.evidence.filter((item) => item.source !== "diagnostic").map((item) => item.id).sort(),
  activity: state.activityLog.filter((item) => item.type !== "diagnostic").map((item) => item.id).sort(),
});

export const createPlacementBaseline = (state: LearningState, ownerKey: string, now = Date.now()): PlacementBaseline => ({
  ownerKey, startedAt: now, learningSnapshot: placementLearningSnapshot(state),
});

export const evaluatePlacementSafety = (
  baseline: PlacementBaseline | undefined,
  state: LearningState,
  ownerKey: string,
  now = Date.now(),
): PlacementSafety => {
  if (!baseline || typeof baseline.learningSnapshot !== "string") return "legacy";
  if (!ownerKey || baseline.ownerKey !== ownerKey) return "owner-changed";
  if (!Number.isFinite(baseline.startedAt) || baseline.startedAt > now
    || now - baseline.startedAt >= PLACEMENT_MAX_AGE_MS) return "expired";
  return baseline.learningSnapshot === placementLearningSnapshot(state) ? "current" : "learning-changed";
};

export const placementSafetyCopy: Record<Exclude<PlacementSafety, "current">, string> = {
  legacy: "Phiên cũ chưa đủ thông tin để đối chiếu với hành trình hiện tại. Hãy khảo nghiệm lại để nhận gợi ý mới.",
  "owner-changed": "Phiên này không thuộc hồ sơ đang mở. Hãy bắt đầu lượt khảo nghiệm riêng của bạn.",
  expired: "Lượt khảo nghiệm đã quá 7 ngày. Một lượt mới sẽ phản ánh năng lực hiện tại tốt hơn.",
  "learning-changed": "Bạn đã học thêm hoặc thay đổi lộ trình kể từ lúc bắt đầu. Kết quả cũ sẽ không được dùng để đổi điểm khởi hành.",
};
