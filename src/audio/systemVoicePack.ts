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

export const SYSTEM_VOICE_PACK = {
  id: "co-linh-mechanical-core-v1",
  basePath: "/assets/system-voice/mechanical-core-v1",
  synthetic: true,
  humanReviewed: false,
  localStudyOnly: true,
} as const;

export const systemVoiceClipForSignal = (type: SystemSignalType): SystemVoiceSignalId | undefined =>
  (SYSTEM_VOICE_SIGNAL_IDS as readonly SystemSignalType[]).includes(type)
    ? type as SystemVoiceSignalId
    : undefined;

export const systemVoiceClipUrl = (clipId: SystemVoiceClipId) =>
  `${SYSTEM_VOICE_PACK.basePath}/${clipId.replaceAll(".", "-")}.mp3`;
