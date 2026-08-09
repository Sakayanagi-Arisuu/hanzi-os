import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import { isStartingLevel } from "../learning/startingLevels";
import {
  canonicalStringify,
  sha256Hex,
} from "./document";
import type { CloudSyncDocumentV1 } from "./types";
import type { AppAuthorization } from "../auth/authorization";
import type { FirstPartyAuthProvider } from "../server/authRepository";

export const CLOUD_FIRST_PARTY_AUTH_PROVIDERS = [
  "google",
  "facebook",
  "hanzi",
  "email_otp",
  "passkey",
] as const satisfies readonly FirstPartyAuthProvider[];

export const SYNC_PROTOCOL_VERSION = 1 as const;

export type SyncOperationKind = "snapshot" | "local-import" | "reset";

export type SyncPushOperationV1 = {
  protocolVersion: 1;
  operationId: string;
  idempotencyKey: string;
  ownerKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  baseRevision: number;
  kind: SyncOperationKind;
  contentVersion: string;
  occurredAt: string;
  requestHash: string;
  document: CloudSyncDocumentV1;
};

export type SyncPullResponseV1 = {
  protocolVersion: 1;
  revision: number;
  cursor: number;
  document: CloudSyncDocumentV1 | null;
};

export type SyncPushResponseV1 = {
  protocolVersion: 1;
  acceptedOperationId: string;
  duplicate: boolean;
  revision: number;
  cursor: number;
  document: CloudSyncDocumentV1;
  conflicts: Array<{
    collection: string;
    key: string;
    reason: string;
  }>;
};

export type CloudSession =
  | {
      authenticated: false;
      user: null;
      accountKey: null;
      authorization?: null;
    }
  | {
      authenticated: true;
      user: {
        displayName: string;
        email: string;
        fullName: string | null;
        provider?: FirstPartyAuthProvider;
      };
      accountKey: string;
      authorization?: AppAuthorization;
    };

export type SyncApiError = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    retryable?: boolean;
  };
};

const hashPayload = (operation: Omit<SyncPushOperationV1, "requestHash">) => ({
  protocolVersion: operation.protocolVersion,
  operationId: operation.operationId,
  idempotencyKey: operation.idempotencyKey,
  installationId: operation.installationId,
  deviceId: operation.deviceId,
  deviceSequence: operation.deviceSequence,
  baseRevision: operation.baseRevision,
  kind: operation.kind,
  contentVersion: operation.contentVersion,
  occurredAt: operation.occurredAt,
  document: operation.document,
});

export const hashSyncPushOperation = (
  operation: Omit<SyncPushOperationV1, "requestHash">,
) => sha256Hex(canonicalStringify(hashPayload(operation)));

export async function hasValidSyncOperationHash(
  operation: SyncPushOperationV1,
) {
  const { requestHash, ...withoutHash } = operation;
  return requestHash === await hashSyncPushOperation(withoutHash);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

const isNonNegativeInteger = (value: unknown) =>
  Number.isInteger(value) && Number(value) >= 0;

const isFiniteNonNegativeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isBoundedText = (value: unknown, maxLength: number) =>
  typeof value === "string" && value.length <= maxLength;

const isCalendarDateOrNull = (value: unknown) => {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
};

const exerciseKinds = new Set([
  "meaning",
  "pinyin",
  "tone",
  "tone-pair",
  "listening",
  "sentence",
  "recall",
]);
const evidenceSkills = new Set([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);

const isMistakeShape = (value: unknown) => isRecord(value)
  && isNonEmptyString(value.id, 240)
  && isNonEmptyString(value.lessonId, 160)
  && isNonEmptyString(value.questionId, 240)
  && (value.wordId === undefined || isNonEmptyString(value.wordId, 160))
  && typeof value.kind === "string"
  && exerciseKinds.has(value.kind)
  && typeof value.skill === "string"
  && evidenceSkills.has(value.skill)
  && isBoundedText(value.prompt, 2_000)
  && isBoundedText(value.selectedAnswer, 2_000)
  && isBoundedText(value.correctAnswer, 2_000)
  && isBoundedText(value.explanation, 6_000)
  && Number.isSafeInteger(value.occurrences)
  && Number(value.occurrences) >= 1
  && Number(value.occurrences) <= 1_000_000
  && Number.isSafeInteger(value.correctedStreak)
  && Number(value.correctedStreak) >= 0
  && Number(value.correctedStreak) <= 1_000_000
  && typeof value.resolved === "boolean"
  && isNonEmptyString(value.lastAttemptAt, 40)
  && Number.isFinite(Date.parse(value.lastAttemptAt as string));

const hasBoundedJsonShape = (root: unknown) => {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 60_000 || current.depth > 14) return false;
    if (typeof current.value === "string" && current.value.length > 12_000) return false;
    if (Array.isArray(current.value)) {
      current.value.forEach((item) => stack.push({ value: item, depth: current.depth + 1 }));
      continue;
    }
    if (!isRecord(current.value)) continue;
    const entries = Object.entries(current.value);
    if (entries.length > 20_000) return false;
    for (const [key, item] of entries) {
      if (key.length > 240) return false;
      stack.push({ value: item, depth: current.depth + 1 });
    }
  }
  return true;
};

