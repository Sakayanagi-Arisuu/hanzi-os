import type { ReleasedCharacterPracticeEntry } from "../learning/richLessonContent";

export const CHARACTER_FORGE_PHASES = [
  "structure",
  "prediction",
  "guided",
  "recall",
  "context",
] as const;

export type CharacterForgePhase = typeof CHARACTER_FORGE_PHASES[number];
export type CharacterForgeRoutePhase = CharacterForgePhase | "result";
export type CharacterForgeSource = "lesson" | "quick" | "custom" | "legacy";

export type CharacterForgeSession = {
  version: 1;
  source: CharacterForgeSource;
  lessonId: string | null;
  hanzis: string[];
  currentIndex: number;
  phase: CharacterForgeRoutePhase;
  assistanceByHanzi: Record<string, number>;
  completedHanzis: string[];
  needsReplay: string[];
  paperHanzis: string[];
  updatedAt: string;
};

const phaseIndex = new Map(CHARACTER_FORGE_PHASES.map((phase, index) => [phase, index]));

export const isCharacterForgePhase = (value: string | null): value is CharacterForgePhase =>
  Boolean(value && phaseIndex.has(value as CharacterForgePhase));

export const isCharacterForgeRoutePhase = (value: string | null): value is CharacterForgeRoutePhase =>
  value === "result" || isCharacterForgePhase(value);

export const getNextForgePhase = (phase: CharacterForgePhase): CharacterForgeRoutePhase => {
  const index = phaseIndex.get(phase) ?? 0;
  return CHARACTER_FORGE_PHASES[index + 1] ?? "result";
};

export const getAdaptiveAssistance = (
  level: number,
  outcome: "success" | "miss" | "hint",
) => outcome === "success"
  ? Math.max(0, level - 1)
  : Math.min(5, level + 1);

export const getSessionAssistance = (
  session: CharacterForgeSession,
  hanzi: string,
  fallback: number,
) => {
  const own = session.assistanceByHanzi[hanzi];
  if (own !== undefined) return own;
  const previousHanzi = session.currentIndex > 0
    ? session.hanzis[session.currentIndex - 1]
    : null;
  return previousHanzi
    ? session.assistanceByHanzi[previousHanzi] ?? fallback
    : fallback;
};

export const getUniqueReleasedCharacterEntries = (entries: readonly ReleasedCharacterPracticeEntry[]) => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.hanzi)) return false;
    seen.add(entry.hanzi);
    return true;
  });
};

export const buildCharacterForgeQueue = (
  entries: readonly ReleasedCharacterPracticeEntry[],
  {
    lessonId,
    requestedHanzis = [],
    limit = 5,
    offset = 0,
  }: {
    lessonId?: string | null;
    requestedHanzis?: readonly string[];
    limit?: number;
    offset?: number;
  } = {},
) => {
  const released = getUniqueReleasedCharacterEntries(entries);
  const scopedEntries = lessonId
    ? getUniqueReleasedCharacterEntries(entries.filter((entry) => entry.lessonId === lessonId))
    : released;
  const allowed = new Map((scopedEntries.length > 0 ? scopedEntries : released).map((entry) => [entry.hanzi, entry]));
  const requested = requestedHanzis
    .map((hanzi) => allowed.get(hanzi))
    .filter((entry): entry is ReleasedCharacterPracticeEntry => Boolean(entry));
  const rotated = scopedEntries.length === 0
    ? []
    : [...scopedEntries.slice(offset % scopedEntries.length), ...scopedEntries.slice(0, offset % scopedEntries.length)];
  return getUniqueReleasedCharacterEntries([...requested, ...rotated])
    .slice(0, Math.max(1, Math.min(5, limit)));
};

export const createCharacterForgeSession = ({
  entries,
  lessonId = null,
  requestedHanzis = [],
  source,
  limit = 4,
  offset = 0,
  now = new Date().toISOString(),
}: {
  entries: readonly ReleasedCharacterPracticeEntry[];
  lessonId?: string | null;
  requestedHanzis?: readonly string[];
  source: CharacterForgeSource;
  limit?: number;
  offset?: number;
  now?: string;
}): CharacterForgeSession | null => {
  const queue = buildCharacterForgeQueue(entries, {
    lessonId,
    requestedHanzis,
    limit,
    offset,
  });
  if (queue.length === 0) return null;
  return {
    version: 1,
    source,
    lessonId,
    hanzis: queue.map((entry) => entry.hanzi),
    currentIndex: 0,
    phase: "structure",
    assistanceByHanzi: {},
    completedHanzis: [],
    needsReplay: [],
    paperHanzis: [],
    updatedAt: now,
  };
};

