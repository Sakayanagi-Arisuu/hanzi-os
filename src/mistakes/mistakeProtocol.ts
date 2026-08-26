export const MISTAKE_QUEUE_PROTOCOL_VERSION = 1 as const;

export type MistakeObjectiveMethod =
  | "meaning-selection"
  | "phonology-recognition"
  | "listening-selection"
  | "typed-character-recall"
  | "reading-comprehension";

export type MistakeSkill =
  | "pronunciation"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "vocabulary"
  | "grammar";

export type MistakeKind =
  | "meaning"
  | "pinyin"
  | "tone"
  | "tone-pair"
  | "listening"
  | "sentence"
  | "recall"
  | "reader";

export type MistakeQueueItemV1 = {
  remediationId: string;
  originSource: "lesson" | "reader";
  activityId: string;
  activityVersion: string;
  method: MistakeObjectiveMethod;
  skill: MistakeSkill;
  kind: MistakeKind;
  instruction: string;
  prompt: string;
  promptMeta?: string;
  options: string[];
  spokenText?: string;
  hint: string;
  occurrenceCount: number;
  correctedStreak: number;
  resolved: boolean;
  lastAttemptAt: string;
};

export type RemediationAttemptCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  activityId: string;
  activityVersion: string;
  source: "mistake";
  method: MistakeObjectiveMethod;
  occurredAt: string;
  response: {
    kind: "answer";
    answer: string;
    usedHint: boolean;
    durationMs: number;
  };
};

export type RemediationAttemptReceiptV1 = {
  protocolVersion: 1;
  outcome: "correct" | "incorrect";
  verification: "server-objective";
  method: "remediation-recall";
  [key: string]: unknown;
};

export type MistakeQueueV1 = {
  protocolVersion: 1;
  resetEpoch: number;
  contentVersion: string;
  generatedAt: string;
  openCount: number;
  resolvedCount: number;
  items: MistakeQueueItemV1[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const validItem = (value: unknown): value is MistakeQueueItemV1 =>
  isRecord(value)
  && typeof value.remediationId === "string"
  && (value.originSource === "lesson" || value.originSource === "reader")
  && typeof value.activityId === "string"
  && typeof value.activityVersion === "string"
  && typeof value.method === "string"
  && typeof value.skill === "string"
  && typeof value.kind === "string"
  && typeof value.instruction === "string"
  && typeof value.prompt === "string"
  && Array.isArray(value.options)
  && value.options.every((option) => typeof option === "string")
  && typeof value.hint === "string"
  && Number.isSafeInteger(value.occurrenceCount)
  && Number.isSafeInteger(value.correctedStreak)
  && typeof value.resolved === "boolean"
  && typeof value.lastAttemptAt === "string";

export const parseMistakeQueue = (value: unknown): MistakeQueueV1 | null => {
  if (
    !isRecord(value)
    || value.protocolVersion !== MISTAKE_QUEUE_PROTOCOL_VERSION
    || !Number.isSafeInteger(value.resetEpoch)
    || typeof value.contentVersion !== "string"
    || typeof value.generatedAt !== "string"
    || !Number.isSafeInteger(value.openCount)
    || !Number.isSafeInteger(value.resolvedCount)
    || !Array.isArray(value.items)
    || !value.items.every(validItem)
  ) return null;
  return value as MistakeQueueV1;
};
