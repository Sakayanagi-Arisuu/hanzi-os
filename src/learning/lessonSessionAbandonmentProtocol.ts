import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION = 1 as const;
export const LESSON_SESSION_ABANDONMENT_IDEMPOTENCY_SCOPE =
  "lesson-session-abandon-v1";

/**
 * Untrusted request to release one active server-owned lesson form. Session,
 * lesson, enrollment and terminal-state facts are resolved by the server.
 */
export type AbandonLessonSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
};

export type AbandonLessonSessionReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  sessionId: string;
  enrollmentId: string;
  contentVersion: string;
  resetEpoch: number;
  lessonId: string;
  lessonVersion: string;
  status: "abandoned";
  abandonedAt: string;
};

export type LessonSessionAbandonmentParseResult =
  | { ok: true; command: AbandonLessonSessionCommandV1 }
  | { ok: false; reason: string };

const ROOT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "sessionId",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

export const parseAbandonLessonSessionCommand = (
  input: unknown,
): LessonSessionAbandonmentParseResult => {
  if (
    !isRecord(input)
    || !Object.keys(input).every((key) => ROOT_KEYS.has(key))
  ) {
    return {
      ok: false,
      reason: "Lesson-session abandonment contains unknown or invalid fields.",
    };
  }
  if (input.protocolVersion !== LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Lesson-session abandonment protocol version is unsupported.",
    };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || typeof input.deviceSequence !== "number"
    || !Number.isSafeInteger(input.deviceSequence)
    || input.deviceSequence < 1
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.sessionId, 160)
  ) {
    return {
      ok: false,
      reason: "Lesson-session abandonment identifiers exceed protocol bounds.",
    };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return {
      ok: false,
      reason: "Lesson-session abandonment content version is unsupported.",
    };
  }
  return {
    ok: true,
    command: {
      protocolVersion: LESSON_SESSION_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      sessionId: input.sessionId,
    },
  };
};

export const hashAbandonLessonSessionCommand = (
  command: AbandonLessonSessionCommandV1,
) => sha256Hex(canonicalStringify(command));
