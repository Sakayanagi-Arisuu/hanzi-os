export const OUTBOX_EVENT_SCHEMA_VERSION = 1 as const;
export const MAX_OUTBOX_EVENT_PAYLOAD_BYTES = 64 * 1024;

export const OUTBOX_EVENT_TYPES = [
  "lesson.started",
  "lesson.completed",
  "lesson.abandoned",
  "learning.attempt.recorded",
  "assessment.started",
  "assessment.attempt.recorded",
  "assessment.submitted",
  "assessment.abandoned",
  "reader.started",
  "reader.attempt.recorded",
  "reader.submitted",
  "reader.abandoned",
  "review.graded",
] as const;

export type OutboxEventTypeV1 = typeof OUTBOX_EVENT_TYPES[number];

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type StoredOutboxEvent = {
  id: string;
  userId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  schemaVersion: number;
  resetEpoch: number;
  payloadJson: string;
  attempts: number;
  createdAt: number;
};

export type OutboxEventEnvelopeV1 = {
  envelopeVersion: 1;
  eventId: string;
  tenantId: string;
  eventType: OutboxEventTypeV1;
  schemaVersion: 1;
  aggregate: {
    type: "lesson_session" | "learning_attempt" | "assessment_session"
      | "assessment_attempt" | "reader_session" | "review_log";
    id: string;
  };
  resetEpoch: number;
  createdAt: number;
  payload: JsonObject;
};

export const OUTBOX_DECODE_FAILURE_CODES = [
  "OUTBOX_INVALID_RECORD",
  "OUTBOX_UNSUPPORTED_EVENT_TYPE",
  "OUTBOX_UNSUPPORTED_SCHEMA_VERSION",
  "OUTBOX_PAYLOAD_TOO_LARGE",
  "OUTBOX_PAYLOAD_INVALID_JSON",
  "OUTBOX_PAYLOAD_NOT_OBJECT",
  "OUTBOX_PAYLOAD_SCHEMA_MISMATCH",
] as const;

export type OutboxDecodeFailureCode =
  typeof OUTBOX_DECODE_FAILURE_CODES[number];

export type DecodeOutboxEventResult =
  | { ok: true; envelope: OutboxEventEnvelopeV1 }
  | { ok: false; failureCode: OutboxDecodeFailureCode };

type PayloadFieldRule =
  | "boolean"
  | "content-version"
  | "false"
  | "integer"
  | "iso-date"
  | "number"
  | "objective-method"
  | "objective-outcome"
  | "objective-source"
  | "percentage"
  | "positive-integer"
  | "reader-abandonment-reason"
  | "reader-answer-exposure"
  | "reader-script"
  | "reader-support-mode"
  | "review-rating"
  | "sha256"
  | "skill"
  | "string"
  | `literal:${string}`;

type EventContract = {
  aggregateType: OutboxEventEnvelopeV1["aggregate"]["type"];
  aggregateIdField: "attemptId" | "sessionId" | "reviewLogId";
  fields: Readonly<Record<string, PayloadFieldRule>>;
};

const COMMON_LESSON_FIELDS = {
  sessionId: "string",
  contentVersion: "content-version",
  resetEpoch: "integer",
  contentManifestSha256: "sha256",
  lessonId: "string",
  lessonVersion: "string",
} as const satisfies Readonly<Record<string, PayloadFieldRule>>;

const COMMON_ASSESSMENT_SESSION_FIELDS = {
  sessionId: "string",
  enrollmentId: "string",
  resetEpoch: "integer",
  contentVersion: "content-version",
  blueprintId: "string",
  formVersion: "string",
  formHash: "sha256",
} as const satisfies Readonly<Record<string, PayloadFieldRule>>;

const COMMON_READER_SESSION_FIELDS = {
  sessionId: "string",
  enrollmentId: "string",
  resetEpoch: "integer",
  contentVersion: "content-version",
  storyId: "string",
  storyVersion: "string",
  formVersion: "string",
  formHash: "sha256",
  script: "reader-script",
  supportMode: "reader-support-mode",
  supportPolicyVersion: "string",
} as const satisfies Readonly<Record<string, PayloadFieldRule>>;

