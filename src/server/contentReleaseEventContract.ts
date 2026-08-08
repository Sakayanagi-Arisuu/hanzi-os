import {
  canonicalStudioJson,
  isStudioItemType,
  studioSha256,
  type StudioItemType,
} from "../content/studioContent";

export const CONTENT_RELEASE_EVENT_SCHEMA_VERSION = 1 as const;
export const CONTENT_RELEASE_EVENT_TYPES = [
  "content.validation.requested",
  "content.release.requested",
  "content.release.completed",
  "content.release.failed",
] as const;

export type ContentReleaseEventType = typeof CONTENT_RELEASE_EVENT_TYPES[number];
export type ContentReleaseAction = "publish" | "archive";

type ValidationRequestedPayload = {
  revisionId: string;
  itemId: string;
  stableKey: string;
  itemType: StudioItemType;
  contentSha256: string;
  validationSha256: string;
  requestedAt: number;
};

type ReleaseRequestedPayload = ValidationRequestedPayload & {
  action: ContentReleaseAction;
  revision: number;
};

type ReleaseCompletedPayload = {
  revisionId: string;
  itemId: string;
  action: ContentReleaseAction;
  packageId: string | null;
  packageSha256: string | null;
  manifestSha256: string | null;
  completedAt: number;
};

type ReleaseFailedPayload = {
  revisionId: string;
  itemId: string;
  action: ContentReleaseAction;
  attempt: number;
  retryable: boolean;
  failureCode: string;
  failedAt: number;
};

export type ContentReleaseEventPayloads = {
  "content.validation.requested": ValidationRequestedPayload;
  "content.release.requested": ReleaseRequestedPayload;
  "content.release.completed": ReleaseCompletedPayload;
  "content.release.failed": ReleaseFailedPayload;
};

export type ContentReleaseEventEnvelope<
  T extends ContentReleaseEventType = ContentReleaseEventType,
> = T extends ContentReleaseEventType ? {
  eventId: string;
  eventType: T;
  schemaVersion: 1;
  itemId: string;
  revisionId: string;
  correlationId: string;
  causationId: string | null;
  actorUserId: string | null;
  actorSessionId: string | null;
  createdAt: number;
  payload: ContentReleaseEventPayloads[T];
} : never;

export type StoredContentReleaseEvent = {
  id: string;
  eventType: string;
  schemaVersion: number;
  itemId: string;
  revisionId: string;
  correlationId: string;
  causationId: string | null;
  actorUserId: string | null;
  actorSessionId: string | null;
  payloadJson: string;
  payloadSha256: string;
  attempts: number;
  createdAt: number;
};

export type EncodedContentReleaseEvent<T extends ContentReleaseEventType> = {
  id: string;
  eventType: T;
  schemaVersion: 1;
  itemId: string;
  revisionId: string;
  correlationId: string;
  causationId: string | null;
  actorUserId: string | null;
  actorSessionId: string | null;
  payloadJson: string;
  payloadSha256: string;
  createdAt: number;
};

export const CONTENT_RELEASE_DECODE_FAILURE_CODES = [
  "CONTENT_RELEASE_INVALID_RECORD",
  "CONTENT_RELEASE_UNSUPPORTED_EVENT_TYPE",
  "CONTENT_RELEASE_UNSUPPORTED_SCHEMA_VERSION",
  "CONTENT_RELEASE_PAYLOAD_INVALID_JSON",
  "CONTENT_RELEASE_PAYLOAD_SCHEMA_MISMATCH",
  "CONTENT_RELEASE_PAYLOAD_DIGEST_MISMATCH",
] as const;

export type ContentReleaseDecodeFailureCode =
  typeof CONTENT_RELEASE_DECODE_FAILURE_CODES[number];

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const CORRELATION_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;
const FAILURE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_]{2,79}$/u;
const STABLE_KEY_PATTERN = /^[a-z0-9][a-z0-9._:-]{2,159}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
};

const isIdentifier = (value: unknown) =>
  typeof value === "string" && value.length > 0 && value.length <= 255 && !value.includes("\0");

const isTimestamp = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isBaseRequestedPayload = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) => exactKeys(value, expectedKeys)
  && isIdentifier(value.revisionId)
  && isIdentifier(value.itemId)
  && typeof value.stableKey === "string"
  && STABLE_KEY_PATTERN.test(value.stableKey)
  && isStudioItemType(value.itemType)
  && typeof value.contentSha256 === "string"
  && SHA256_PATTERN.test(value.contentSha256)
  && typeof value.validationSha256 === "string"
  && SHA256_PATTERN.test(value.validationSha256)
  && isTimestamp(value.requestedAt);

