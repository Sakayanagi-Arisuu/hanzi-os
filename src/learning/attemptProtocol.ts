import { CONTENT_VERSION } from "../data/curriculum";
import { isAttemptSourceMethodAllowed } from "../lib/evidencePolicy";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type {
  EvidenceMethod,
  EvidenceOutcome,
  EvidenceSource,
  Skill,
} from "../types";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const ATTEMPT_PROTOCOL_VERSION = 1 as const;
export const ATTEMPT_IDEMPOTENCY_SCOPE = "learning-attempt-v1";

export type ObjectiveAttemptSource = Extract<
  EvidenceSource,
  "lesson" | "reader" | "mistake"
>;

export type ObjectiveAttemptMethod = Extract<
  EvidenceMethod,
  | "meaning-selection"
  | "phonology-recognition"
  | "listening-selection"
  | "typed-character-recall"
  | "reading-comprehension"
>;

export type AttemptAnswerResponseV1 = {
  kind: "answer";
  answer: string;
  usedHint: boolean;
  durationMs?: number;
};

/**
 * Untrusted client command. Correctness, scores, verification, mastery, and
 * answer keys are deliberately absent; the server derives them from the
 * released activity version.
 */
export type LearningAttemptCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  activityId: string;
  activityVersion: string;
  source: ObjectiveAttemptSource;
  method: ObjectiveAttemptMethod;
  sessionId?: string;
  occurredAt: string;
  response: AttemptAnswerResponseV1;
};

export type LearningAttemptReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  attemptId: string;
  evidenceId: string;
  resetEpoch: number;
  source: ObjectiveAttemptSource;
  method: ObjectiveAttemptMethod | "remediation-recall";
  activityId: string;
  activityVersion: string;
  skill: Skill;
  outcome: Extract<EvidenceOutcome, "correct" | "incorrect">;
  score: 0 | 100;
  verification: "server-objective";
};

export type AttemptCommandParseResult =
  | { ok: true; command: LearningAttemptCommandV1 }
  | { ok: false; reason: string };

const OBJECTIVE_METHODS = new Set<ObjectiveAttemptMethod>([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
]);

const ROOT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "activityId",
  "activityVersion",
  "source",
  "method",
  "sessionId",
  "occurredAt",
  "response",
]);

const RESPONSE_KEYS = new Set([
  "kind",
  "answer",
  "usedHint",
  "durationMs",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, allowed: ReadonlySet<string>) =>
  Object.keys(value).every((key) => allowed.has(key));

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

const safePositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 1;

const safeDurationMs = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && value <= 600_000;

const normalizedTime = (value: unknown) => {
  if (!boundedString(value, 40)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const parseLearningAttemptCommand = (
  input: unknown,
): AttemptCommandParseResult => {
  if (!isRecord(input) || !exactKeys(input, ROOT_KEYS)) {
    return { ok: false, reason: "Attempt command contains unknown or invalid fields." };
  }
  if (input.protocolVersion !== ATTEMPT_PROTOCOL_VERSION) {
    return { ok: false, reason: "Attempt protocol version is unsupported." };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !safePositiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.activityId, 240)
    || !boundedString(input.activityVersion, 160)
  ) {
    return { ok: false, reason: "Attempt identifiers exceed protocol bounds." };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return { ok: false, reason: "Attempt content version is unsupported." };
  }
  if (
    input.source !== "lesson"
    && input.source !== "reader"
    && input.source !== "mistake"
  ) {
    return {
      ok: false,
      reason: "Only objective lesson, reader and remediation attempts are supported.",
    };
  }
  if (
    typeof input.method !== "string"
    || !OBJECTIVE_METHODS.has(input.method as ObjectiveAttemptMethod)
    || (
      input.source !== "mistake"
      && !isAttemptSourceMethodAllowed(
        input.source,
        input.method as ObjectiveAttemptMethod,
      )
    )
  ) {
    return { ok: false, reason: "Attempt source and method are incompatible." };
  }
  if (
    input.sessionId !== undefined
    && !boundedString(input.sessionId, 160)
  ) {
    return { ok: false, reason: "Attempt session identifier is invalid." };
  }
  if (input.source === "reader" && input.sessionId !== undefined) {
    return { ok: false, reason: "Reader attempts do not accept lesson sessions." };
  }
  if (input.source === "lesson" && input.sessionId === undefined) {
    return { ok: false, reason: "Lesson attempts require a server-issued lesson session." };
  }
  if (input.source === "mistake" && input.sessionId !== undefined) {
    return {
      ok: false,
      reason: "Remediation attempts do not accept lesson sessions.",
    };
  }
  const occurredAt = normalizedTime(input.occurredAt);
  if (!occurredAt) {
    return { ok: false, reason: "Attempt timestamp is invalid." };
  }
  if (!isRecord(input.response) || !exactKeys(input.response, RESPONSE_KEYS)) {
    return { ok: false, reason: "Attempt response contains unknown or invalid fields." };
  }
  if (
    input.response.kind !== "answer"
    || !boundedString(input.response.answer, 2_000)
    || !input.response.answer.trim()
    || typeof input.response.usedHint !== "boolean"
    || (
      input.response.durationMs !== undefined
      && !safeDurationMs(input.response.durationMs)
    )
  ) {
    return { ok: false, reason: "Attempt answer response is invalid." };
  }

  return {
    ok: true,
    command: {
      protocolVersion: ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      activityId: input.activityId,
      activityVersion: input.activityVersion,
      source: input.source,
      method: input.method as ObjectiveAttemptMethod,
      ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
      occurredAt,
      response: {
        kind: "answer",
        answer: input.response.answer,
        usedHint: input.response.usedHint,
        ...(input.response.durationMs === undefined
          ? {}
          : { durationMs: input.response.durationMs }),
      },
    },
  };
};

export const hashLearningAttemptCommand = (
  command: LearningAttemptCommandV1,
) => sha256Hex(canonicalStringify(command));