const EVENT_CONTRACTS = {
  "lesson.started": {
    aggregateType: "lesson_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_LESSON_FIELDS,
      enrollmentId: "string",
      expectedEvidenceCount: "positive-integer",
      formSchemaVersion: "positive-integer",
      formHash: "sha256",
      startedAt: "iso-date",
    },
  },
  "lesson.completed": {
    aggregateType: "lesson_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_LESSON_FIELDS,
      completionEvidenceId: "string",
      formHash: "sha256",
      evidenceCount: "positive-integer",
      rawScore: "percentage",
      gateScore: "percentage",
      requiredEvidenceCount: "positive-integer",
      requiredCorrectCount: "integer",
      passed: "boolean",
      submittedAt: "iso-date",
    },
  },
  "lesson.abandoned": {
    aggregateType: "lesson_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_LESSON_FIELDS,
      enrollmentId: "string",
      abandonedAt: "iso-date",
    },
  },
  "learning.attempt.recorded": {
    aggregateType: "learning_attempt",
    aggregateIdField: "attemptId",
    fields: {
      attemptId: "string",
      evidenceId: "string",
      resetEpoch: "integer",
      contentVersion: "content-version",
      contentManifestSha256: "sha256",
      source: "objective-source",
      method: "objective-method",
      activityId: "string",
      activityVersion: "string",
      skill: "skill",
      outcome: "objective-outcome",
      score: "percentage",
      verification: "literal:server-objective",
      masteryEligible: "false",
    },
  },
  "assessment.started": {
    aggregateType: "assessment_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_ASSESSMENT_SESSION_FIELDS,
      contentManifestSha256: "sha256",
      scoringPolicyVersion: "string",
      expectedItemCount: "positive-integer",
      startedAt: "iso-date",
    },
  },
  "assessment.attempt.recorded": {
    aggregateType: "assessment_attempt",
    aggregateIdField: "attemptId",
    fields: {
      attemptId: "string",
      sessionId: "string",
      resetEpoch: "integer",
      contentVersion: "content-version",
      formHash: "sha256",
      position: "integer",
      itemId: "string",
      itemVersion: "string",
      skill: "skill",
      measurementEligible: "boolean",
      masteryEligible: "false",
      recordedAt: "iso-date",
    },
  },
  "assessment.submitted": {
    aggregateType: "assessment_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_ASSESSMENT_SESSION_FIELDS,
      scoringPolicyVersion: "string",
      status: "literal:submitted",
      calibrationStatus: "literal:uncalibrated",
      masteryEligible: "false",
      submittedAt: "iso-date",
    },
  },
  "assessment.abandoned": {
    aggregateType: "assessment_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_ASSESSMENT_SESSION_FIELDS,
      status: "literal:abandoned",
      masteryEligible: "false",
      abandonedAt: "iso-date",
    },
  },
  "reader.started": {
    aggregateType: "reader_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_READER_SESSION_FIELDS,
      contentManifestSha256: "sha256",
      expectedItemCount: "positive-integer",
      startedAt: "iso-date",
    },
  },
  "reader.attempt.recorded": {
    aggregateType: "reader_session",
    aggregateIdField: "sessionId",
    fields: {
      sessionId: "string",
      attemptId: "string",
      evidenceId: "string",
      resetEpoch: "integer",
      contentVersion: "content-version",
      contentManifestSha256: "sha256",
      formHash: "sha256",
      position: "integer",
      itemId: "string",
      itemVersion: "string",
      method: "literal:reading-comprehension",
      skill: "literal:reading",
      script: "reader-script",
      supportMode: "reader-support-mode",
      supportPolicyVersion: "string",
      answerExposure: "reader-answer-exposure",
      priorExposure: "boolean",
      masteryEligible: "boolean",
      outcome: "objective-outcome",
      score: "percentage",
      verification: "literal:server-objective",
      recordedAt: "iso-date",
    },
  },
  "reader.submitted": {
    aggregateType: "reader_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_READER_SESSION_FIELDS,
      expectedItemCount: "positive-integer",
      attemptCount: "positive-integer",
      correctCount: "integer",
      score: "percentage",
      method: "literal:reading-comprehension",
      skill: "literal:reading",
      status: "literal:submitted",
      submittedAt: "iso-date",
    },
  },
  "reader.abandoned": {
    aggregateType: "reader_session",
    aggregateIdField: "sessionId",
    fields: {
      ...COMMON_READER_SESSION_FIELDS,
      reason: "reader-abandonment-reason",
      status: "literal:abandoned",
      abandonedAt: "iso-date",
    },
  },
  "review.graded": {
    aggregateType: "review_log",
    aggregateIdField: "reviewLogId",
    fields: {
      reviewLogId: "string",
      attemptId: "string",
      cardId: "string",
      resetEpoch: "integer",
      contentVersion: "content-version",
      contentManifestSha256: "sha256",
      wordId: "string",
      wordVersion: "string",
      modality: "literal:hanzi-reading-meaning-recall",
      schedulerVersion: "literal:ts-fsrs-5.4.1:retention-0.9:no-fuzz:v1",
      rating: "review-rating",
      previousCardRevision: "positive-integer",
      cardRevision: "positive-integer",
      scheduledAt: "iso-date",
      reviewedAt: "iso-date",
      nextDueAt: "iso-date",
      verification: "literal:server-scheduled-self-rating",
      masteryEligible: "false",
    },
  },
} as const satisfies Record<OutboxEventTypeV1, EventContract>;