const isPayload = <T extends ContentReleaseEventType>(
  eventType: T,
  value: unknown,
): value is ContentReleaseEventPayloads[T] => {
  if (!isRecord(value)) return false;
  switch (eventType) {
    case "content.validation.requested":
      return isBaseRequestedPayload(value, [
        "revisionId", "itemId", "stableKey", "itemType", "contentSha256",
        "validationSha256", "requestedAt",
      ]);
    case "content.release.requested":
      return isBaseRequestedPayload(value, [
        "revisionId", "itemId", "stableKey", "itemType", "contentSha256",
        "validationSha256", "requestedAt", "action", "revision",
      ])
        && (value.action === "publish" || value.action === "archive")
        && typeof value.revision === "number"
        && Number.isSafeInteger(value.revision)
        && value.revision >= 1;
    case "content.release.completed":
      return exactKeys(value, [
        "revisionId", "itemId", "action", "packageId", "packageSha256",
        "manifestSha256", "completedAt",
      ])
        && isIdentifier(value.revisionId)
        && isIdentifier(value.itemId)
        && (value.action === "publish" || value.action === "archive")
        && isTimestamp(value.completedAt)
        && (
          value.action === "archive"
            ? value.packageId === null
              && value.packageSha256 === null
              && value.manifestSha256 === null
            : isIdentifier(value.packageId)
              && typeof value.packageSha256 === "string"
              && SHA256_PATTERN.test(value.packageSha256)
              && typeof value.manifestSha256 === "string"
              && SHA256_PATTERN.test(value.manifestSha256)
        );
    case "content.release.failed":
      return exactKeys(value, [
        "revisionId", "itemId", "action", "attempt", "retryable",
        "failureCode", "failedAt",
      ])
        && isIdentifier(value.revisionId)
        && isIdentifier(value.itemId)
        && (value.action === "publish" || value.action === "archive")
        && typeof value.attempt === "number"
        && Number.isSafeInteger(value.attempt)
        && value.attempt >= 1
        && typeof value.retryable === "boolean"
        && typeof value.failureCode === "string"
        && FAILURE_CODE_PATTERN.test(value.failureCode)
        && isTimestamp(value.failedAt);
  }
};

export const isContentReleaseEventType = (
  value: unknown,
): value is ContentReleaseEventType =>
  typeof value === "string"
  && (CONTENT_RELEASE_EVENT_TYPES as readonly string[]).includes(value);

export const encodeContentReleaseEvent = async <T extends ContentReleaseEventType>(
  input: Omit<EncodedContentReleaseEvent<T>, "schemaVersion" | "payloadJson" | "payloadSha256">
    & { payload: ContentReleaseEventPayloads[T] },
): Promise<EncodedContentReleaseEvent<T>> => {
  if (
    !isIdentifier(input.id)
    || !isIdentifier(input.itemId)
    || !isIdentifier(input.revisionId)
    || !CORRELATION_PATTERN.test(input.correlationId)
    || (input.causationId !== null && !isIdentifier(input.causationId))
    || !isTimestamp(input.createdAt)
    || !isPayload(input.eventType, input.payload)
    || input.payload.itemId !== input.itemId
    || input.payload.revisionId !== input.revisionId
  ) {
    throw new TypeError("Content release event does not satisfy the v1 contract.");
  }
  const payloadJson = canonicalStudioJson(input.payload);
  return {
    id: input.id,
    eventType: input.eventType,
    schemaVersion: CONTENT_RELEASE_EVENT_SCHEMA_VERSION,
    itemId: input.itemId,
    revisionId: input.revisionId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    actorUserId: input.actorUserId,
    actorSessionId: input.actorSessionId,
    payloadJson,
    payloadSha256: await studioSha256(payloadJson),
    createdAt: input.createdAt,
  };
};

export const decodeContentReleaseEvent = async (
  stored: StoredContentReleaseEvent,
): Promise<
  | { ok: true; envelope: ContentReleaseEventEnvelope }
  | { ok: false; failureCode: ContentReleaseDecodeFailureCode }
> => {
  if (
    !isIdentifier(stored.id)
    || !isIdentifier(stored.itemId)
    || !isIdentifier(stored.revisionId)
    || !CORRELATION_PATTERN.test(stored.correlationId)
    || (stored.causationId !== null && !isIdentifier(stored.causationId))
    || !isTimestamp(stored.createdAt)
    || !Number.isSafeInteger(stored.attempts)
    || stored.attempts < 0
  ) return { ok: false, failureCode: "CONTENT_RELEASE_INVALID_RECORD" };
  if (!isContentReleaseEventType(stored.eventType)) {
    return { ok: false, failureCode: "CONTENT_RELEASE_UNSUPPORTED_EVENT_TYPE" };
  }
  if (stored.schemaVersion !== CONTENT_RELEASE_EVENT_SCHEMA_VERSION) {
    return { ok: false, failureCode: "CONTENT_RELEASE_UNSUPPORTED_SCHEMA_VERSION" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(stored.payloadJson);
  } catch {
    return { ok: false, failureCode: "CONTENT_RELEASE_PAYLOAD_INVALID_JSON" };
  }
  if (
    !isPayload(stored.eventType, payload)
    || payload.itemId !== stored.itemId
    || payload.revisionId !== stored.revisionId
  ) return { ok: false, failureCode: "CONTENT_RELEASE_PAYLOAD_SCHEMA_MISMATCH" };
  if (
    !SHA256_PATTERN.test(stored.payloadSha256)
    || await studioSha256(canonicalStudioJson(payload)) !== stored.payloadSha256
  ) return { ok: false, failureCode: "CONTENT_RELEASE_PAYLOAD_DIGEST_MISMATCH" };
  return {
    ok: true,
    envelope: {
      eventId: stored.id,
      eventType: stored.eventType,
      schemaVersion: 1,
      itemId: stored.itemId,
      revisionId: stored.revisionId,
      correlationId: stored.correlationId,
      causationId: stored.causationId,
      actorUserId: stored.actorUserId,
      actorSessionId: stored.actorSessionId,
      createdAt: stored.createdAt,
      payload,
    } as ContentReleaseEventEnvelope,
  };
};
