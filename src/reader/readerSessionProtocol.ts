import {
  CURRENT_CONTENT_VERSION as CONTENT_VERSION,
} from "../content/currentContentIdentity";
import { canonicalStringify, sha256Hex } from "../sync/canonicalHash";
import {
  boundedCanonicalText,
  boundedIdentifier,
  hasExactKeys,
  hasValidReaderCommandIdentity,
  hasValidReaderReceiptIdentity,
  isReaderAnswerExposure,
  isReaderScript,
  isRecord,
  isReaderSupportMode,
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

export const READER_SESSION_PROTOCOL_VERSION = 1 as const;
export const READER_SESSION_FORM_SCHEMA_VERSION = 1 as const;
export const READER_SESSION_IDEMPOTENCY_SCOPE =
  "reader-session-open-v1";
export const READER_METHOD = "reading-comprehension" as const;
export const READER_SKILL = "reading" as const;

export type ReaderSessionFormHash = `sha256:${string}`;

export type ReaderSessionFormItemV1 = {
  position: number;
  itemId: string;
  itemVersion: string;
  method: typeof READER_METHOD;
  skill: typeof READER_SKILL;
  chineseStimulus: string;
  prompt: string;
  options: string[];
  answerExposure: ReaderAnswerExposure;
  priorExposure: boolean;
  masteryEligible: boolean;
};

/**
 * Immutable, answer-free form issued by the server. The policy tuple is part
 * of the hash so support or exposure cannot be changed after opening.
 */
export type ReaderSessionFormV1 = {
  formSchemaVersion: 1;
  storyId: string;
  storyVersion: string;
  formVersion: string;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  supportPolicyVersion: string;
  items: ReaderSessionFormItemV1[];
};

/**
 * The client can choose the story and assistance mode only. Story version,
 * answer exposure, prior exposure and mastery eligibility remain server-owned.
 */
export type OpenReaderSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  enrollmentId: string;
  storyId: string;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
};

export type ReaderSessionAuthorityBindingV1 = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  storyId: string;
  storyVersion: string;
  formVersion: string;
  formSchemaVersion: 1;
  script: ReaderScript;
  supportMode: ReaderSupportMode;
  supportPolicyVersion: string;
  expectedItemCount: number;
  form: ReaderSessionFormV1;
  formHash: ReaderSessionFormHash;
  status: "started";
  startedAt: string;
};

export type OpenReaderSessionReceiptV1 =
  ReaderSessionAuthorityBindingV1 & {
    protocolVersion: 1;
    idempotencyKey: string;
    duplicate: boolean;
  };

export type OpenReaderSessionCommandParseResult =
  | { ok: true; command: OpenReaderSessionCommandV1 }
  | { ok: false; reason: string };

export type OpenReaderSessionReceiptParseResult =
  | { ok: true; receipt: OpenReaderSessionReceiptV1 }
  | { ok: false; reason: string };

const FORM_KEYS = new Set([
  "formSchemaVersion",
  "storyId",
  "storyVersion",
  "formVersion",
  "script",
  "supportMode",
  "supportPolicyVersion",
  "items",
]);
const FORM_ITEM_KEYS = new Set([
  "position",
  "itemId",
  "itemVersion",
  "method",
  "skill",
  "chineseStimulus",
  "prompt",
  "options",
  "answerExposure",
  "priorExposure",
  "masteryEligible",
]);
const OPEN_COMMAND_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "enrollmentId",
  "storyId",
  "script",
  "supportMode",
]);
const OPEN_RECEIPT_KEYS = new Set([
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
  "formSchemaVersion",
  "script",
  "supportMode",
  "supportPolicyVersion",
  "expectedItemCount",
  "form",
  "formHash",
  "status",
  "startedAt",
]);

const hasStrictOptions = (value: unknown): value is string[] => {
  if (
    !Array.isArray(value)
    || value.length < 2
    || value.length > 8
    || !value.every((option) => boundedCanonicalText(option, 2_000))
  ) return false;
  return new Set(value).size === value.length;
};

export const isExactReaderSessionFormItemV1 = (
  value: unknown,
  supportMode: ReaderSupportMode,
  expectedPosition?: number,
): value is ReaderSessionFormItemV1 => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, FORM_ITEM_KEYS)
    || safeNonNegativeInteger(
      value.position,
      MAX_READER_FORM_ITEMS - 1,
    ) === false
    || (
      expectedPosition !== undefined
      && value.position !== expectedPosition
    )
    || !boundedIdentifier(value.itemId, 240)
    || !boundedIdentifier(value.itemVersion, 200)
    || value.method !== READER_METHOD
    || value.skill !== READER_SKILL
    || !boundedCanonicalText(value.chineseStimulus, 20_000)
    || !/\p{Script=Han}/u.test(value.chineseStimulus)
    || !boundedCanonicalText(value.prompt, 2_000)
    || !hasStrictOptions(value.options)
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

/**
 * Requires a dense, uniquely addressed form and enforces the only Reader V1
 * mastery rule. Unknown fields such as answer keys and explanations fail.
 */