export const advanceCharacterForgeSession = (
  session: CharacterForgeSession,
  {
    needsReplay = false,
    usedPaper = false,
    now = new Date().toISOString(),
  }: { needsReplay?: boolean; usedPaper?: boolean; now?: string } = {},
): CharacterForgeSession => {
  const hanzi = session.hanzis[session.currentIndex];
  if (!hanzi || session.phase === "result") return session;
  const needsReplayList = needsReplay
    ? [...new Set([...session.needsReplay, hanzi])]
    : session.needsReplay;
  const paperHanzis = usedPaper
    ? [...new Set([...session.paperHanzis, hanzi])]
    : session.paperHanzis;
  const nextPhase = getNextForgePhase(session.phase);
  if (nextPhase !== "result") return {
    ...session,
    phase: nextPhase,
    needsReplay: needsReplayList,
    paperHanzis,
    updatedAt: now,
  };

  const completedHanzis = [...new Set([...session.completedHanzis, hanzi])];
  const nextIndex = session.currentIndex + 1;
  return {
    ...session,
    completedHanzis,
    needsReplay: needsReplayList,
    paperHanzis,
    currentIndex: Math.min(nextIndex, session.hanzis.length - 1),
    phase: nextIndex >= session.hanzis.length ? "result" : "structure",
    updatedAt: now,
  };
};

export const serializeCharacterForgeSession = (session: CharacterForgeSession) =>
  JSON.stringify(session);

export const parseCharacterForgeSession = (raw: string | null): CharacterForgeSession | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CharacterForgeSession>;
    if (
      value.version !== 1
      || !Array.isArray(value.hanzis)
      || value.hanzis.length === 0
      || value.hanzis.length > 5
      || value.hanzis.some((hanzi) => typeof hanzi !== "string" || [...hanzi].length !== 1)
      || typeof value.currentIndex !== "number"
      || value.currentIndex < 0
      || value.currentIndex >= value.hanzis.length
      || !isCharacterForgeRoutePhase(value.phase ?? null)
    ) return null;
    return {
      version: 1,
      source: value.source === "lesson" || value.source === "custom" || value.source === "legacy"
        ? value.source
        : "quick",
      lessonId: typeof value.lessonId === "string" ? value.lessonId : null,
      hanzis: [...new Set(value.hanzis)],
      currentIndex: value.currentIndex,
      phase: value.phase!,
      assistanceByHanzi: value.assistanceByHanzi && typeof value.assistanceByHanzi === "object"
        ? value.assistanceByHanzi
        : {},
      completedHanzis: Array.isArray(value.completedHanzis) ? value.completedHanzis : [],
      needsReplay: Array.isArray(value.needsReplay) ? value.needsReplay : [],
      paperHanzis: Array.isArray(value.paperHanzis) ? value.paperHanzis : [],
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
};

export type StrokeDirection = "ngang" | "dọc" | "chéo sang phải" | "chéo sang trái";

export const classifyStrokeDirection = (median: readonly [number, number][]): StrokeDirection => {
  const start = median[0];
  const end = median.at(-1);
  if (!start || !end) return "ngang";
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (Math.abs(dx) > Math.abs(dy) * 1.35) return "ngang";
  if (Math.abs(dy) > Math.abs(dx) * 1.35) return "dọc";
  return dx >= 0 ? "chéo sang phải" : "chéo sang trái";
};

const directionOrder: StrokeDirection[] = ["ngang", "dọc", "chéo sang phải", "chéo sang trái"];

export const createStrokeDirectionOptions = (
  median: readonly [number, number][],
  seed = 0,
) => {
  const answer = classifyStrokeDirection(median);
  const distractors = directionOrder.filter((direction) => direction !== answer);
  const options = [...distractors.slice(seed % distractors.length), ...distractors.slice(0, seed % distractors.length)];
  options.splice(seed % 3, 0, answer);
  return { answer, options: options.slice(0, 4) };
};

const CONFUSABLE_GROUPS = [
  ["未", "末"],
  ["土", "士"],
  ["人", "入"],
  ["日", "目", "曰"],
  ["木", "本", "术"],
  ["己", "已", "巳"],
  ["口", "囗"],
] as const;

export const getConfusableHanzis = (hanzi: string) =>
  CONFUSABLE_GROUPS.find((group) => group.includes(hanzi as never))
    ?.filter((item) => item !== hanzi) ?? [];
