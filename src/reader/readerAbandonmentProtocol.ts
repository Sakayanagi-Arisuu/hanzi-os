import {
  CURRENT_CONTENT_VERSION as CONTENT_VERSION,
} from "../content/currentContentIdentity";
import { canonicalStringify, sha256Hex } from "../sync/canonicalHash";
import type { ReaderSessionFormHash } from "./readerSessionProtocol";
import {
  boundedIdentifier,
  hasExactKeys,
  hasValidReaderCommandIdentity,
  hasValidReaderReceiptIdentity,
  isReaderScript,
  isReaderSupportMode,
  isRecord,
  isSha256,
  normalizedTimestamp,
  type ReaderScript,
  type ReaderSupportMode,
} from "./protocolSupport";

export const READER_ABANDONMENT_PROTOCOL_VERSION = 1 as const;
export const READER_ABANDONMENT_IDEMPOTENCY_SCOPE =
  "reader-session-abandon-v1";

export type ReaderAbandonmentReason =
  | "user-exit"
  | "support-requested"
  | "superseded";

export type AbandonReaderSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
  formHash: ReaderSessionFormHash;
  reason: ReaderAbandonmentReason;
};

export type AbandonReaderSessionReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  storyId: string;
  storyVersion: string;
  formVersion: string;
  formHash: ReaderSessionFormHash;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  supportPolicyVersion: string;
  reason: ReaderAbandonmentReason;
  status: "abandoned";
  abandonedAt: string;
};

export type AbandonReaderSessionCommandParseResult =
  | { ok: true; command: AbandonReaderSessionCommandV1 }
  | { ok: false; reason: string };

export type AbandonReaderSessionReceiptParseResult =
  | { ok: true; receipt: AbandonReaderSessionReceiptV1 }
  | { ok: false; reason: string };

const COMMAND_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "sessionId",
  "formHash",
  "reason",
]);
const RECEIPT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "sessionId",
  "enrollmentId",
  "resetEpoch",
  "contentVersion",
  "storyId",
  "storyVersion",
  "formVersion",
  "formHash",
  "script",
  "supportMode",
  "supportPolicyVersion",
  "reason",
  "status",
  "abandonedAt",
]);

const isReaderAbandonmentReason = (
  value: unknown,
): value is ReaderAbandonmentReason =>
  value === "user-exit"
  || value === "support-requested"
  || value === "superseded";

export const parseAbandonReaderSessionCommand = (
  input: unknown,
): AbandonReaderSessionCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, COMMAND_KEYS)) {
    return {
      ok: false,
      reason: "Reader abandonment must contain exactly the supported fields.",
    };
  }
  if (input.protocolVersion !== READER_ABANDONMENT_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Reader-abandonment protocol version is unsupported.",
    };
  }
  if (
    !hasValidReaderCommandIdentity(input)
    || !boundedIdentifier(input.sessionId, 160)
    || !isSha256(input.formHash)
    || !isReaderAbandonmentReason(input.reason)
  ) {
    return {
      ok: false,
      reason: "Reader-abandonment authority or fields are invalid.",
    };
  }
  return {
    ok: true,
    command: {
      protocolVersion: READER_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      sessionId: input.sessionId,
      formHash: input.formHash,
      reason: input.reason,
    },
  };
};

export const parseAbandonReaderSessionReceipt = (
  input: unknown,
): AbandonReaderSessionReceiptParseResult => {
  if (
    !isRecord(input)
    || !hasExactKeys(input, RECEIPT_KEYS)
    || input.protocolVersion !== READER_ABANDONMENT_PROTOCOL_VERSION
    || !hasValidReaderReceiptIdentity(input)
    || !boundedIdentifier(input.sessionId, 160)
    || !boundedIdentifier(input.enrollmentId, 160)
    || !boundedIdentifier(input.storyId, 160)
    || !boundedIdentifier(input.storyVersion, 200)
    || !boundedIdentifier(input.formVersion, 200)
    || !isSha256(input.formHash)
    || !isReaderScript(input.script)
    || !isReaderSupportMode(input.supportMode)
    || !boundedIdentifier(input.supportPolicyVersion, 160)
    || !isReaderAbandonmentReason(input.reason)
    || input.status !== "abandoned"
  ) {
    return {
      ok: false,
      reason: "Reader-abandonment receipt contract is invalid.",
    };
  }
  const abandonedAt = normalizedTimestamp(input.abandonedAt);
  if (!abandonedAt) {
    return {
      ok: false,
      reason: "Reader-abandonment receipt timestamp is invalid.",
    };
  }
  return {
    ok: true,
    receipt: {
      protocolVersion: READER_ABANDONMENT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      duplicate: input.duplicate,
      sessionId: input.sessionId,
      enrollmentId: input.enrollmentId,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      storyId: input.storyId,
      storyVersion: input.storyVersion,
      formVersion: input.formVersion,
      formHash: input.formHash,
      script: input.script,
      supportMode: input.supportMode,
      supportPolicyVersion: input.supportPolicyVersion,
      reason: input.reason,
      status: "abandoned",
      abandonedAt,
    },
  };
};

export const hashAbandonReaderSessionCommand = (
  command: AbandonReaderSessionCommandV1,
) => sha256Hex(canonicalStringify(command));