const isClock = (value: unknown) => isRecord(value)
  && isNonNegativeInteger(value.counter)
  && isNonEmptyString(value.operationId, 160)
  && isNonEmptyString(value.observedAt, 40)
  && Number.isFinite(Date.parse(value.observedAt as string));

const isClockedValue = (
  value: unknown,
): value is Record<string, unknown> & { value: unknown; clock: unknown } =>
  isRecord(value) && "value" in value && isClock(value.clock);

const isProfileShape = (value: unknown) => isRecord(value)
  && typeof value.name === "string"
  && value.name.length <= 120
  && ["conversation", "hsk", "career", "travel"].includes(String(value.goal))
  && [10, 20, 30].includes(Number(value.dailyMinutes))
  && ["simplified", "traditional"].includes(String(value.script))
  && isStartingLevel(value.startingLevel)
  && typeof value.onboarded === "boolean";

const isDiagnosticShape = (value: unknown) => isRecord(value)
  && typeof value.completed === "boolean"
  && isFiniteNonNegativeNumber(value.score)
  && Number(value.score) <= 100
  && isNonEmptyString(value.recommendedLessonId, 120)
  && (value.completedAt === null
    || isNonEmptyString(value.completedAt, 40)
      && Number.isFinite(Date.parse(value.completedAt as string)));

const isLearningEvidenceShape = (value: unknown) => {
  if (!isRecord(value)) return false;
  const metadata = value.metadata;
  return isNonEmptyString(value.idempotencyKey, 240)
    && value.schemaVersion === 1
    && isNonEmptyString(value.contentVersion, 80)
    && isNonEmptyString(value.activityVersion, 160)
    && isNonEmptyString(value.activityId, 240)
    && isNonEmptyString(value.source, 32)
    && isNonEmptyString(value.method, 48)
    && isNonEmptyString(value.skill, 32)
    && isNonEmptyString(value.outcome, 24)
    && (value.score === null || typeof value.score === "number" && Number.isFinite(value.score))
    && typeof value.verified === "boolean"
    && typeof value.masteryEligible === "boolean"
    && isNonEmptyString(value.occurredAt, 40)
    && Number.isFinite(Date.parse(value.occurredAt as string))
    && (metadata === undefined || isRecord(metadata) && Object.keys(metadata).length <= 32);
};

