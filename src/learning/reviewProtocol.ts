import { CONTENT_VERSION, RELEASED_WORD_BY_ID } from "../data/curriculum";
import { canonicalStringify, sha256Hex } from "../sync/document";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const REVIEW_PROTOCOL_VERSION = 1 as const;
export const REVIEW_IDEMPOTENCY_SCOPE = "learning-review-v1";
export const REVIEW_QUEUE_PROTOCOL_VERSION = 1 as const;
export const REVIEW_QUEUE_MAX_OFFERS = 12;
export const REVIEW_MODALITY =
  "hanzi-reading-meaning-recall" as const;
export const REVIEW_SCHEDULER_VERSION =
  "ts-fsrs-5.4.1:retention-0.9:no-fuzz:v1" as const;

export type ReviewRating = 1 | 2 | 3 | 4;

export type ReviewQueueCardV1 = {
  cardId: string;
  cardRevision: number;
  wordId: string;
  wordVersion: string;
  modality: typeof REVIEW_MODALITY;
  dueAt: string;
  schedulerVersion: typeof REVIEW_SCHEDULER_VERSION;
};

export type ReviewQueueV1 = {
  protocolVersion: 1;
  resetEpoch: number;
  contentVersion: string;
  schedulerVersion: typeof REVIEW_SCHEDULER_VERSION;
  generatedAt: string;
  cards: ReviewQueueCardV1[];
};

/**
 * Untrusted self-rating command. The client cannot provide card state, a due
 * date, a schedule, correctness, evidence eligibility, XP, or mastery.
 */
export type GradeReviewCommandV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  resetEpoch: number;
  contentVersion: string;
  schedulerVersion: typeof REVIEW_SCHEDULER_VERSION;
  cardId: string;
  wordId: string;
  wordVersion: string;
  expectedCardRevision: number;
  rating: ReviewRating;
  durationMs?: number;
};

export type GradeReviewReceiptV1 = {
  protocolVersion: 1;
  idempotencyKey: string;
  duplicate: boolean;
  reviewLogId: string;
  cardId: string;
  wordId: string;
  wordVersion: string;
  previousCardRevision: number;
  cardRevision: number;
  resetEpoch: number;
  contentVersion: string;
  schedulerVersion: typeof REVIEW_SCHEDULER_VERSION;
  rating: ReviewRating;
  scheduledAt: string;
  reviewedAt: string;
  nextDueAt: string;
  verification: "server-scheduled-self-rating";
  masteryEligible: false;
};

export type GradeReviewCommandParseResult =
  | { ok: true; command: GradeReviewCommandV1 }
  | { ok: false; reason: string };

export type ReviewQueueParseResult =
  | { ok: true; queue: ReviewQueueV1 }
  | { ok: false; reason: string };

const COMMAND_KEYS = new Set([
  "protocolVersion",
  "idempotencyKey",
  "installationId",
  "deviceId",
  "deviceSequence",
  "resetEpoch",
  "contentVersion",
  "schedulerVersion",
  "cardId",
  "wordId",
  "wordVersion",
  "expectedCardRevision",
  "rating",
  "durationMs",
]);

const QUEUE_KEYS = new Set([
  "protocolVersion",
  "resetEpoch",
  "contentVersion",
  "schedulerVersion",
  "generatedAt",
  "cards",
]);

