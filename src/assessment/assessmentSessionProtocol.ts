import { CONTENT_VERSION } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import type { Skill } from "../types";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import {
  boundedString,
  hasExactKeys,
  isRecord,
  safePositiveInteger,
} from "./protocolSupport";

export const ASSESSMENT_SESSION_PROTOCOL_VERSION = 1 as const;
export const ASSESSMENT_SESSION_FORM_SCHEMA_VERSION = 1 as const;
export const ASSESSMENT_SESSION_IDEMPOTENCY_SCOPE =
  "assessment-session-open-v1";
export const MAX_ASSESSMENT_FORM_ITEMS = 40;

export type AssessmentItemModality =
  | "visual-selection"
  | "synthetic-tts-selection";

export type AssessmentFormItemV1 = {
  position: number;
  itemId: string;
  itemVersion: string;
  skill: Skill;
  construct: string;
  modality: AssessmentItemModality;
  measurementEligible: boolean;
  prompt: string;
  meta: string;
  options: string[];
  stimulusText?: string;
};

export type AssessmentFormV1 = {
  schemaVersion: 1;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  items: AssessmentFormItemV1[];
};

export type AssessmentFormHash = `sha256:${string}`;

export type OpenAssessmentSessionCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  enrollmentId: string;
};

export type AssessmentSessionAuthorityBindingV1 = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  expectedItemCount: number;
  form: AssessmentFormV1;
  formHash: AssessmentFormHash;
  status: "started";
  startedAt: string;
};

export type OpenAssessmentSessionReceiptV1 =
  AssessmentSessionAuthorityBindingV1 & {
    protocolVersion: 1;
    idempotencyKey: string;
    duplicate: boolean;
  };

export type AssessmentSessionCommandParseResult =
  | { ok: true; command: OpenAssessmentSessionCommandV1 }
  | { ok: false; reason: string };

const ASSESSMENT_FORM_SKILLS = new Set<Skill>([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);
const FORM_KEYS = new Set([
  "schemaVersion",
  "blueprintId",
  "formVersion",
  "scoringPolicyVersion",
  "items",
]);
const FORM_ITEM_REQUIRED_KEYS = new Set([
  "position",
  "itemId",
  "itemVersion",
  "skill",
  "construct",
  "modality",
  "measurementEligible",
  "prompt",
  "meta",
  "options",
]);
const FORM_ITEM_OPTIONAL_KEYS = new Set(["stimulusText"]);
const ROOT_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "enrollmentId",
]);

const normalizedAssessmentOption = (value: string) =>
  value.normalize("NFC").trim();

const hasStrictAssessmentOptions = (
  value: unknown,
): value is string[] => {
  if (
    !Array.isArray(value)
    || value.length < 2
    || value.length > 8
    || !value.every((option) => boundedString(option, 500))
  ) return false;
  const normalized = value.map(normalizedAssessmentOption);
  return normalized.every((option) => option.length > 0)
    && new Set(normalized).size === normalized.length;
};

/**
 * The one answer-free item boundary shared by issuance, projection, durable
 * queue validation, and client materialization. Answer keys and outcomes do
 * not belong in this protocol type.
 */
export const isExactAssessmentFormItemV1 = (
  value: unknown,
  expectedPosition?: number,
): value is AssessmentFormItemV1 => {
  if (
    !isRecord(value)
    || !hasExactKeys(
      value,
      FORM_ITEM_REQUIRED_KEYS,
      FORM_ITEM_OPTIONAL_KEYS,
    )
    || !Number.isSafeInteger(value.position)
    || Number(value.position) < 0
    || (
      expectedPosition !== undefined
      && value.position !== expectedPosition
    )
    || !boundedString(value.itemId, 240)
    || !boundedString(value.itemVersion, 200)
    || !ASSESSMENT_FORM_SKILLS.has(value.skill as Skill)
    || !boundedString(value.construct, 160)
    || (
      value.modality !== "visual-selection"
      && value.modality !== "synthetic-tts-selection"
    )
    || typeof value.measurementEligible !== "boolean"
    || (
      value.modality === "synthetic-tts-selection"
      && value.measurementEligible !== false
    )
    || !boundedString(value.prompt, 2_000)
    || !boundedString(value.meta, 1_000)
    || !hasStrictAssessmentOptions(value.options)
  ) return false;
  return value.modality === "synthetic-tts-selection"
    ? boundedString(value.stimulusText, 2_000)
    : value.stimulusText === undefined
      || boundedString(value.stimulusText, 2_000);
};

/**
 * Strictly validates the immutable answer-free form envelope. Item ids and
 * item versions are both unique independently; positions are dense and
 * canonical so every consumer binds attempts to the same item.
 */
export const isExactAssessmentFormV1 = (
  value: unknown,
  expectedItemCount?: number,
): value is AssessmentFormV1 => {
  if (
    !isRecord(value)
    || !hasExactKeys(value, FORM_KEYS)
    || value.schemaVersion !== ASSESSMENT_SESSION_FORM_SCHEMA_VERSION
    || !boundedString(value.blueprintId, 160)
    || !boundedString(value.formVersion, 200)
    || !boundedString(value.scoringPolicyVersion, 160)
    || !Array.isArray(value.items)
    || value.items.length < 1
    || value.items.length > MAX_ASSESSMENT_FORM_ITEMS
    || (
      expectedItemCount !== undefined
      && (
        !Number.isSafeInteger(expectedItemCount)
        || expectedItemCount < 1
        || expectedItemCount > MAX_ASSESSMENT_FORM_ITEMS
        || value.items.length !== expectedItemCount
      )
    )
    || !value.items.every((item, position) =>
      isExactAssessmentFormItemV1(item, position)
    )
  ) return false;
  const itemIds = value.items.map((item) => item.itemId);
  const itemVersions = value.items.map((item) => item.itemVersion);
  return new Set(itemIds).size === itemIds.length
    && new Set(itemVersions).size === itemVersions.length;
};

export const parseOpenAssessmentSessionCommand = (
  input: unknown,
): AssessmentSessionCommandParseResult => {
  if (!isRecord(input) || !hasExactKeys(input, ROOT_KEYS)) {
    return {
      ok: false,
      reason: "Assessment-session command must contain exactly the supported fields.",
    };
  }
  if (input.protocolVersion !== ASSESSMENT_SESSION_PROTOCOL_VERSION) {
    return { ok: false, reason: "Assessment-session protocol version is unsupported." };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !safePositiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || !boundedString(input.enrollmentId, 160)
  ) {
    return { ok: false, reason: "Assessment-session identifiers exceed protocol bounds." };
  }
  if (input.contentVersion !== CONTENT_VERSION) {
    return { ok: false, reason: "Assessment-session content version is unsupported." };
  }
  return {
    ok: true,
    command: {
      protocolVersion: ASSESSMENT_SESSION_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      enrollmentId: input.enrollmentId,
    },
  };
};

export const hashOpenAssessmentSessionCommand = (
  command: OpenAssessmentSessionCommandV1,
) => sha256Hex(canonicalStringify(command));

export const canonicalAssessmentForm = (form: AssessmentFormV1) =>
  canonicalStringify(form);

export const hashAssessmentForm = async (
  form: AssessmentFormV1,
): Promise<AssessmentFormHash> =>
  `sha256:${await sha256Hex(canonicalAssessmentForm(form))}`;