const MAX_IDENTITY_LENGTH = 512;
const UTF8_ENCODER = new TextEncoder();
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const SAFE_CONTENT_VERSION_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;
const OBJECTIVE_SOURCES = new Set(["lesson", "reader"]);
const OBJECTIVE_METHODS = new Set([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
]);
const OBJECTIVE_OUTCOMES = new Set(["correct", "incorrect"]);
const SKILLS = new Set([
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
]);

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isNonEmptyBoundedString = (value: unknown): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= MAX_IDENTITY_LENGTH
  && !value.includes("\0");

const isSafeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

const isResetEpoch = (value: unknown): value is number =>
  isSafeInteger(value) && value <= 2_147_483_647;

const isEventTypeV1 = (value: unknown): value is OutboxEventTypeV1 =>
  typeof value === "string"
  && (OUTBOX_EVENT_TYPES as readonly string[]).includes(value);

const isValidPayloadField = (
  value: unknown,
  rule: PayloadFieldRule,
): boolean => {
  if (rule === "boolean") return typeof value === "boolean";
  if (rule === "content-version") {
    return typeof value === "string"
      && SAFE_CONTENT_VERSION_PATTERN.test(value);
  }
  if (rule === "false") return value === false;
  if (rule === "integer") return isSafeInteger(value);
  if (rule === "number") return typeof value === "number" && Number.isFinite(value);
  if (rule === "objective-method") {
    return typeof value === "string" && OBJECTIVE_METHODS.has(value);
  }
  if (rule === "objective-outcome") {
    return typeof value === "string" && OBJECTIVE_OUTCOMES.has(value);
  }
  if (rule === "objective-source") {
    return typeof value === "string" && OBJECTIVE_SOURCES.has(value);
  }
  if (rule === "percentage") {
    return isSafeInteger(value) && value <= 100;
  }
  if (rule === "positive-integer") {
    return isSafeInteger(value) && value > 0;
  }
  if (rule === "reader-abandonment-reason") {
    return value === "user-exit"
      || value === "support-requested"
      || value === "superseded";
  }
  if (rule === "reader-answer-exposure") {
    return value === "public-client" || value === "server-confidential";
  }
  if (rule === "reader-script") {
    return value === "simplified" || value === "traditional";
  }
  if (rule === "reader-support-mode") {
    return value === "assisted" || value === "unassisted";
  }
  if (rule === "review-rating") {
    return isSafeInteger(value) && value >= 1 && value <= 4;
  }
  if (rule === "sha256") {
    return typeof value === "string" && SHA256_PATTERN.test(value);
  }
  if (rule === "skill") {
    return typeof value === "string" && SKILLS.has(value);
  }
  if (rule === "string") return isNonEmptyBoundedString(value);
  if (rule === "iso-date") {
    return typeof value === "string"
      && value.length <= MAX_IDENTITY_LENGTH
      && ISO_INSTANT_PATTERN.test(value)
      && Number.isFinite(Date.parse(value))
      && new Date(value).toISOString() === value;
  }
  return value === rule.slice("literal:".length);
};

const normalizePropertyName = (key: string) =>
  key.toLowerCase().replaceAll("_", "").replaceAll("-", "");

const isClientIdempotencyProperty = (key: string) => {
  const normalized = normalizePropertyName(key);
  return normalized === "idempotencykey"
    || normalized === "clientidempotencykey";
};

