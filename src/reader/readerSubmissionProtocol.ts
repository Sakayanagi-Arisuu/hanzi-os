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
  boundedIdentifier,
  hasExactKeys,
  hasValidReaderCommandIdentity,
  hasValidReaderReceiptIdentity,
  isReaderAnswerExposure,
  isReaderScript,
  isReaderSupportMode,
  isRecord,
  isSha256,
  MAX_READER_FORM_ITEMS,
  normalizedTimestamp,
  readerPolicyAllowsMastery,
  safeNonNegativeInteger,
  safePositiveInteger,
  type ReaderAnswerExposure,
  type ReaderScript,
  type ReaderSupportMode,
} from "./protocolSupport";

export const READER_SUBMISSION_PROTOCOL_VERSION = 1 as const;
export const READER_SUBMISSION_IDEMPOTENCY_SCOPE =
  "reader-session-submit-v1";

/**
 * The client binds finalization to the exact frozen form and its item count.
 * It cannot submit correctness, a score, a skill or mastery eligibility.
 */
export type SubmitReaderSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  sessionId: string;
  formHash: ReaderSessionFormHash;
  expectedItemCount: number;
};

export type ReaderSubmissionItemResultV1 = {
  position: number;
  itemId: string;
  itemVersion: string;
  correct: boolean;
  answerExposure: ReaderAnswerExposure;
  priorExposure: boolean;
  masteryEligible: boolean;
};

export type SubmitReaderSessionReceiptV1 = {
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
  expectedItemCount: number;
  attemptCount: number;
  correctCount: number;
  score: number;
  method: typeof READER_METHOD;
  skill: typeof READER_SKILL;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  supportPolicyVersion: string;
  results: ReaderSubmissionItemResultV1[];
  status: "submitted";
  submittedAt: string;
};

export type SubmitReaderSessionCommandParseResult =
  | { ok: true; command: SubmitReaderSessionCommandV1 }
  | { ok: false; reason: string };

export type SubmitReaderSessionReceiptParseResult =
  | { ok: true; receipt: SubmitReaderSessionReceiptV1 }
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
  "expectedItemCount",
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
  "expectedItemCount",
  "attemptCount",
  "correctCount",
  "score",
  "method",
  "skill",
  "script",
  "supportMode",
  "supportPolicyVersion",
  "results",
  "status",
  "submittedAt",
]);
const RESULT_KEYS = new Set([
  "position",
  "itemId",
  "itemVersion",
  "correct",
  "answerExposure",
  "priorExposure",
  "masteryEligible",
]);

export const isExactReaderSubmissionItemResultV1 = (
  value: unknown,
  supportMode: ReaderSupportMode,
  expectedPosition?: number,
): value is ReaderSubmissionItemResultV1 => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, RESULT_KEYS)
    || !safeNonNegativeInteger(
      value.position,
      MAX_READER_FORM_ITEMS - 1,
    )
    || (
      expectedPosition !== undefined
      && value.position !== expectedPosition
    )
    || !boundedIdentifier(value.itemId, 240)
    || !boundedIdentifier(value.itemVersion, 200)
    || typeof value.correct !== "boolean"
    || !isReaderAnswerExposure(value.answerExposure)
    || typeof value.priorExposure !== "boolean"
    || typeof value.masteryEligible !== "boolean"
  ) return false;
  return value.masteryEligible === readerPolicyAllowsMastery({
    supportMode,
    answerExposure: value.answerExposure,
    priorExposure: value.priorExposure,
  });
};

const hasExactReaderSubmissionResults = (
  value: unknown,
  supportMode: ReaderSupportMode,
  expectedItemCount: number,
): value is ReaderSubmissionItemResultV1[] => {
  if (
    !Array.isArray(value)
    || value.length !== expectedItemCount
    || !value.every((result, position) =>
      isExactReaderSubmissionItemResultV1(
        result,
        supportMode,
        position,
      )
    )
  ) return false;
  const itemIds = value.map((result) => result.itemId);
  const itemVersions = value.map((result) => result.itemVersion);
  return new Set(itemIds).size === itemIds.length
    && new Set(itemVersions).size === itemVersions.length;
};