const CARD_KEYS = new Set([
  "cardId",
  "cardRevision",
  "wordId",
  "wordVersion",
  "modality",
  "dueAt",
  "schedulerVersion",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
) => Object.keys(value).every((key) => allowed.has(key))
  && [...allowed].every((key) =>
    key === "durationMs" || Object.hasOwn(value, key)
  );

const boundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && !value.includes("\0");

const positiveInteger = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 1;

const duration = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && value <= 600_000;

const canonicalTimestamp = (value: unknown): value is string => {
  if (!boundedString(value, 40)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
};

export const reviewWordVersion = (wordId: string) =>
  `${CONTENT_VERSION}:vocabulary:${wordId}:1`;

export const parseGradeReviewCommand = (
  input: unknown,
): GradeReviewCommandParseResult => {
  if (!isRecord(input) || !exactKeys(input, COMMAND_KEYS)) {
    return {
      ok: false,
      reason: "Review command contains unknown or missing fields.",
    };
  }
  if (input.protocolVersion !== REVIEW_PROTOCOL_VERSION) {
    return { ok: false, reason: "Review protocol version is unsupported." };
  }
  if (
    !boundedString(input.idempotencyKey, 200)
    || !boundedString(input.installationId, 160)
    || !boundedString(input.deviceId, 160)
    || !positiveInteger(input.deviceSequence)
    || !isValidLearningResetEpoch(input.resetEpoch)
    || input.contentVersion !== CONTENT_VERSION
    || input.schedulerVersion !== REVIEW_SCHEDULER_VERSION
    || !boundedString(input.cardId, 160)
    || !boundedString(input.wordId, 160)
    || !RELEASED_WORD_BY_ID.has(input.wordId)
    || input.wordVersion !== reviewWordVersion(input.wordId)
    || !positiveInteger(input.expectedCardRevision)
    || typeof input.rating !== "number"
    || !Number.isInteger(input.rating)
    || ![1, 2, 3, 4].includes(input.rating)
    || (
      input.durationMs !== undefined
      && !duration(input.durationMs)
    )
  ) {
    return { ok: false, reason: "Review command fields are invalid." };
  }

  return {
    ok: true,
    command: {
      protocolVersion: REVIEW_PROTOCOL_VERSION,
      idempotencyKey: input.idempotencyKey,
      installationId: input.installationId,
      deviceId: input.deviceId,
      deviceSequence: input.deviceSequence,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      cardId: input.cardId,
      wordId: input.wordId,
      wordVersion: input.wordVersion,
      expectedCardRevision: input.expectedCardRevision,
      rating: input.rating as ReviewRating,
      ...(input.durationMs === undefined
        ? {}
        : { durationMs: input.durationMs }),
    },
  };
};

export const parseReviewQueue = (input: unknown): ReviewQueueParseResult => {
  if (
    !isRecord(input)
    || !exactKeys(input, QUEUE_KEYS)
    || input.protocolVersion !== REVIEW_QUEUE_PROTOCOL_VERSION
    || !isValidLearningResetEpoch(input.resetEpoch)
    || input.contentVersion !== CONTENT_VERSION
    || input.schedulerVersion !== REVIEW_SCHEDULER_VERSION
    || !canonicalTimestamp(input.generatedAt)
    || !Array.isArray(input.cards)
    || input.cards.length > REVIEW_QUEUE_MAX_OFFERS
  ) {
    return { ok: false, reason: "Review queue contract is invalid." };
  }

  const cardIds = new Set<string>();
  const wordIds = new Set<string>();
  const cards: ReviewQueueCardV1[] = [];
  for (const candidate of input.cards) {
    if (
      !isRecord(candidate)
      || !exactKeys(candidate, CARD_KEYS)
      || !boundedString(candidate.cardId, 160)
      || !positiveInteger(candidate.cardRevision)
      || !boundedString(candidate.wordId, 160)
      || !RELEASED_WORD_BY_ID.has(candidate.wordId)
      || candidate.wordVersion !== reviewWordVersion(candidate.wordId)
      || candidate.modality !== REVIEW_MODALITY
      || !canonicalTimestamp(candidate.dueAt)
      || Date.parse(candidate.dueAt) > Date.parse(input.generatedAt)
      || candidate.schedulerVersion !== REVIEW_SCHEDULER_VERSION
      || cardIds.has(candidate.cardId)
      || wordIds.has(candidate.wordId)
    ) {
      return { ok: false, reason: "Review queue card is invalid." };
    }
    cardIds.add(candidate.cardId);
    wordIds.add(candidate.wordId);
    cards.push(candidate as ReviewQueueCardV1);
  }

  return {
    ok: true,
    queue: {
      protocolVersion: REVIEW_QUEUE_PROTOCOL_VERSION,
      resetEpoch: input.resetEpoch,
      contentVersion: CONTENT_VERSION,
      schedulerVersion: REVIEW_SCHEDULER_VERSION,
      generatedAt: input.generatedAt,
      cards,
    },
  };
};

export const hashGradeReviewCommand = (
  command: GradeReviewCommandV1,
) => sha256Hex(canonicalStringify(command));
