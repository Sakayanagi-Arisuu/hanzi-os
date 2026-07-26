import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { LessonSessionFormHash } from "./lessonSessionProtocol";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION = 1 as const;
export const LESSON_SESSION_SUBMISSION_IDEMPOTENCY_SCOPE =
  "lesson-session-submit-v1";

/**
 * Untrusted finalization command. Scores, correctness, pass state, evidence
 * counts, and lesson versions are omitted because the server derives them
 * from the frozen session and normalized attempts.
 */
export type SubmitLessonSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
  formHash: LessonSessionFormHash;
};

export type SubmitLessonSessionReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  sessionId: string;
  contentVersion: string;
  resetEpoch: number;
  lessonId: string;
  lessonVersion: string;
  formHash: LessonSessionFormHash;
  status: "submitted";
  evidenceCount: number;
  rawScore: number;
  gateScore: number;
  requiredEvidenceCount: number;
  requiredCorrectCount: number;
  passed: boolean;
  completionEvidenceId: string;
  submittedAt: string;
};

export type LessonSessionSubmissionParseResult =
  | { ok: true; command: SubmitLessonSessionCommandV1 }
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
  "formHash",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;

export const parseSubmitLessonSessionCommand = (
  input: unknown,
): LessonSessionSubmissionParseResult => {
  if (
    !isRecord(input)
    || !Object.keys(input).every((key) => ROOT_KEYS.has(key))
  ) {
    return {
      ok: false,
      reason: "Lesson-session submission contains unknown or invalid fields.",
    };
  }
  if (input.protocolVersion !== LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Lesson-session submission protocol version is unsupported.",
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
    || typeof input.formHash !== "string"
    || !/^sha256:[a-f0-9]{64}$/u.test(input.formHash)
  ) {
    return {
      ok: false,
      reason: "Lesson-session submission identifiers exceed protocol bounds.",
    };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return {
      ok: false,
      reason: "Lesson-session submission content version is unsupported.",
    };
  }
  return {
    ok: true,
    command: {
      protocolVersion: LESSON_SESSION_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      sessionId: input.sessionId,
      formHash: input.formHash as LessonSessionFormHash,
    },
  };
};

export const hashSubmitLessonSessionCommand = (
  command: SubmitLessonSessionCommandV1,
) => sha256Hex(canonicalStringify(command));