/**
 * Rebuilds an already parsed JSON value while removing client retry tokens at
 * every depth. The input is never mutated.
 */
export const sanitizeOutboxJson = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(sanitizeOutboxJson);
  if (value === null || typeof value !== "object") return value;

  const sanitized: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    if (isClientIdempotencyProperty(key)) continue;
    Object.defineProperty(sanitized, key, {
      configurable: true,
      enumerable: true,
      value: sanitizeOutboxJson(child),
      writable: true,
    });
  }
  return sanitized;
};

const hasValidRecordShape = (
  record: Partial<StoredOutboxEvent>,
): record is StoredOutboxEvent =>
  isNonEmptyBoundedString(record.id)
  && isNonEmptyBoundedString(record.userId)
  && isNonEmptyBoundedString(record.aggregateType)
  && isNonEmptyBoundedString(record.aggregateId)
  && typeof record.eventType === "string"
  && Number.isSafeInteger(record.schemaVersion)
  && isResetEpoch(record.resetEpoch)
  && typeof record.payloadJson === "string"
  && isSafeInteger(record.attempts)
  && isSafeInteger(record.createdAt);

const hasValidPayloadSchema = (
  payload: Record<string, unknown>,
  record: StoredOutboxEvent,
  contract: EventContract,
) =>
  record.aggregateType === contract.aggregateType
  && payload[contract.aggregateIdField] === record.aggregateId
  && payload.resetEpoch === record.resetEpoch
  && Object.entries(contract.fields).every(([field, rule]) =>
    isValidPayloadField(payload[field], rule)
  )
  && hasValidEventSemantics(record.eventType as OutboxEventTypeV1, payload);

const hasValidEventSemantics = (
  eventType: OutboxEventTypeV1,
  payload: Record<string, unknown>,
) => {
  if (eventType === "lesson.started") {
    return isSafeInteger(payload.expectedEvidenceCount)
      && payload.expectedEvidenceCount > 0
      && isSafeInteger(payload.formSchemaVersion)
      && payload.formSchemaVersion > 0;
  }
  if (eventType === "lesson.completed") {
    return isSafeInteger(payload.evidenceCount)
      && payload.evidenceCount > 0
      && isSafeInteger(payload.requiredEvidenceCount)
      && payload.requiredEvidenceCount > 0
      && payload.requiredEvidenceCount <= payload.evidenceCount
      && isSafeInteger(payload.requiredCorrectCount)
      && payload.requiredCorrectCount <= payload.requiredEvidenceCount;
  }
  if (eventType === "learning.attempt.recorded") {
    const source = payload.source;
    const method = payload.method;
    const outcome = payload.outcome;
    const score = payload.score;
    return (source !== "reader" || method === "reading-comprehension")
      && ((outcome === "correct" && score === 100)
        || (outcome === "incorrect" && score === 0));
  }
  if (eventType === "assessment.started") {
    return isSafeInteger(payload.expectedItemCount)
      && payload.expectedItemCount > 0;
  }
  if (eventType === "reader.started") {
    return isSafeInteger(payload.expectedItemCount)
      && payload.expectedItemCount > 0
      && payload.expectedItemCount <= 40;
  }
  if (eventType === "reader.attempt.recorded") {
    const eligible = payload.supportMode === "unassisted"
      && payload.answerExposure === "server-confidential"
      && payload.priorExposure === false;
    return payload.masteryEligible === eligible
      && (
        (payload.outcome === "correct" && payload.score === 100)
        || (payload.outcome === "incorrect" && payload.score === 0)
      );
  }
  if (eventType === "reader.submitted") {
    return isSafeInteger(payload.expectedItemCount)
      && payload.expectedItemCount > 0
      && payload.expectedItemCount <= 40
      && payload.attemptCount === payload.expectedItemCount
      && isSafeInteger(payload.correctCount)
      && payload.correctCount <= payload.attemptCount
      && payload.score === Math.round(
        (payload.correctCount / payload.expectedItemCount) * 100,
      );
  }
  if (eventType === "review.graded") {
    return isSafeInteger(payload.previousCardRevision)
      && isSafeInteger(payload.cardRevision)
      && payload.cardRevision === payload.previousCardRevision + 1
      && typeof payload.scheduledAt === "string"
      && typeof payload.reviewedAt === "string"
      && typeof payload.nextDueAt === "string"
      && Date.parse(payload.scheduledAt) <= Date.parse(payload.reviewedAt)
      && Date.parse(payload.reviewedAt) <= Date.parse(payload.nextDueAt);
  }
  return true;
};

