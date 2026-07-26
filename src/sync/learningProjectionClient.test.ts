import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  emptyObjectiveEvidenceProjection,
  LEARNING_PROJECTION_PROTOCOL_VERSION,
  LEARNING_PROJECTION_V2_MEDIA_TYPE,
  LEARNING_PROJECTION_V3_MEDIA_TYPE,
  LEARNING_PROJECTION_VERSION_HEADER,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
} from "../learning/projectionProtocol";
import {
  fetchNormalizedLearningProjection,
  fetchNormalizedLearningProjectionV2,
  fetchNormalizedLearningProjectionV3,
  LEARNING_PROJECTION_CURSOR_HEADER,
  LEARNING_PROJECTION_RESET_EPOCH_HEADER,
  NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
  NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
  NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
  readValidCachedNormalizedLearningProjection,
  readValidCachedNormalizedLearningProjectionV2,
  readValidCachedNormalizedLearningProjectionV3,
} from "./learningProjectionClient";
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

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = new Date("2026-07-22T01:00:00.000Z");

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const projection = (
  overrides: Partial<NormalizedLearningProjectionV1> = {},
): NormalizedLearningProjectionV1 => ({
  protocolVersion: LEARNING_PROJECTION_PROTOCOL_VERSION,
  resetEpoch: 0,
  cursor: 7,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: null,
  activeLessonSessions: [],
  submittedLessons: [],
  objectiveEvidence: emptyObjectiveEvidenceProjection(),
  ...overrides,
});

const projectionV2 = (
  overrides: Partial<NormalizedLearningProjectionV2> = {},
): NormalizedLearningProjectionV2 => ({
  ...projection(),
  protocolVersion: 2,
  activeAssessmentSession: null,
  latestAssessmentResult: null,
  ...overrides,
});

const projectionV3 = (
  overrides: Partial<NormalizedLearningProjectionV3> = {},
): NormalizedLearningProjectionV3 => ({
  ...projectionV2(),
  protocolVersion: 3,
  activeReaderSession: null,
  ...overrides,
});

const projectionHeaders = (
  resetEpoch: number,
  cursor: number,
  version?: 1 | 2 | 3,
) => ({
  [LEARNING_PROJECTION_RESET_EPOCH_HEADER]: String(resetEpoch),
  [LEARNING_PROJECTION_CURSOR_HEADER]: String(cursor),
  ...(version === undefined
    ? {}
    : { [LEARNING_PROJECTION_VERSION_HEADER]: String(version) }),
  "Content-Type": "application/json",
});

const projectionResponse = (
  value: unknown,
  resetEpoch: number,
  cursor: number,
  version?: 1 | 2 | 3,
) => new Response(JSON.stringify(value), {
  status: 200,
  headers: projectionHeaders(resetEpoch, cursor, version),
});

const cacheScope = (
  expectedOwnerGeneration: OwnerGeneration,
  resetEpoch = 0,
  entryKey: string = NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
) => ({
  expectedOwnerGeneration,
  resetEpoch,
  entryKey,
});

const seedProjection = (
  ownerGeneration: OwnerGeneration,
  value = projection(),
) => writeLearningProjection({
  ...cacheScope(ownerGeneration, value.resetEpoch),
  value,
  updatedAt: NOW.toISOString(),
});

const seedProjectionV2 = (
  ownerGeneration: OwnerGeneration,
  value = projectionV2(),
) => writeLearningProjection({
  ...cacheScope(
    ownerGeneration,
    value.resetEpoch,
    NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
  ),
  value,
  updatedAt: NOW.toISOString(),
});