export const parseSubmitReaderSessionCommand = (
  input: unknown,
): SubmitReaderSessionCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, COMMAND_KEYS)) {
    return {
      ok: false,
      reason: "Reader submission must contain exactly the supported fields.",
    };
  }
  if (input.protocolVersion !== READER_SUBMISSION_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Reader-submission protocol version is unsupported.",
    };
  }
  if (
    !hasValidReaderCommandIdentity(input)
    || !boundedIdentifier(input.sessionId, 160)
    || !isSha256(input.formHash)
    || !safePositiveInteger(
      input.expectedItemCount,
      MAX_READER_FORM_ITEMS,
    )
  ) {
    return {
      ok: false,
      reason: "Reader-submission authority or fields are invalid.",
    };
  }
  return {
    ok: true,
    command: {
      protocolVersion: READER_SUBMISSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      sessionId: input.sessionId,
      formHash: input.formHash,
      expectedItemCount: input.expectedItemCount,
    },
  };
};

export const parseSubmitReaderSessionReceipt = (
  input: unknown,
): SubmitReaderSessionReceiptParseResult => {
  if (
    !isRecord(input)
    || !hasExactKeys(input, RECEIPT_KEYS)
    || input.protocolVersion !== READER_SUBMISSION_PROTOCOL_VERSION
    || !hasValidReaderReceiptIdentity(input)
    || !boundedIdentifier(input.sessionId, 160)
    || !boundedIdentifier(input.enrollmentId, 160)
    || !boundedIdentifier(input.storyId, 160)
    || !boundedIdentifier(input.storyVersion, 200)
    || !boundedIdentifier(input.formVersion, 200)
    || !isSha256(input.formHash)
    || !safePositiveInteger(
      input.expectedItemCount,
      MAX_READER_FORM_ITEMS,
    )
    || input.attemptCount !== input.expectedItemCount
    || !safeNonNegativeInteger(
      input.correctCount,
      input.expectedItemCount,
    )
    || !safeNonNegativeInteger(input.score, 100)
    || input.score !== Math.round(
      (input.correctCount / input.expectedItemCount) * 100,
    )
    || input.method !== READER_METHOD
    || input.skill !== READER_SKILL
    || !isReaderScript(input.script)
    || !isReaderSupportMode(input.supportMode)
    || !boundedIdentifier(input.supportPolicyVersion, 160)
    || !hasExactReaderSubmissionResults(
      input.results,
      input.supportMode,
      input.expectedItemCount,
    )
    || input.correctCount !== input.results.filter(
      (result) => result.correct,
    ).length
    || input.status !== "submitted"
  ) {
    return {
      ok: false,
      reason: "Reader-submission receipt contract is invalid.",
    };
  }
  const submittedAt = normalizedTimestamp(input.submittedAt);
  if (!submittedAt) {
    return {
      ok: false,
      reason: "Reader-submission receipt timestamp is invalid.",
    };
  }
  return {
    ok: true,
    receipt: {
      protocolVersion: READER_SUBMISSION_PROTOCOL_VERSION,
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
      expectedItemCount: input.expectedItemCount,
      attemptCount: input.attemptCount,
      correctCount: input.correctCount,
      score: input.score,
      method: READER_METHOD,
      skill: READER_SKILL,
      script: input.script,
      supportMode: input.supportMode,
      supportPolicyVersion: input.supportPolicyVersion,
      results: input.results,
      status: "submitted",
      submittedAt,
    },
  };
};

export const readerSubmissionBindsToForm = async (
  command: SubmitReaderSessionCommandV1,
  form: ReaderSessionFormV1,
) =>
  isExactReaderSessionFormV1(form)
  && command.expectedItemCount === form.items.length
  && command.formHash === await hashReaderSessionForm(form);

export const hashSubmitReaderSessionCommand = (
  command: SubmitReaderSessionCommandV1,
) => sha256Hex(canonicalStringify(command));
