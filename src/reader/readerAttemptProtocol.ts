import {
  CURRENT_CONTENT_VERSION as CONTENT_VERSION,
} from "../content/currentContentIdentity";
import { canonicalStringify, sha256Hex } from "../sync/canonicalHash";
import {
  READER_METHOD,
  READER_SKILL,
  hashReaderSessionForm,
  isExactReaderSessionFormV1,
  type ReaderSessionFormHash,
  type ReaderSessionFormV1,
} from "./readerSessionProtocol";
import {
  boundedCanonicalText,
  boundedIdentifier,
  hasExactKeys,
  hasExactReaderMasteryPolicy,
  hasValidReaderCommandIdentity,
  hasValidReaderReceiptIdentity,
  isReaderScript,
  isRecord,
  isSha256,
  MAX_READER_ATTEMPT_DURATION_MS,
  MAX_READER_FORM_ITEMS,
  normalizedTimestamp,
  safeNonNegativeInteger,
  type ReaderAnswerExposure,
  type ReaderScript,
  type ReaderSupportMode,
} from "./protocolSupport";

export const READER_ATTEMPT_PROTOCOL_VERSION = 1 as const;
export const READER_ATTEMPT_IDEMPOTENCY_SCOPE = "reader-attempt-v1";

/**
 * Untrusted selection only. Correctness, score, skill, mastery and support-use
 * fields are intentionally absent and therefore rejected as unknown.
 */
export type RecordReaderAttemptCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
  formHash: ReaderSessionFormHash;
  itemId: string;
  itemVersion: string;
  position: number;
  selectedOption: string;
  occurredAt: string;
  durationMs?: number;
};

export type RecordReaderAttemptReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  attemptId: string;
  evidenceId: string;
  sessionId: string;
  resetEpoch: number;
  contentVersion: string;
  formHash: ReaderSessionFormHash;
  position: number;
  itemId: string;
  itemVersion: string;
  method: typeof READER_METHOD;
  skill: typeof READER_SKILL;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  supportPolicyVersion: string;
  answerExposure: ReaderAnswerExposure;
  priorExposure: boolean;
  masteryEligible: boolean;
  outcome: "correct" | "incorrect";
  score: 0 | 100;
  verification: "server-objective";
  status: "recorded";
  recordedAt: string;
};

export type RecordReaderAttemptCommandParseResult =
  | { ok: true; command: RecordReaderAttemptCommandV1 }
  | { ok: false; reason: string };

export type RecordReaderAttemptReceiptParseResult =
  | { ok: true; receipt: RecordReaderAttemptReceiptV1 }
  | { ok: false; reason: string };

const COMMAND_REQUIRED_KEYS = new Set([
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
  "position",
  "selectedOption",
  "occurredAt",
]);
const COMMAND_OPTIONAL_KEYS = new Set(["durationMs"]);
const RECEIPT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "duplicate",
  "attemptId",
  "evidenceId",
  "sessionId",
  "resetEpoch",
  "contentVersion",
  "formHash",
  "position",
  "itemId",
  "itemVersion",
  "method",
  "skill",
  "script",
  "supportMode",
  "supportPolicyVersion",
  "answerExposure",
  "priorExposure",
  "masteryEligible",
  "outcome",
  "score",
  "verification",
  "status",
  "recordedAt",
]);

