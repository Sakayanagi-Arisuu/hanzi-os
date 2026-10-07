import {
  getPlacementGateSessionStorageKey,
  HSK_LEVEL_CHECK_SESSION_STORAGE_KEYS,
  PLACEMENT_GATE_SESSION_STORAGE_SUFFIX,
  readLocalStorage,
  getOwnedPlacementStorageKey,
} from "../lib/storageKeys";
import type { LearningState } from "../types";
import { evaluatePlacementSafety, type PlacementBaseline } from "./placementSafety";

type PlacementPhase = "question" | "result";

type PlacementResumeCandidate = {
  href: string;
  level: 1 | 2 | 3 | 4;
  phase: PlacementPhase;
  questionNumber: number | null;
  sessionId: string;
  updatedAt: number;
  answerCount: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCandidate = (
  raw: string | null,
  level: 1 | 2 | 3 | 4,
): PlacementResumeCandidate | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !isRecord(value.answers)) return null;
    if (
      value.version !== 1
      || (value.phase !== "question" && value.phase !== "result")
      || typeof value.sessionId !== "string"
      || value.sessionId.trim().length === 0
      || typeof value.formVersion !== "string"
      || !value.formVersion.endsWith(PLACEMENT_GATE_SESSION_STORAGE_SUFFIX)
      || typeof value.bankId !== "string"
      || !value.bankId.endsWith(PLACEMENT_GATE_SESSION_STORAGE_SUFFIX)
      || !Number.isInteger(value.index)
      || (value.index as number) < 0
      || (value.index as number) >= 12
      || typeof value.checked !== "boolean"
      || Object.values(value.answers).some((answer) => typeof answer !== "string")
      || (value.phase === "result" && Object.keys(value.answers).length !== 12)
    ) return null;

    const storedIndex = value.index as number;
    const normalizedPhase: PlacementPhase = value.phase === "question"
      && value.checked
      && storedIndex === 11
      ? "result"
      : value.phase;
    const normalizedIndex = value.phase === "question"
      && value.checked
      && storedIndex < 11
      ? storedIndex + 1
      : storedIndex;

    return {
      href: `/assessment/placement/hsk${level}`,
      level,
      phase: normalizedPhase,
      questionNumber: normalizedPhase === "question" ? normalizedIndex + 1 : null,
      sessionId: value.sessionId,
      updatedAt: typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : 0,
      answerCount: Object.keys(value.answers).length,
    };
  } catch {
    return null;
  }
};

export type PlacementResumeDestination = Omit<PlacementResumeCandidate, "updatedAt" | "answerCount">;

export const resolvePlacementResumeDestination = (
  read: (key: string) => string | null = readLocalStorage,
  context?: { state: LearningState; ownerKey: string; now?: number; contextSnapshot?: string | null },
): PlacementResumeDestination | null => {
  const candidates = HSK_LEVEL_CHECK_SESSION_STORAGE_KEYS.flatMap((storageKey, index) => {
    const key = getPlacementGateSessionStorageKey(storageKey);
    const raw = read(context ? getOwnedPlacementStorageKey(key, context.ownerKey) : key);
    if (context) {
      try {
        const value = JSON.parse(raw ?? "null") as { baseline?: PlacementBaseline; dismissed?: boolean } | null;
        if (!value || value.dismissed || evaluatePlacementSafety(value.baseline, context.state, context.ownerKey, context.now) !== "current") return [];
        if (context.contextSnapshot !== undefined && value.baseline?.contextSnapshot !== context.contextSnapshot) return [];
      } catch { return []; }
    }
    const candidate = parseCandidate(
      raw,
      (index + 1) as 1 | 2 | 3 | 4,
    );
    return candidate ? [candidate] : [];
  });

  candidates.sort((left, right) =>
    right.updatedAt - left.updatedAt
    || Number(right.phase === "question") - Number(left.phase === "question")
    || right.answerCount - left.answerCount
    || right.level - left.level
  );
  const selected = candidates[0];
  if (!selected) return null;
  const { updatedAt: _updatedAt, answerCount: _answerCount, ...destination } = selected;
  return destination;
};
