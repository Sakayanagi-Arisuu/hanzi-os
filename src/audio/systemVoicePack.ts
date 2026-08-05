import type { SystemSignalType } from "../system/systemSignals";
import type { SystemVoiceProfile } from "../system/systemUiPreferences";

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
const SYSTEM_VOICE_PACK_DIRS: Record<SystemVoiceProfile, string> = {
  mechanical: "mechanical-core-v1",
  oracle: "oracle-v1",
  executor: "executor-v1",
  guide: "guide-v1",
};

const localPack = (id: string, directory: string) => ({
  id,
  basePath: `/assets/system-voice/${directory}`,
  synthetic: true,
  humanReviewed: false,
  localStudyOnly: true,
});

export const SYSTEM_VOICE_PACKS = {
  mechanical: localPack("co-linh-mechanical-core-v1", SYSTEM_VOICE_PACK_DIRS.mechanical),
  oracle: localPack("thien-co-oracle-v1", SYSTEM_VOICE_PACK_DIRS.oracle),
  executor: localPack("chap-hanh-executor-v1", SYSTEM_VOICE_PACK_DIRS.executor),
  guide: localPack("dan-lo-guide-v1", SYSTEM_VOICE_PACK_DIRS.guide),
} as const;

export const systemVoiceClipForSignal = (type: SystemSignalType): SystemVoiceSignalId | undefined =>
  (SYSTEM_VOICE_SIGNAL_IDS as readonly SystemSignalType[]).includes(type)
    ? type as SystemVoiceSignalId
    : undefined;

export const systemVoiceClipUrl = (profile: SystemVoiceProfile, clipId: SystemVoiceClipId) =>
  `/assets/system-voice/${SYSTEM_VOICE_PACK_DIRS[profile]}/${clipId.replaceAll(".", "-")}.mp3`;
