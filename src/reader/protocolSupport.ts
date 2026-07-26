import {
  CURRENT_CONTENT_VERSION as CONTENT_VERSION,
} from "../content/currentContentIdentity";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";

export const MAX_READER_FORM_ITEMS = 40;
export const MAX_READER_ATTEMPT_DURATION_MS = 600_000;

export type ReaderSupportMode = "assisted" | "unassisted";
export type ReaderScript = "simplified" | "traditional";
export type ReaderAnswerExposure =
  | "public-client"
  | "server-confidential";

export type ReaderMasteryPolicy = {
  supportMode: ReaderSupportMode;
  supportPolicyVersion: string;
  answerExposure: ReaderAnswerExposure;
  priorExposure: boolean;
  masteryEligible: boolean;
};

export type CurrentReaderAuthority = {
  resetEpoch: number;
  contentVersion: string;
};

export type ReaderCommandIdentity = CurrentReaderAuthority & {
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
};

export type ReaderReceiptIdentity = CurrentReaderAuthority & {
  idempotencyKey: string;
  duplicate: boolean;
};

export const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const hasExactKeys = (
  value: Record<string, unknown>,
  required: ReadonlySet<string>,
  optional: ReadonlySet<string> = new Set(),
) => {
  const keys = Object.keys(value);
  return [...required].every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.has(key) || optional.has(key));
};

export const boundedIdentifier = (
  value: unknown,
  maximum: number,
): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && value === value.trim()
  && ![...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined
      && (codePoint <= 31 || codePoint === 127);
  });

export const boundedCanonicalText = (
  value: unknown,
  maximum: number,
): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && value === value.normalize("NFC").trim()
  && !value.includes("\0");

export const safePositiveInteger = (
  value: unknown,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 1
  && value <= maximum;

export const safeNonNegativeInteger = (
  value: unknown,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && value <= maximum;

export const normalizedTimestamp = (value: unknown) => {
  if (
    typeof value !== "string"
    || value.length < 20
    || value.length > 40
    || value !== value.trim()
  ) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const isSha256 = (
  value: unknown,
): value is `sha256:${string}` =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);

export const isReaderSupportMode = (
  value: unknown,
): value is ReaderSupportMode =>
  value === "assisted" || value === "unassisted";

export const isReaderScript = (
  value: unknown,
): value is ReaderScript =>
  value === "simplified" || value === "traditional";

export const isReaderAnswerExposure = (
  value: unknown,
): value is ReaderAnswerExposure =>
  value === "public-client" || value === "server-confidential";

export const readerPolicyAllowsMastery = ({
  supportMode,
  answerExposure,
  priorExposure,
}: {
  supportMode: ReaderSupportMode;
  answerExposure: ReaderAnswerExposure;
  priorExposure: boolean;
}) =>
  supportMode === "unassisted"
  && answerExposure === "server-confidential"
  && !priorExposure;

export const hasExactReaderMasteryPolicy = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & ReaderMasteryPolicy =>
  isReaderSupportMode(value.supportMode)
  && boundedIdentifier(value.supportPolicyVersion, 160)
  && isReaderAnswerExposure(value.answerExposure)
  && typeof value.priorExposure === "boolean"
  && typeof value.masteryEligible === "boolean"
  && value.masteryEligible === readerPolicyAllowsMastery({
    supportMode: value.supportMode,
    answerExposure: value.answerExposure,
    priorExposure: value.priorExposure,
  });

export const hasCurrentReaderAuthority = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & CurrentReaderAuthority =>
  isValidLearningResetEpoch(value.resetEpoch)
  && value.contentVersion === CONTENT_VERSION;

export const hasValidReaderCommandIdentity = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & ReaderCommandIdentity =>
  boundedIdentifier(value.idempotencyKey, 200)
  && boundedIdentifier(value.installationId, 160)
  && boundedIdentifier(value.deviceId, 160)
  && safePositiveInteger(value.deviceSequence)
  && hasCurrentReaderAuthority(value);

export const hasValidReaderReceiptIdentity = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & ReaderReceiptIdentity =>
  boundedIdentifier(value.idempotencyKey, 200)
  && typeof value.duplicate === "boolean"
  && hasCurrentReaderAuthority(value);
