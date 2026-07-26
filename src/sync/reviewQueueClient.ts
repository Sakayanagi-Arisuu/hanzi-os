import { CONTENT_VERSION } from "../data/curriculum";
import {
  parseReviewQueue,
  type ReviewQueueV1,
} from "../learning/reviewProtocol";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import {
  readLearningProjection,
  writeLearningProjection,
  type OwnerGeneration,
  type OwnerScopedCacheRecord,
} from "./indexedDb";

export const REVIEW_QUEUE_ENDPOINT = "/api/learning/reviews" as const;
export const REVIEW_QUEUE_CACHE_KEY = "review-queue-v1" as const;

export type FetchReviewQueueInput = {
  expectedOwnerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  fetch?: typeof fetch;
  origin?: string;
  signal?: AbortSignal;
  now?: () => Date;
};

export type FetchReviewQueueResult =
  | {
      state: "updated";
      queue: ReviewQueueV1;
    }
  | {
      state: "reset-mismatch";
      expectedResetEpoch: number;
      serverResetEpoch: number;
    }
  | {
      state: "permanent-unavailable";
      status: number;
      reason:
        | "authentication-required"
        | "content-unavailable"
        | "request-rejected";
    }
  | {
      state: "retryable";
      status: number | null;
      reason:
        | "network-unavailable"
        | "rate-limited"
        | "reset-race"
        | "server-unavailable"
        | "invalid-response";
      retryAfterMs: number;
    };

export type ValidCachedReviewQueue =
  OwnerScopedCacheRecord<ReviewQueueV1>;

const queueScope = (
  expectedOwnerGeneration: OwnerGeneration,
  expectedResetEpoch: number,
) => ({
  expectedOwnerGeneration,
  resetEpoch: expectedResetEpoch,
  entryKey: REVIEW_QUEUE_CACHE_KEY,
});

const validExactQueue = (
  value: unknown,
  expectedResetEpoch: number,
) => {
  const parsed = parseReviewQueue(value);
  if (
    !parsed.ok
    || parsed.queue.resetEpoch !== expectedResetEpoch
    || parsed.queue.contentVersion !== CONTENT_VERSION
  ) return null;
  return parsed.queue;
};

export const readValidCachedReviewQueue = async (
  expectedOwnerGeneration: OwnerGeneration,
  expectedResetEpoch: number,
): Promise<ValidCachedReviewQueue | null> => {
  if (!isValidLearningResetEpoch(expectedResetEpoch)) {
    throw new Error("Expected review reset epoch is invalid.");
  }
  const record = await readLearningProjection<unknown>(queueScope(
    expectedOwnerGeneration,
    expectedResetEpoch,
  ));
  if (!record) return null;
  const queue = validExactQueue(record.value, expectedResetEpoch);
  return queue ? { ...record, value: queue } : null;
};

const retryAfterMs = (value: string | null, nowMs: number) => {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(24 * 60 * 60_000, Math.ceil(seconds * 1_000));
  }
  const retryAt = new Date(value).getTime();
  return Number.isNaN(retryAt)
    ? 0
    : Math.min(24 * 60 * 60_000, Math.max(0, retryAt - nowMs));
};

const retryable = (
  status: number | null,
  reason: Extract<
    FetchReviewQueueResult,
    { state: "retryable" }
  >["reason"],
  delay = 0,
): FetchReviewQueueResult => ({
  state: "retryable",
  status,
  reason,
  retryAfterMs: delay,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const serverErrorCode = async (response: Response) => {
  let value: unknown;
  try {
    value = await response.json() as unknown;
  } catch {
    return null;
  }
  return isRecord(value)
    && isRecord(value.error)
    && typeof value.error.code === "string"
    ? value.error.code
    : null;
};

/**
 * Fetches only the fixed private queue endpoint. The IndexedDB write is
 * owner-generation/reset fenced, so a response authorized before account
 * switch or reset cannot populate the next owner's cache.
 */
export async function fetchReviewQueue(
  input: FetchReviewQueueInput,
): Promise<FetchReviewQueueResult> {
  if (
    !input.expectedOwnerGeneration.ownerKey
    || !Number.isSafeInteger(input.expectedOwnerGeneration.generation)
    || input.expectedOwnerGeneration.generation < 1
    || !isValidLearningResetEpoch(input.expectedResetEpoch)
  ) {
    throw new Error("Expected review owner/reset scope is invalid.");
  }
  const currentOrigin = input.origin
    ?? (typeof location === "undefined" ? null : location.origin);
  if (!currentOrigin) {
    throw new Error("Current origin is required for review queue fetch.");
  }
  const origin = new URL(currentOrigin).origin;
  const endpoint = new URL(REVIEW_QUEUE_ENDPOINT, origin);
  if (
    endpoint.origin !== origin
    || endpoint.pathname !== REVIEW_QUEUE_ENDPOINT
    || endpoint.search
    || endpoint.hash
    || endpoint.username
    || endpoint.password
  ) {
    throw new Error("Review queue endpoint must remain same-origin.");
  }
  const now = input.now ?? (() => new Date());
  const requestStartedAt = now().getTime();
  if (Number.isNaN(requestStartedAt)) {
    throw new Error("Review queue client clock is invalid.");
  }

  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(REVIEW_QUEUE_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      headers: { Accept: "application/json" },
      ...(input.signal ? { signal: input.signal } : {}),
    });
  } catch {
    return retryable(null, "network-unavailable");
  }

  if (response.status === 401) {
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason: "authentication-required",
    };
  }
  if (response.status === 409) {
    const code = await serverErrorCode(response);
    if (code === "REVIEW_QUEUE_RESET_RACE") {
      return retryable(
        response.status,
        "reset-race",
        retryAfterMs(response.headers.get("Retry-After"), requestStartedAt),
      );
    }
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason: code === "REVIEW_QUEUE_UNAVAILABLE"
        ? "content-unavailable"
        : "request-rejected",
    };
  }
  if (response.status === 429) {
    return retryable(
      response.status,
      "rate-limited",
      retryAfterMs(response.headers.get("Retry-After"), requestStartedAt),
    );
  }
  if (response.status >= 500 && response.status <= 599) {
    return retryable(
      response.status,
      "server-unavailable",
      retryAfterMs(response.headers.get("Retry-After"), requestStartedAt),
    );
  }
  if (response.status !== 200) {
    return response.status >= 400 && response.status <= 499
      ? {
          state: "permanent-unavailable",
          status: response.status,
          reason: "request-rejected",
        }
      : retryable(response.status, "invalid-response");
  }

  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    return retryable(response.status, "invalid-response");
  }
  const parsed = parseReviewQueue(body);
  if (!parsed.ok) return retryable(response.status, "invalid-response");
  const queue = parsed.queue;
  if (queue.resetEpoch !== input.expectedResetEpoch) {
    return {
      state: "reset-mismatch",
      expectedResetEpoch: input.expectedResetEpoch,
      serverResetEpoch: queue.resetEpoch,
    };
  }
  if (queue.contentVersion !== CONTENT_VERSION) {
    return retryable(response.status, "invalid-response");
  }

  await writeLearningProjection({
    ...queueScope(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    ),
    value: queue,
    updatedAt: new Date(requestStartedAt).toISOString(),
  });
  return { state: "updated", queue };
}