export const parseRecordReaderAttemptCommand = (
  input: unknown,
): RecordReaderAttemptCommandParseResult => {
  if (
    !isRecord(input)
    || !hasExactKeys(
      input,
      COMMAND_REQUIRED_KEYS,
      COMMAND_OPTIONAL_KEYS,
    )
  ) {
    return {
      ok: false,
      reason: "Reader attempt must contain exactly the supported fields.",
    };
  }
  if (input.protocolVersion !== READER_ATTEMPT_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Reader-attempt protocol version is unsupported.",
    };
  }
  if (
    !hasValidReaderCommandIdentity(input)
    || !boundedIdentifier(input.sessionId, 160)
    || !isSha256(input.formHash)
    || !boundedIdentifier(input.itemId, 240)
    || !boundedIdentifier(input.itemVersion, 200)
    || !safeNonNegativeInteger(
      input.position,
      MAX_READER_FORM_ITEMS - 1,
    )
    || !boundedCanonicalText(input.selectedOption, 2_000)
    || (
      input.durationMs !== undefined
      && !safeNonNegativeInteger(
        input.durationMs,
        MAX_READER_ATTEMPT_DURATION_MS,
      )
    )
  ) {
    return {
      ok: false,
      reason: "Reader-attempt authority or fields are invalid.",
    };
  }
  const occurredAt = normalizedTimestamp(input.occurredAt);
  if (!occurredAt) {
    return {
      ok: false,
      reason: "Reader-attempt timestamp is invalid.",
    };
  }

  return {
    ok: true,
    command: {
      protocolVersion: READER_ATTEMPT_PROTOCOL_VERSION,
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
      position: input.position,
      selectedOption: input.selectedOption,
      occurredAt,
      ...(input.durationMs === undefined
        ? {}
        : { durationMs: input.durationMs }),
    },
  };
};

export const parseRecordReaderAttemptReceipt = (
  input: unknown,
): RecordReaderAttemptReceiptParseResult => {
  if (
    !isRecord(input)
    || !hasExactKeys(input, RECEIPT_KEYS)
    || input.protocolVersion !== READER_ATTEMPT_PROTOCOL_VERSION
    || !hasValidReaderReceiptIdentity(input)
    || !boundedIdentifier(input.attemptId, 160)
    || !boundedIdentifier(input.evidenceId, 160)
    || !boundedIdentifier(input.sessionId, 160)
    || !isSha256(input.formHash)
    || !safeNonNegativeInteger(
      input.position,
      MAX_READER_FORM_ITEMS - 1,
    )
    || !boundedIdentifier(input.itemId, 240)
    || !boundedIdentifier(input.itemVersion, 200)
    || input.method !== READER_METHOD
    || input.skill !== READER_SKILL
    || !isReaderScript(input.script)
    || !hasExactReaderMasteryPolicy(input)
    || (
      input.outcome !== "correct"
      && input.outcome !== "incorrect"
    )
    || (
      input.score !== 0
      && input.score !== 100
    )
    || (
      (input.outcome === "correct" && input.score !== 100)
      || (input.outcome === "incorrect" && input.score !== 0)
    )
    || input.verification !== "server-objective"
    || input.status !== "recorded"
  ) {
    return {
      ok: false,
      reason: "Reader-attempt receipt contract is invalid.",
    };
  }
  const recordedAt = normalizedTimestamp(input.recordedAt);
  if (!recordedAt) {
    return {
      ok: false,
      reason: "Reader-attempt receipt timestamp is invalid.",
    };
  }
  return {
    ok: true,
    receipt: {
      protocolVersion: READER_ATTEMPT_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      duplicate: input.duplicate,
      attemptId: input.attemptId,
      evidenceId: input.evidenceId,
      sessionId: input.sessionId,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      formHash: input.formHash,
      position: input.position,
      itemId: input.itemId,
      itemVersion: input.itemVersion,
      method: READER_METHOD,
      skill: READER_SKILL,
      script: input.script,
      supportMode: input.supportMode,
      supportPolicyVersion: input.supportPolicyVersion,
      answerExposure: input.answerExposure,
      priorExposure: input.priorExposure,
      masteryEligible: input.masteryEligible,
      outcome: input.outcome,
      score: input.score,
      verification: "server-objective",
      status: "recorded",
      recordedAt,
    },
  };
};

/**
 * Contextual binding check used after syntactic parsing. It recomputes the
 * canonical form hash and binds position, item identity/version and option.
 */
export const readerAttemptBindsToForm = async (
  command: RecordReaderAttemptCommandV1,
  form: ReaderSessionFormV1,
) => {
  if (!isExactReaderSessionFormV1(form)) return false;
  if (command.formHash !== await hashReaderSessionForm(form)) return false;
  const item = form.items[command.position];
  return Boolean(
    item
    && item.position === command.position
    && item.itemId === command.itemId
    && item.itemVersion === command.itemVersion
    && item.options.includes(command.selectedOption),
  );
};

export const hashRecordReaderAttemptCommand = (
  command: RecordReaderAttemptCommandV1,
) => sha256Hex(canonicalStringify(command));
