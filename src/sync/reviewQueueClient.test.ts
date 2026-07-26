import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import {
  REVIEW_MODALITY,
  REVIEW_SCHEDULER_VERSION,
  reviewWordVersion,
  type ReviewQueueV1,
} from "../learning/reviewProtocol";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  readLearningProjection,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeLearningProjection,
  writeSyncMeta,
  type OwnerGeneration,
} from "./indexedDb";
import {
  fetchReviewQueue,
  readValidCachedReviewQueue,
  REVIEW_QUEUE_CACHE_KEY,
} from "./reviewQueueClient";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = new Date("2026-07-26T09:00:00.000Z");
const wordId = RELEASED_LESSONS[0]!.wordIds[0]!;

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), {
    once: true,
  });
});

const queue = (
  overrides: Partial<ReviewQueueV1> = {},
): ReviewQueueV1 => ({
  protocolVersion: 1,
  resetEpoch: 0,
  contentVersion: CONTENT_VERSION,
  schedulerVersion: REVIEW_SCHEDULER_VERSION,
  generatedAt: NOW.toISOString(),
  cards: [{
    cardId: "card-a",
    cardRevision: 1,
    wordId,
    wordVersion: reviewWordVersion(wordId),
    modality: REVIEW_MODALITY,
    dueAt: new Date(NOW.getTime() - 1_000).toISOString(),
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
  }],
  ...overrides,
});

const cacheScope = (
  expectedOwnerGeneration: OwnerGeneration,
  resetEpoch = 0,
) => ({
  expectedOwnerGeneration,
  resetEpoch,
  entryKey: REVIEW_QUEUE_CACHE_KEY,
});

const input = (
  expectedOwnerGeneration: OwnerGeneration,
  fetchImplementation: typeof fetch,
  expectedResetEpoch = 0,
) => ({
  expectedOwnerGeneration,
  expectedResetEpoch,
  fetch: fetchImplementation,
  origin: "https://hanzi.example",
  now: () => new Date(NOW),
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("review queue client", () => {
  it("fetches only the fixed same-origin endpoint and caches the strict queue", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const next = queue();
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify(next),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ));

    await expect(fetchReviewQueue(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", queue: next });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learning/reviews",
      {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    await expect(readLearningProjection<ReviewQueueV1>(
      cacheScope(owner),
    )).resolves.toMatchObject({
      value: next,
      updatedAt: NOW.toISOString(),
    });
  });

  it("exposes cached data only after strict parse and exact owner/reset matching", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const cached = queue();
    await writeLearningProjection({
      ...cacheScope(owner),
      value: cached,
      updatedAt: NOW.toISOString(),
    });
    await expect(readValidCachedReviewQueue(owner, 0)).resolves
      .toMatchObject({ value: cached });

    await writeLearningProjection<unknown>({
      ...cacheScope(owner),
      value: { ...cached, resetEpoch: 1 },
    });
    await expect(readValidCachedReviewQueue(owner, 0)).resolves.toBeNull();

    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
      ownerKey: "account:b",
      generation: 2,
    } satisfies OwnerGeneration);
    await expect(readValidCachedReviewQueue(owner, 0))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("rejects malformed and reset-mismatched network bodies without caching them", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const malformedFetch = vi.fn(async () => new Response(
      JSON.stringify({
        ...queue(),
        cards: [{ cardId: "forged-without-contract-fields" }],
      }),
      { status: 200 },
    ));
    await expect(fetchReviewQueue(input(
      owner,
      malformedFetch as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 200,
      reason: "invalid-response",
      retryAfterMs: 0,
    });
    await expect(readLearningProjection(cacheScope(owner))).resolves
      .toBeNull();

    const otherEpoch = queue({ resetEpoch: 1 });
    const resetFetch = vi.fn(async () => new Response(
      JSON.stringify(otherEpoch),
      { status: 200 },
    ));
    await expect(fetchReviewQueue(input(
      owner,
      resetFetch as typeof fetch,
    ))).resolves.toEqual({
      state: "reset-mismatch",
      expectedResetEpoch: 0,
      serverResetEpoch: 1,
    });
    await expect(readLearningProjection(cacheScope(owner))).resolves
      .toBeNull();
  });

  it("classifies authentication/content failures and the retryable reset race", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const authentication = vi.fn(async () => new Response(null, {
      status: 401,
    }));
    await expect(fetchReviewQueue(input(
      owner,
      authentication as typeof fetch,
    ))).resolves.toEqual({
      state: "permanent-unavailable",
      status: 401,
      reason: "authentication-required",
    });

    const unavailable = vi.fn(async () => new Response(JSON.stringify({
      error: { code: "REVIEW_QUEUE_UNAVAILABLE" },
    }), { status: 409 }));
    await expect(fetchReviewQueue(input(
      owner,
      unavailable as typeof fetch,
    ))).resolves.toEqual({
      state: "permanent-unavailable",
      status: 409,
      reason: "content-unavailable",
    });

    const resetRace = vi.fn(async () => new Response(JSON.stringify({
      error: { code: "REVIEW_QUEUE_RESET_RACE" },
    }), {
      status: 409,
      headers: { "Retry-After": "2" },
    }));
    await expect(fetchReviewQueue(input(
      owner,
      resetRace as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 409,
      reason: "reset-race",
      retryAfterMs: 2_000,
    });
  });

  it("returns bounded retry metadata for rate limits, server errors, and network failure", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const rateLimited = vi.fn(async () => new Response(null, {
      status: 429,
      headers: { "Retry-After": "999999999" },
    }));
    await expect(fetchReviewQueue(input(
      owner,
      rateLimited as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 429,
      reason: "rate-limited",
      retryAfterMs: 24 * 60 * 60_000,
    });

    const serverFailure = vi.fn(async () => new Response(null, {
      status: 503,
      headers: { "Retry-After": "3" },
    }));
    await expect(fetchReviewQueue(input(
      owner,
      serverFailure as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 503,
      reason: "server-unavailable",
      retryAfterMs: 3_000,
    });

    const networkFailure = vi.fn(async () => {
      throw new TypeError("offline");
    });
    await expect(fetchReviewQueue(input(
      owner,
      networkFailure as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: null,
      reason: "network-unavailable",
      retryAfterMs: 0,
    });
  });
});
