import type { SystemSignalType } from "../system/systemSignals";

export const SYSTEM_VOICE_SIGNAL_IDS = [
  "system.online",
  "quest.activated",
  "lesson.completed",
  "path.unlocked",
  "review.queue-cleared",
  "mistake.resolved",
  "level-check.started",
  "level-check.completed",
  "rank.threshold-reached",
  "journey.promoted",
  "state.offline",
  "state.restored",
  "voice.permission-denied",
  "state.warning",
] as const satisfies readonly SystemSignalType[];

export const SYSTEM_VOICE_CLIP_IDS = [
  ...SYSTEM_VOICE_SIGNAL_IDS,
  "profile.preview",
  "status.summary",
] as const;

export type SystemVoiceClipId = (typeof SYSTEM_VOICE_CLIP_IDS)[number];
type SystemVoiceSignalId = (typeof SYSTEM_VOICE_SIGNAL_IDS)[number];
const SYSTEM_VOICE_BASE_PATH = "/assets/system-voice/mechanical-core-v1";

const SYSTEM_VOICE_LINES = [
  "Hệ thống đã thức tỉnh.",
  "Nhiệm vụ đã kích hoạt.",
  "Nhiệm vụ hoàn thành.",
  "Chặng thử luyện mới đã mở.",
  "Hàng đợi ôn tập đã hoàn tất.",
  "Nghịch cảnh đã hóa giải.",
  "Đại khảo bắt đầu.",
  "Đại khảo hoàn tất.",
  "Đã đạt ngưỡng thăng chức.",
  "Cảnh giới đã thăng cấp.",
  "Mất kết nối. Đã chuyển sang cục bộ.",
  "Kết nối đã phục hồi.",
  "Không thể mở microphone.",
  "Cảnh báo hệ thống.",
] as const;

export const SYSTEM_VOICE_PACK = {
  id: "co-linh-mechanical-core-v1",
  basePath: SYSTEM_VOICE_BASE_PATH,
  synthetic: true,
  humanReviewed: false,
  localStudyOnly: true,
} as const;

export const systemVoiceClipForSignal = (type: SystemSignalType): SystemVoiceSignalId | undefined =>
  (SYSTEM_VOICE_SIGNAL_IDS as readonly SystemSignalType[]).includes(type)
    ? type as SystemVoiceSignalId
    : undefined;

export const systemVoiceLineForSignal = (type: SystemSignalType) => {
  const index = (SYSTEM_VOICE_SIGNAL_IDS as readonly SystemSignalType[]).indexOf(type);
  return index < 0 ? undefined : SYSTEM_VOICE_LINES[index];
};

export const systemVoiceClipUrl = (clipId: SystemVoiceClipId) =>
  `${SYSTEM_VOICE_BASE_PATH}/${clipId.replaceAll(".", "-")}.mp3`;