const isCloudDocumentShape = (value: unknown) => {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (
    !isClock(value.clock)
    || !isRecord(value.reset)
    || !isValidLearningResetEpoch(value.reset.epoch)
    || !isClock(value.reset.clock)
    || !isClockedValue(value.profile)
    || !isProfileShape(value.profile.value)
    || !isClockedValue(value.diagnostic)
    || !isDiagnosticShape(value.diagnostic.value)
    || !isClockedValue(value.legacyXpBaseline)
    || !isFiniteNonNegativeNumber(value.legacyXpBaseline.value)
    || !isRecord(value.savedWords)
    || Object.keys(value.savedWords).length > 5_000
  ) return false;
  for (const entry of Object.values(value.savedWords)) {
    if (!isRecord(entry) || typeof entry.present !== "boolean" || !isClock(entry.clock)) {
      return false;
    }
  }

  const state = value.state;
  if (
    !isRecord(state)
    || state.schemaVersion !== 2
    || !isNonEmptyString(state.contentVersion, 80)
    || !isProfileShape(state.profile)
    || !isFiniteNonNegativeNumber(state.xp)
    || !isFiniteNonNegativeNumber(state.dailyXp)
    || !isFiniteNonNegativeNumber(state.streak)
    || !isCalendarDateOrNull(state.lastStudyDate)
    || !isRecord(state.completedLessons)
    || Object.keys(state.completedLessons).length > 2_000
    || !Array.isArray(state.savedWords)
    || state.savedWords.length > 5_000
    || !isRecord(state.fsrsCards)
    || Object.keys(state.fsrsCards).length > 5_000
    || !isFiniteNonNegativeNumber(state.reviewCount)
    || !isRecord(state.skillMastery)
    || !isRecord(state.knowledge)
    || Object.keys(state.knowledge).length > 20_000
    || !Array.isArray(state.mistakes)
    || state.mistakes.length > 2_000
    || state.mistakes.some((mistake) => !isMistakeShape(mistake))
    || !Array.isArray(state.evidence)
    || state.evidence.length > 20_000
    || !Array.isArray(state.activityLog)
    || state.activityLog.length > 2_000
    || !isDiagnosticShape(state.diagnostic)
    || state.evidence.some((evidence) => !isLearningEvidenceShape(evidence))
  ) return false;
  return true;
};

export function parseSyncPushOperation(
  value: unknown,
): { ok: true; operation: SyncPushOperationV1 } | { ok: false; reason: string } {
  if (!isRecord(value)) return { ok: false, reason: "Body must be an object." };
  if (!hasBoundedJsonShape(value)) {
    return { ok: false, reason: "Sync payload is too deeply nested or contains oversized fields." };
  }
  if (value.protocolVersion !== SYNC_PROTOCOL_VERSION) {
    return { ok: false, reason: "Unsupported sync protocol version." };
  }
  if (!isNonEmptyString(value.operationId, 160)) {
    return { ok: false, reason: "operationId is invalid." };
  }
  if (value.idempotencyKey !== value.operationId) {
    return { ok: false, reason: "idempotencyKey must equal operationId." };
  }
  if (!isNonEmptyString(value.ownerKey, 96)) {
    return { ok: false, reason: "ownerKey is invalid." };
  }
  if (
    !isNonEmptyString(value.installationId, 160)
    || !isNonEmptyString(value.deviceId, 160)
  ) {
    return { ok: false, reason: "Device identity is invalid." };
  }
  if (
    !isNonNegativeInteger(value.deviceSequence)
    || Number(value.deviceSequence) === 0
    || !isNonNegativeInteger(value.baseRevision)
  ) {
    return { ok: false, reason: "Device sequence or base revision is invalid." };
  }
  if (!(["snapshot", "local-import", "reset"] as const).includes(
    value.kind as SyncOperationKind,
  )) {
    return { ok: false, reason: "Operation kind is invalid." };
  }
  if (
    !isNonEmptyString(value.contentVersion, 80)
    || !isNonEmptyString(value.occurredAt, 40)
    || !Number.isFinite(Date.parse(String(value.occurredAt)))
    || !isNonEmptyString(value.requestHash, 128)
  ) {
    return { ok: false, reason: "Operation metadata is invalid." };
  }
  if (!isCloudDocumentShape(value.document)) {
    return { ok: false, reason: "Cloud document is invalid." };
  }

  const document = value.document as unknown as CloudSyncDocumentV1;
  if (
    document.state.evidence.some((evidence) =>
      !isRecord(evidence) || evidence.method === "speech-transcript"
    )
  ) {
    return {
      ok: false,
      reason: "Cloud payload contains local-only speech evidence.",
    };
  }

  return { ok: true, operation: value as SyncPushOperationV1 };
}

export const noStoreJsonHeaders = {
  "cache-control": "private, no-store, max-age=0",
  expires: "0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
};
