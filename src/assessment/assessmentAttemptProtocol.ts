import { CONTENT_VERSION } from "../data/curriculum";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { Skill } from "../types";
import type { AssessmentFormHash } from "./assessmentSessionProtocol";
import {
  boundedString,
  hasExactKeys,
  isRecord,
  isSha256,
  normalizedTime,
  safePositiveInteger,
} from "./protocolSupport";

export const ASSESSMENT_ATTEMPT_PROTOCOL_VERSION = 1 as const;
export const ASSESSMENT_ATTEMPT_IDEMPOTENCY_SCOPE = "assessment-attempt-v1";

export type AssessmentSelectionResponseV1 = {
  kind: "selection";
  answer: string;
  durationMs?: number;
};

export type RecordAssessmentAttemptCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
  formHash: AssessmentFormHash;
  itemId: string;
  itemVersion: string;
  occurredAt: string;
  response: AssessmentSelectionResponseV1;
};

/** The answer and derived outcome stay server-side until aggregate submission. */
export type RecordAssessmentAttemptReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  attemptId: string;
  sessionId: string;
  resetEpoch: number;
  contentVersion: string;
  formHash: AssessmentFormHash;
  position: number;
  itemId: string;
  itemVersion: string;
  skill: Skill;
  measurementEligible: boolean;
  masteryEligible: false;
  status: "recorded";
  recordedAt: string;
};

export type AssessmentAttemptCommandParseResult =
  | { ok: true; command: RecordAssessmentAttemptCommandV1 }
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
  "itemId",
  "itemVersion",
  "occurredAt",
  "response",
]);
const RESPONSE_REQUIRED_KEYS = new Set(["kind", "answer"]);
const RESPONSE_OPTIONAL_KEYS = new Set(["durationMs"]);

export const parseRecordAssessmentAttemptCommand = (
  input: unknown,
): AssessmentAttemptCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, ROOT_KEYS)) {
    return { ok: false, reason: "Assessment attempt must contain exactly the supported fields." };
  }
  if (input.protocolVersion !== ASSESSMENT_ATTEMPT_PROTOCOL_VERSION) {
    return { ok: false, reason: "Assessment-attempt protocol version is unsupported." };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !safePositiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.sessionId, 160)
    || !isSha256(input.formHash)
    || !boundedString(input.itemId, 240)
    || !boundedString(input.itemVersion, 200)
  ) {
    return { ok: false, reason: "Assessment-attempt identifiers exceed protocol bounds." };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return { ok: false, reason: "Assessment-attempt content version is unsupported." };
  }
  const occurredAt = normalizedTime(input.occurredAt);
  if (!occurredAt) return { ok: false, reason: "Assessment-attempt timestamp is invalid." };
  if (
    !isRecord(input.response)
    || !hasExactKeys(input.response, RESPONSE_REQUIRED_KEYS, RESPONSE_OPTIONAL_KEYS)
    || input.response.kind !== "selection"
    || !boundedString(input.response.answer, 2_000)
    || !input.response.answer.trim()
    || (
      input.response.durationMs !== undefined
      && (
        typeof input.response.durationMs !== "number"
        || !Number.isSafeInteger(input.response.durationMs)
        || input.response.durationMs < 0
        || input.response.durationMs > 600_000
      )
    )
  ) {
    return { ok: false, reason: "Assessment selection response is invalid." };
  }
  return {
    ok: true,
    command: {
      protocolVersion: ASSESSMENT_ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      sessionId: input.sessionId,
      formHash: input.formHash,
      itemId: input.itemId,
      itemVersion: input.itemVersion,
      occurredAt,
      response: {
        kind: "selection",
        answer: input.response.answer,
        ...(input.response.durationMs === undefined
          ? {}
          : { durationMs: input.response.durationMs }),
      },
    },
  };
};

export const hashRecordAssessmentAttemptCommand = (
  command: RecordAssessmentAttemptCommandV1,
) => sha256Hex(canonicalStringify(command));