const seedProjectionV3 = (
  ownerGeneration: OwnerGeneration,
  value = projectionV3(),
) => writeLearningProjection({
  ...cacheScope(
    ownerGeneration,
    value.resetEpoch,
    NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
  ),
  value,
  updatedAt: NOW.toISOString(),
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

describe("normalized learning projection client", () => {
  it("fetches the fixed same-origin endpoint and caches an exact projection", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const next = projection();
    const fetchMock = vi.fn(async () => projectionResponse(
      next,
      next.resetEpoch,
      next.cursor,
    ));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: next });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learning/projection",
      {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    await expect(readLearningProjection<NormalizedLearningProjectionV1>(
      cacheScope(owner),
    )).resolves.toMatchObject({
      value: next,
      updatedAt: NOW.toISOString(),
    });
  });

  it("uses the cached cursor and accepts 304 only with matching cache headers", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const cached = projection({ cursor: 12 });
    await seedProjection(owner, cached);
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(null, {
      status: 304,
      headers: projectionHeaders(cached.resetEpoch, cached.cursor),
    }));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "not-modified", projection: cached });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/learning/projection?afterCursor=12",
    );
  });

  it("rejects 304 without a valid cache or with a mismatched cursor", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const noCacheFetch = vi.fn(async () => new Response(null, {
      status: 304,
      headers: projectionHeaders(0, 0),
    }));
    await expect(fetchNormalizedLearningProjection(input(
      owner,
      noCacheFetch as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 304,
      reason: "invalid-response",
      retryAfterMs: 0,
    });

    await seedProjection(owner, projection({ cursor: 3 }));
    const wrongCursorFetch = vi.fn(async () => new Response(null, {
      status: 304,
      headers: projectionHeaders(0, 4),
    }));
    await expect(fetchNormalizedLearningProjection(input(
      owner,
      wrongCursorFetch as typeof fetch,
    ))).resolves.toMatchObject({
      state: "retryable",
      reason: "invalid-response",
    });
  });

  it("returns an explicit reset mismatch and never caches a mixed epoch", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const cached = projection({ cursor: 2 });
    await seedProjection(owner, cached);
    const server = projection({ resetEpoch: 1, cursor: 1 });
    const fetchMock = vi.fn(async () => projectionResponse(server, 1, 1));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({
      state: "reset-mismatch",
      expectedResetEpoch: 0,
      serverResetEpoch: 1,
    });
    await expect(readLearningProjection<NormalizedLearningProjectionV1>(
      cacheScope(owner, 0),
    )).resolves.toMatchObject({ value: cached });
    await expect(readLearningProjection(
      cacheScope(owner, 1),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("surfaces a reset mismatch from 304 headers without returning cached data", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await seedProjection(owner, projection({ cursor: 2 }));
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 304,
      headers: projectionHeaders(1, 2),
    }));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({
      state: "reset-mismatch",
      expectedResetEpoch: 0,
      serverResetEpoch: 1,
    });
  });

  it.each([
    ["content version", { contentVersion: "other-content" }],
    ["manifest", { manifestSha256: `sha256:${"f".repeat(64)}` }],
    ["protocol", { protocolVersion: 2 }],
  ] as const)("rejects a 200 response with the wrong %s", async (_label, change) => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const invalid = { ...projection(), ...change };
    const fetchMock = vi.fn(async () => projectionResponse(
      invalid,
      invalid.resetEpoch,
      invalid.cursor,
    ));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 200,
      reason: "invalid-response",
      retryAfterMs: 0,
    });
    await expect(readLearningProjection(cacheScope(owner))).resolves.toBeNull();
  });

  it("requires 200 cursor and epoch headers to match the parsed body", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const next = projection({ cursor: 8 });
    const fetchMock = vi.fn(async () => projectionResponse(next, 0, 9));
    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toMatchObject({
      state: "retryable",
      reason: "invalid-response",
    });
    await expect(readLearningProjection(cacheScope(owner))).resolves.toBeNull();
  });

  it("ignores a malformed cache instead of sending its cursor", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await writeLearningProjection<unknown>({
      ...cacheScope(owner),
      value: { cursor: 999, resetEpoch: 0 },
    });
    const next = projection({ cursor: 1 });
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => projectionResponse(next, 0, 1));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: next });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/learning/projection");
  });

  it("exposes only an exact owner/reset/content/manifest cache record", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const current = projection({ cursor: 17 });
    await seedProjection(owner, current);

    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      current.resetEpoch,
    )).resolves.toMatchObject({ value: current });

    await writeLearningProjection<unknown>({
      ...cacheScope(owner),
      value: {
        ...current,
        manifestSha256: `sha256:${"f".repeat(64)}`,
      },
    });
    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      current.resetEpoch,
    )).resolves.toBeNull();
  });

  it("keeps strict cache reads behind the active owner generation fence", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await seedProjection(owner);
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
      ownerKey: "account:b",
      generation: 2,
    } satisfies OwnerGeneration);

    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      0,
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it.each([
    [401, "authentication-required"],
    [409, "content-unavailable"],
  ] as const)("classifies HTTP %i as permanent-unavailable", async (status, reason) => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      privateServerMessage: "must not escape",
    }), { status }));

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({
      state: "permanent-unavailable",
      status,
      reason,
    });
  });

  it.each([500, 503])("classifies HTTP %i as retryable", async (status) => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const fetchMock = vi.fn(async () => new Response(null, { status }));
    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status,
      reason: "server-unavailable",
      retryAfterMs: 0,
    });
  });

  it("classifies 429 with bounded Retry-After and network failures as retryable", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const throttled = vi.fn(async () => new Response(null, {
      status: 429,
      headers: { "Retry-After": "4" },
    }));
    await expect(fetchNormalizedLearningProjection(input(
      owner,
      throttled as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: 429,
      reason: "rate-limited",
      retryAfterMs: 4_000,
    });

    const offline = vi.fn(async () => {
      throw new TypeError("offline with sensitive browser detail");
    });
    await expect(fetchNormalizedLearningProjection(input(
      owner,
      offline as typeof fetch,
    ))).resolves.toEqual({
      state: "retryable",
      status: null,
      reason: "network-unavailable",
      retryAfterMs: 0,
    });
  });

  it("aborts the cache write when owner generation changes during fetch", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const next = projection();
    const fetchMock = vi.fn(async () => {
      await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
        ownerKey: "account:b",
        generation: 2,
      } satisfies OwnerGeneration);
      return projectionResponse(next, next.resetEpoch, next.cursor);
    });

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("revalidates owner generation before returning a cached 304 projection", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const cached = projection({ cursor: 14 });
    await seedProjection(owner, cached);
    const fetchMock = vi.fn(async () => {
      await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
        ownerKey: "account:b",
        generation: 2,
      } satisfies OwnerGeneration);
      return new Response(null, {
        status: 304,
        headers: projectionHeaders(cached.resetEpoch, cached.cursor),
      });
    });

    await expect(fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ))).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("serializes concurrent revalidation so an older response cannot overwrite a newer cursor", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const firstProjection = projection({ cursor: 1 });
    const secondProjection = projection({ cursor: 2 });
    let releaseFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => firstResponse)
      .mockImplementationOnce(async () => projectionResponse(
        secondProjection,
        secondProjection.resetEpoch,
        secondProjection.cursor,
      ));

    const first = fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const second = fetchNormalizedLearningProjection(input(
      owner,
      fetchMock as typeof fetch,
    ));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    releaseFirst(projectionResponse(
      firstProjection,
      firstProjection.resetEpoch,
      firstProjection.cursor,
    ));
    await expect(first).resolves.toEqual({
      state: "updated",
      projection: firstProjection,
    });
    await expect(second).resolves.toEqual({
      state: "updated",
      projection: secondProjection,
    });
    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      0,
    )).resolves.toMatchObject({ value: secondProjection });
  });

  it("requests V2 explicitly and atomically maintains distinct V1/V2 caches", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:v2"))
      .ownerGeneration;
    await seedProjection(owner, projection({ cursor: 4 }));
    const next = projectionV2({ cursor: 7 });
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => projectionResponse(
      next,
      next.resetEpoch,
      next.cursor,
      2,
    ));

    await expect(fetchNormalizedLearningProjectionV2(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: next });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, requestInit] = fetchMock.mock.calls[0]!;
    expect(String(requestUrl)).toBe("/api/learning/projection");
    expect(requestInit).toMatchObject({
      headers: { Accept: LEARNING_PROJECTION_V2_MEDIA_TYPE },
    });
    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      0,
    )).resolves.toMatchObject({
      value: { protocolVersion: 1, cursor: next.cursor },
    });
    await expect(readValidCachedNormalizedLearningProjectionV2(
      owner,
      0,
    )).resolves.toMatchObject({ value: next });
  });

  it("accepts a V2 304 only against an exact V2 cache and version header", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:v2-304"))
      .ownerGeneration;
    const cached = projectionV2({ cursor: 11 });
    await seedProjectionV2(owner, cached);
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(null, {
      status: 304,
      headers: projectionHeaders(
        cached.resetEpoch,
        cached.cursor,
        2,
      ),
    }));

    await expect(fetchNormalizedLearningProjectionV2(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "not-modified", projection: cached });
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      `/api/learning/projection?afterCursor=${cached.cursor}`,
    );
  });

  it("keeps the newest V2 cursor even when Web Locks are unavailable", async () => {
    vi.stubGlobal("navigator", { locks: undefined });
    const owner = (await readOrInitializeOwnerGeneration("account:v2-race"))
      .ownerGeneration;
    const older = projectionV2({ cursor: 1 });
    const newer = projectionV2({ cursor: 2 });
    let releaseOlder!: (response: Response) => void;
    const olderResponse = new Promise<Response>((resolve) => {
      releaseOlder = resolve;
    });
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => olderResponse)
      .mockImplementationOnce(async () => projectionResponse(
        newer,
        newer.resetEpoch,
        newer.cursor,
        2,
      ));

    const first = fetchNormalizedLearningProjectionV2(input(
      owner,
      fetchMock as typeof fetch,
    ));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await expect(fetchNormalizedLearningProjectionV2(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: newer });
    releaseOlder(projectionResponse(
      older,
      older.resetEpoch,
      older.cursor,
      2,
    ));
    await expect(first).resolves.toEqual({
      state: "not-modified",
      projection: newer,
    });
    await expect(readValidCachedNormalizedLearningProjectionV2(
      owner,
      0,
    )).resolves.toMatchObject({ value: newer });
    await expect(readLearningProjection<unknown>(
      cacheScope(owner, 0, NORMALIZED_LEARNING_PROJECTION_CACHE_KEY),
    )).resolves.toMatchObject({ value: { cursor: newer.cursor } });
  });

  it("requests V3 and atomically maintains exact V1/V2/V3 cache views", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:v3"))
      .ownerGeneration;
    const next = projectionV3({ cursor: 19 });
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => projectionResponse(
      next,
      next.resetEpoch,
      next.cursor,
      3,
    ));

    await expect(fetchNormalizedLearningProjectionV3(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: next });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/learning/projection",
    );
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      headers: { Accept: LEARNING_PROJECTION_V3_MEDIA_TYPE },
    });

    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      0,
    )).resolves.toMatchObject({
      value: {
        protocolVersion: 1,
        cursor: next.cursor,
      },
      updatedAt: NOW.toISOString(),
    });
    await expect(readValidCachedNormalizedLearningProjectionV2(
      owner,
      0,
    )).resolves.toMatchObject({
      value: {
        protocolVersion: 2,
        cursor: next.cursor,
        activeAssessmentSession: next.activeAssessmentSession,
      },
      updatedAt: NOW.toISOString(),
    });
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      0,
    )).resolves.toMatchObject({
      value: next,
      updatedAt: NOW.toISOString(),
    });
  });

  it("accepts V3 304 only against the exact owner/reset V3 cache and version", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:v3-304"))
      .ownerGeneration;
    const cached = projectionV3({ cursor: 23 });
    await seedProjectionV3(owner, cached);
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => new Response(null, {
      status: 304,
      headers: projectionHeaders(
        cached.resetEpoch,
        cached.cursor,
        3,
      ),
    }));

    await expect(fetchNormalizedLearningProjectionV3(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "not-modified", projection: cached });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `/api/learning/projection?afterCursor=${cached.cursor}`,
    );

    const wrongVersion = vi.fn(async () => new Response(null, {
      status: 304,
      headers: projectionHeaders(
        cached.resetEpoch,
        cached.cursor,
        2,
      ),
    }));
    await expect(fetchNormalizedLearningProjectionV3(input(
      owner,
      wrongVersion as typeof fetch,
    ))).resolves.toMatchObject({
      state: "retryable",
      reason: "invalid-response",
    });
  });

  it("exposes a V3 cache only for the exact owner, reset, and content package", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:v3-scope"))
      .ownerGeneration;
    const current = projectionV3({ cursor: 24 });
    await seedProjectionV3(owner, current);
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      0,
    )).resolves.toMatchObject({ value: current });
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      1,
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await writeLearningProjection<unknown>({
      ...cacheScope(
        owner,
        0,
        NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
      ),
      value: {
        ...current,
        contentVersion: "other-content-package",
      },
      updatedAt: NOW.toISOString(),
    });
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      0,
    )).resolves.toBeNull();

    await seedProjectionV3(owner, current);
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
      ownerKey: "account:other",
      generation: 2,
    } satisfies OwnerGeneration);
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      0,
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("ignores a poisoned high-cursor V3 cache and replaces all three views atomically", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:v3-poison"))
      .ownerGeneration;
    await writeLearningProjection<unknown>({
      ...cacheScope(
        owner,
        0,
        NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
      ),
      value: {
        ...projectionV3({ cursor: 999 }),
        selectedOption: "poisoned-answer",
      },
      updatedAt: NOW.toISOString(),
    });
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      0,
    )).resolves.toBeNull();

    const next = projectionV3({ cursor: 1 });
    const fetchMock = vi.fn(async (
      _request: RequestInfo | URL,
      _init?: RequestInit,
    ) => projectionResponse(
      next,
      next.resetEpoch,
      next.cursor,
      3,
    ));
    await expect(fetchNormalizedLearningProjectionV3(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: next });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "/api/learning/projection",
    );
    await expect(readValidCachedNormalizedLearningProjection(
      owner,
      0,
    )).resolves.toMatchObject({ value: { cursor: 1 } });
    await expect(readValidCachedNormalizedLearningProjectionV2(
      owner,
      0,
    )).resolves.toMatchObject({ value: { cursor: 1 } });
    await expect(readValidCachedNormalizedLearningProjectionV3(
      owner,
      0,
    )).resolves.toMatchObject({ value: next });
  });

  it("keeps the newest atomic V3 cache set when Web Locks are unavailable", async () => {
    vi.stubGlobal("navigator", { locks: undefined });
    const owner = (await readOrInitializeOwnerGeneration("account:v3-race"))
      .ownerGeneration;
    const older = projectionV3({ cursor: 2 });
    const newer = projectionV3({ cursor: 3 });
    let releaseOlder!: (response: Response) => void;
    const olderResponse = new Promise<Response>((resolve) => {
      releaseOlder = resolve;
    });
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => olderResponse)
      .mockImplementationOnce(async () => projectionResponse(
        newer,
        newer.resetEpoch,
        newer.cursor,
        3,
      ));

    const first = fetchNormalizedLearningProjectionV3(input(
      owner,
      fetchMock as typeof fetch,
    ));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await expect(fetchNormalizedLearningProjectionV3(input(
      owner,
      fetchMock as typeof fetch,
    ))).resolves.toEqual({ state: "updated", projection: newer });
    releaseOlder(projectionResponse(
      older,
      older.resetEpoch,
      older.cursor,
      3,
    ));
    await expect(first).resolves.toEqual({
      state: "not-modified",
      projection: newer,
    });

    for (const entryKey of [
      NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
      NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
      NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
    ]) {
      await expect(readLearningProjection<unknown>(
        cacheScope(owner, 0, entryKey),
      )).resolves.toMatchObject({ value: { cursor: newer.cursor } });
    }
  });
});