const projectContractPayload = (
  payload: Record<string, unknown>,
  contract: EventContract,
) => {
  const projected: JsonObject = {};
  for (const field of Object.keys(contract.fields)) {
    Object.defineProperty(projected, field, {
      configurable: true,
      enumerable: true,
      value: sanitizeOutboxJson(payload[field] as JsonValue),
      writable: true,
    });
  }
  return projected;
};

export type EncodeOutboxEventPayloadInput = {
  eventType: OutboxEventTypeV1;
  aggregateId: string;
  resetEpoch: number;
  payload: Record<string, unknown>;
};

/**
 * Producer-side counterpart to the decoder. It validates the same semantic
 * contract and persists only allow-listed fields, so retry tokens or accidental
 * answer/identity fields never enter the durable delivery payload.
 */
export const encodeOutboxEventPayload = ({
  eventType,
  aggregateId,
  resetEpoch,
  payload,
}: EncodeOutboxEventPayloadInput) => {
  const contract: EventContract = EVENT_CONTRACTS[eventType];
  const syntheticRecord: StoredOutboxEvent = {
    id: "producer-validation",
    userId: "producer-validation",
    aggregateType: contract.aggregateType,
    aggregateId,
    eventType,
    schemaVersion: OUTBOX_EVENT_SCHEMA_VERSION,
    resetEpoch,
    payloadJson: "",
    attempts: 0,
    createdAt: 0,
  };
  if (
    !isNonEmptyBoundedString(aggregateId)
    || !isResetEpoch(resetEpoch)
    || !hasValidPayloadSchema(payload, syntheticRecord, contract)
  ) {
    throw new TypeError("Outbox producer payload violates its event contract.");
  }
  return JSON.stringify(projectContractPayload(payload, contract));
};

/**
 * Fail-closed decoder for the durable server outbox. A stable event ID is
 * retained so a downstream sink can deduplicate at-least-once delivery.
 */
export const decodeOutboxEvent = (
  input: unknown,
  maximumPayloadBytes = MAX_OUTBOX_EVENT_PAYLOAD_BYTES,
): DecodeOutboxEventResult => {
  if (!isJsonObject(input) || !hasValidRecordShape(input)) {
    return { ok: false, failureCode: "OUTBOX_INVALID_RECORD" };
  }
  const record = input;
  if (!isEventTypeV1(record.eventType)) {
    return { ok: false, failureCode: "OUTBOX_UNSUPPORTED_EVENT_TYPE" };
  }
  if (record.schemaVersion !== OUTBOX_EVENT_SCHEMA_VERSION) {
    return { ok: false, failureCode: "OUTBOX_UNSUPPORTED_SCHEMA_VERSION" };
  }
  if (
    !Number.isSafeInteger(maximumPayloadBytes)
    || maximumPayloadBytes <= 0
    || UTF8_ENCODER.encode(record.payloadJson).byteLength > maximumPayloadBytes
  ) {
    return { ok: false, failureCode: "OUTBOX_PAYLOAD_TOO_LARGE" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(record.payloadJson);
  } catch {
    return { ok: false, failureCode: "OUTBOX_PAYLOAD_INVALID_JSON" };
  }
  if (!isJsonObject(payload)) {
    return { ok: false, failureCode: "OUTBOX_PAYLOAD_NOT_OBJECT" };
  }

  const contract: EventContract = EVENT_CONTRACTS[record.eventType];
  if (!hasValidPayloadSchema(payload, record, contract)) {
    return { ok: false, failureCode: "OUTBOX_PAYLOAD_SCHEMA_MISMATCH" };
  }

  return {
    ok: true,
    envelope: {
      envelopeVersion: 1,
      eventId: record.id,
      tenantId: record.userId,
      eventType: record.eventType,
      schemaVersion: OUTBOX_EVENT_SCHEMA_VERSION,
      aggregate: {
        type: contract.aggregateType,
        id: record.aggregateId,
      },
      resetEpoch: record.resetEpoch,
      createdAt: record.createdAt,
      payload: projectContractPayload(payload, contract),
    },
  };
};