export const isExactReaderSessionFormV1 = (
  value: unknown,
  expectedItemCount?: number,
): value is ReaderSessionFormV1 => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, FORM_KEYS)
    || value.formSchemaVersion !== READER_SESSION_FORM_SCHEMA_VERSION
    || !boundedIdentifier(value.storyId, 160)
    || !boundedIdentifier(value.storyVersion, 200)
    || !boundedIdentifier(value.formVersion, 200)
    || !isReaderScript(value.script)
    || !isReaderSupportMode(value.supportMode)
    || !boundedIdentifier(value.supportPolicyVersion, 160)
    || !Array.isArray(value.items)
    || value.items.length < 1
    || value.items.length > MAX_READER_FORM_ITEMS
    || (
      expectedItemCount !== undefined
      && (
        !safePositiveInteger(
          expectedItemCount,
          MAX_READER_FORM_ITEMS,
        )
        || value.items.length !== expectedItemCount
      )
    )
  ) return false;

  const supportMode = value.supportMode;
  if (!value.items.every((item, position) =>
    isExactReaderSessionFormItemV1(
      item,
      supportMode,
      position,
    )
  )) return false;

  const itemIds = value.items.map((item) => item.itemId);
  const itemVersions = value.items.map((item) => item.itemVersion);
  return new Set(itemIds).size === itemIds.length
    && new Set(itemVersions).size === itemVersions.length;
};

export const parseOpenReaderSessionCommand = (
  input: unknown,
): OpenReaderSessionCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, OPEN_COMMAND_KEYS)) {
    return {
      ok: false,
      reason: "Reader-session command must contain exactly the supported fields.",
    };
  }
  if (input.protocolVersion !== READER_SESSION_PROTOCOL_VERSION) {
    return {
      ok: false,
      reason: "Reader-session protocol version is unsupported.",
    };
  }
  if (
    !hasValidReaderCommandIdentity(input)
    || !boundedIdentifier(input.enrollmentId, 160)
    || !boundedIdentifier(input.storyId, 160)
    || !isReaderScript(input.script)
    || !isReaderSupportMode(input.supportMode)
  ) {
    return {
      ok: false,
      reason: "Reader-session authority or identifiers are invalid.",
    };
  }
  return {
    ok: true,
    command: {
      protocolVersion: READER_SESSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      enrollmentId: input.enrollmentId,
      storyId: input.storyId,
      script: input.script,
      supportMode: input.supportMode,
    },
  };
};

export const canonicalReaderSessionForm = (
  form: ReaderSessionFormV1,
) => canonicalStringify(form);

export const hashReaderSessionForm = async (
  form: ReaderSessionFormV1,
): Promise<ReaderSessionFormHash> =>
  `sha256:${await sha256Hex(canonicalReaderSessionForm(form))}`;

export const hashOpenReaderSessionCommand = (
  command: OpenReaderSessionCommandV1,
) => sha256Hex(canonicalStringify(command));

export const parseOpenReaderSessionReceipt = async (
  input: unknown,
): Promise<OpenReaderSessionReceiptParseResult> => {
  if (
    !isRecord(input)
    || !hasExactKeys(input, OPEN_RECEIPT_KEYS)
    || input.protocolVersion !== READER_SESSION_PROTOCOL_VERSION
    || !hasValidReaderReceiptIdentity(input)
    || !boundedIdentifier(input.sessionId, 160)
    || !boundedIdentifier(input.enrollmentId, 160)
    || !boundedIdentifier(input.storyId, 160)
    || !boundedIdentifier(input.storyVersion, 200)
    || !boundedIdentifier(input.formVersion, 200)
    || input.formSchemaVersion !== READER_SESSION_FORM_SCHEMA_VERSION
    || !isReaderScript(input.script)
    || !isReaderSupportMode(input.supportMode)
    || !boundedIdentifier(input.supportPolicyVersion, 160)
    || !safePositiveInteger(
      input.expectedItemCount,
      MAX_READER_FORM_ITEMS,
    )
    || !isExactReaderSessionFormV1(
      input.form,
      input.expectedItemCount,
    )
    || !isSha256(input.formHash)
    || input.status !== "started"
  ) {
    return {
      ok: false,
      reason: "Reader-session receipt contract is invalid.",
    };
  }
  const startedAt = normalizedTimestamp(input.startedAt);
  if (!startedAt) {
    return {
      ok: false,
      reason: "Reader-session receipt timestamp is invalid.",
    };
  }
  if (
    input.storyId !== input.form.storyId
    || input.storyVersion !== input.form.storyVersion
    || input.formVersion !== input.form.formVersion
    || input.formSchemaVersion !== input.form.formSchemaVersion
    || input.script !== input.form.script
    || input.supportMode !== input.form.supportMode
    || input.supportPolicyVersion !== input.form.supportPolicyVersion
    || input.formHash !== await hashReaderSessionForm(input.form)
  ) {
    return {
      ok: false,
      reason: "Reader-session receipt does not bind the issued form.",
    };
  }

  return {
    ok: true,
    receipt: {
      protocolVersion: READER_SESSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      duplicate: input.duplicate,
      sessionId: input.sessionId,
      enrollmentId: input.enrollmentId,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      storyId: input.storyId,
      storyVersion: input.storyVersion,
      formVersion: input.formVersion,
      formSchemaVersion: READER_SESSION_FORM_SCHEMA_VERSION,
      script: input.script,
      supportMode: input.supportMode,
      supportPolicyVersion: input.supportPolicyVersion,
      expectedItemCount: input.expectedItemCount,
      form: input.form,
      formHash: input.formHash,
      status: "started",
      startedAt,
    },
  };
};
