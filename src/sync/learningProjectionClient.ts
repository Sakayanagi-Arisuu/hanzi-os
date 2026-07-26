import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  LEARNING_PROJECTION_V2_MEDIA_TYPE,
  LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
  LEARNING_PROJECTION_V3_MEDIA_TYPE,
  LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
  LEARNING_PROJECTION_VERSION_HEADER,
  parseNormalizedLearningProjection,
  parseNormalizedLearningProjectionV2,
  parseNormalizedLearningProjectionV3,
  toNormalizedLearningProjectionV1,
  toNormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
} from "../learning/projectionProtocol";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import {
  readLearningProjection,
  writeLearningProjectionBatchWithMonotonicCursor,
  type OwnerGeneration,
  type OwnerScopedCacheRecord,
} from "./indexedDb";

export const NORMALIZED_LEARNING_PROJECTION_ENDPOINT =
  "/api/learning/projection" as const;
export const NORMALIZED_LEARNING_PROJECTION_CACHE_KEY =
  "normalized-learning-projection-v1" as const;
export const NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY =
  "normalized-learning-projection-v2" as const;
export const NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY =
  "normalized-learning-projection-v3" as const;
export const LEARNING_PROJECTION_CURSOR_HEADER =
  "x-learning-projection-cursor" as const;
export const LEARNING_PROJECTION_RESET_EPOCH_HEADER =
  "x-learning-reset-epoch" as const;
export const NORMALIZED_LEARNING_PROJECTION_LOCK_NAME =
  "hanzi-os-learning-projection-v1" as const;

export type FetchNormalizedLearningProjectionInput = {
  expectedOwnerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  fetch?: typeof fetch;
  origin?: string;
  now?: () => Date;
};

export type FetchNormalizedLearningProjectionResult =
  | {
      state: "updated";
      projection: NormalizedLearningProjectionV1;
    }
  | {
      state: "not-modified";
      projection: NormalizedLearningProjectionV1;
    }
  | {
      state: "reset-mismatch";
      expectedResetEpoch: number;
      serverResetEpoch: number;
    }
  | {
      state: "permanent-unavailable";
      status: number;
      reason: "authentication-required" | "content-unavailable" | "request-rejected";
    }
  | {
      state: "retryable";
      status: number | null;
      reason:
        | "network-unavailable"
        | "rate-limited"
        | "server-unavailable"
        | "invalid-response";
      retryAfterMs: number;
    };

export type FetchNormalizedLearningProjectionV2Result =
  | {
      state: "updated";
      projection: NormalizedLearningProjectionV2;
    }
  | {
      state: "not-modified";
      projection: NormalizedLearningProjectionV2;
    }
  | Extract<
      FetchNormalizedLearningProjectionResult,
      { state: "reset-mismatch" | "permanent-unavailable" | "retryable" }
    >;

export type FetchNormalizedLearningProjectionV3Result =
  | {
      state: "updated";
      projection: NormalizedLearningProjectionV3;
    }
  | {
      state: "not-modified";
      projection: NormalizedLearningProjectionV3;
    }
  | Extract<
      FetchNormalizedLearningProjectionResult,
      { state: "reset-mismatch" | "permanent-unavailable" | "retryable" }
    >;

export type ValidCachedNormalizedLearningProjection = OwnerScopedCacheRecord<
  NormalizedLearningProjectionV1
>;

export type ValidCachedNormalizedLearningProjectionV2 = OwnerScopedCacheRecord<
  NormalizedLearningProjectionV2
>;

export type ValidCachedNormalizedLearningProjectionV3 = OwnerScopedCacheRecord<
  NormalizedLearningProjectionV3
>;

const safeNonNegativeInteger = (value: string | null) => {
  if (value === null || !/^(0|[1-9]\d*)$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
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

const projectionScope = (
  expectedOwnerGeneration: OwnerGeneration,
  expectedResetEpoch: number,
  entryKey: string = NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
) => ({
  expectedOwnerGeneration,
  resetEpoch: expectedResetEpoch,
  entryKey,
});

const validExactProjection = (
  value: unknown,
  expectedResetEpoch: number,
) => {
  const parsed = parseNormalizedLearningProjection(value);
  if (
    !parsed.ok
    || parsed.projection.resetEpoch !== expectedResetEpoch
    || parsed.projection.contentVersion !== CONTENT_VERSION
    || parsed.projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
  ) return null;
  return parsed.projection;
};

const validExactProjectionV2 = (
  value: unknown,
  expectedResetEpoch: number,
) => {
  const parsed = parseNormalizedLearningProjectionV2(value);
  if (
    !parsed.ok
    || parsed.projection.resetEpoch !== expectedResetEpoch
    || parsed.projection.contentVersion !== CONTENT_VERSION
    || parsed.projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
  ) return null;
  return parsed.projection;
};

const validExactProjectionV3 = (
  value: unknown,
  expectedResetEpoch: number,
) => {
  const parsed = parseNormalizedLearningProjectionV3(value);
  if (
    !parsed.ok
    || parsed.projection.resetEpoch !== expectedResetEpoch
    || parsed.projection.contentVersion !== CONTENT_VERSION
    || parsed.projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
  ) return null;
  return parsed.projection;
};

const validCachedProjectionCursor = (
  entryKey: string,
  value: unknown,
  expectedResetEpoch: number,
) => {
  const projection = entryKey === NORMALIZED_LEARNING_PROJECTION_CACHE_KEY
    ? validExactProjection(value, expectedResetEpoch)
    : entryKey === NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY
      ? validExactProjectionV2(value, expectedResetEpoch)
      : entryKey === NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY
        ? validExactProjectionV3(value, expectedResetEpoch)
      : null;
  return projection?.cursor ?? null;
};

export const readValidCachedNormalizedLearningProjection = async (
  expectedOwnerGeneration: OwnerGeneration,
  expectedResetEpoch: number,
): Promise<ValidCachedNormalizedLearningProjection | null> => {
  if (!isValidLearningResetEpoch(expectedResetEpoch)) {
    throw new Error("Expected learning reset epoch is invalid.");
  }
  const record = await readLearningProjection<unknown>(projectionScope(
    expectedOwnerGeneration,
    expectedResetEpoch,
  ));
  if (!record) return null;
  const projection = validExactProjection(record.value, expectedResetEpoch);
  return projection ? { ...record, value: projection } : null;
};

export const readValidCachedNormalizedLearningProjectionV2 = async (
  expectedOwnerGeneration: OwnerGeneration,
  expectedResetEpoch: number,
): Promise<ValidCachedNormalizedLearningProjectionV2 | null> => {
  if (!isValidLearningResetEpoch(expectedResetEpoch)) {
    throw new Error("Expected learning reset epoch is invalid.");
  }
  const record = await readLearningProjection<unknown>(projectionScope(
    expectedOwnerGeneration,
    expectedResetEpoch,
    NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
  ));
  if (!record) return null;
  const projection = validExactProjectionV2(record.value, expectedResetEpoch);
  return projection ? { ...record, value: projection } : null;
};

export const readValidCachedNormalizedLearningProjectionV3 = async (
  expectedOwnerGeneration: OwnerGeneration,
  expectedResetEpoch: number,
): Promise<ValidCachedNormalizedLearningProjectionV3 | null> => {
  if (!isValidLearningResetEpoch(expectedResetEpoch)) {
    throw new Error("Expected learning reset epoch is invalid.");
  }
  const record = await readLearningProjection<unknown>(projectionScope(
    expectedOwnerGeneration,
    expectedResetEpoch,
    NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
  ));
  if (!record) return null;
  const projection = validExactProjectionV3(
    record.value,
    expectedResetEpoch,
  );
  return projection ? { ...record, value: projection } : null;
};

const retryable = (
  status: number | null,
  reason: Extract<
    FetchNormalizedLearningProjectionResult,
    { state: "retryable" }
  >["reason"],
  delay = 0,
): FetchNormalizedLearningProjectionResult => ({
  state: "retryable",
  status,
  reason,
  retryAfterMs: delay,
});

const responseEpochAndCursor = (response: Response) => ({
  resetEpoch: safeNonNegativeInteger(
    response.headers.get(LEARNING_PROJECTION_RESET_EPOCH_HEADER),
  ),
  cursor: safeNonNegativeInteger(
    response.headers.get(LEARNING_PROJECTION_CURSOR_HEADER),
  ),
});

async function fetchNormalizedLearningProjectionUnlocked(
  input: FetchNormalizedLearningProjectionInput,
): Promise<FetchNormalizedLearningProjectionResult> {
  if (!isValidLearningResetEpoch(input.expectedResetEpoch)) {
    throw new Error("Expected learning reset epoch is invalid.");
  }
  const now = input.now ?? (() => new Date());
  const requestStartedAt = now().getTime();
  if (Number.isNaN(requestStartedAt)) {
    throw new Error("Learning projection client clock is invalid.");
  }
  const cached = await readValidCachedNormalizedLearningProjection(
    input.expectedOwnerGeneration,
    input.expectedResetEpoch,
  );
  const currentOrigin = input.origin
    ?? (typeof location === "undefined" ? null : location.origin);
  if (!currentOrigin) {
    throw new Error("Current origin is required for learning projection fetch.");
  }
  const origin = new URL(currentOrigin).origin;
  const endpoint = new URL(NORMALIZED_LEARNING_PROJECTION_ENDPOINT, origin);
  if (
    endpoint.origin !== origin
    || endpoint.pathname !== NORMALIZED_LEARNING_PROJECTION_ENDPOINT
    || endpoint.username
    || endpoint.password
  ) {
    throw new Error("Learning projection endpoint must remain same-origin.");
  }
  if (cached) endpoint.searchParams.set("afterCursor", String(cached.value.cursor));

  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(
      `${endpoint.pathname}${endpoint.search}`,
      {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
  } catch {
    return retryable(null, "network-unavailable");
  }

  if (response.status === 401 || response.status === 409) {
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason: response.status === 401
        ? "authentication-required"
        : "content-unavailable",
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
    return retryable(response.status, "server-unavailable");
  }

  const headers = responseEpochAndCursor(response);
  if (response.status === 304) {
    if (headers.resetEpoch !== null && headers.resetEpoch !== input.expectedResetEpoch) {
      return {
        state: "reset-mismatch",
        expectedResetEpoch: input.expectedResetEpoch,
        serverResetEpoch: headers.resetEpoch,
      };
    }
    if (
      !cached
      || headers.resetEpoch !== input.expectedResetEpoch
      || headers.cursor !== cached.value.cursor
    ) {
      return retryable(response.status, "invalid-response");
    }
    // Re-read after the network boundary so a tab that changed owner/reset
    // cannot receive data authorized by an earlier generation.
    const currentCached = await readValidCachedNormalizedLearningProjection(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    );
    if (!currentCached || currentCached.value.cursor !== headers.cursor) {
      return retryable(response.status, "invalid-response");
    }
    return { state: "not-modified", projection: currentCached.value };
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
  const parsed = parseNormalizedLearningProjection(body);
  if (!parsed.ok) return retryable(response.status, "invalid-response");
  const projection = parsed.projection;
  if (projection.resetEpoch !== input.expectedResetEpoch) {
    return {
      state: "reset-mismatch",
      expectedResetEpoch: input.expectedResetEpoch,
      serverResetEpoch: projection.resetEpoch,
    };
  }
  if (
    projection.contentVersion !== CONTENT_VERSION
    || projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || headers.resetEpoch !== projection.resetEpoch
    || headers.cursor !== projection.cursor
    || (cached !== null && projection.cursor < cached.value.cursor)
  ) {
    return retryable(response.status, "invalid-response");
  }

  const cacheWrite = await writeLearningProjectionBatchWithMonotonicCursor(
    {
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.expectedResetEpoch,
      entries: [{
        entryKey: NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
        value: projection,
      }],
      updatedAt: new Date(requestStartedAt).toISOString(),
    },
    (entryKey, value) => validCachedProjectionCursor(
      entryKey,
      value,
      input.expectedResetEpoch,
    ),
  );
  if (!cacheWrite.written) {
    const current = await readValidCachedNormalizedLearningProjection(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    );
    return current && current.value.cursor >= projection.cursor
      ? { state: "not-modified", projection: current.value }
      : retryable(response.status, "invalid-response");
  }
  return { state: "updated", projection };
}

/**
 * Serializes projection revalidation across tabs. Owner/reset CAS still guards
 * every cache transaction; this lock additionally prevents a slower response
 * with an older cursor from overwriting a newer response for the same scope.
 */
export async function fetchNormalizedLearningProjection(
  input: FetchNormalizedLearningProjectionInput,
): Promise<FetchNormalizedLearningProjectionResult> {
  const lockManager = typeof navigator === "undefined"
    ? null
    : navigator.locks;
  if (!lockManager) return fetchNormalizedLearningProjectionUnlocked(input);
  return lockManager.request(
    NORMALIZED_LEARNING_PROJECTION_LOCK_NAME,
    { mode: "exclusive" },
    () => fetchNormalizedLearningProjectionUnlocked(input),
  );
}

const retryableV2 = (
  status: number | null,
  reason: Extract<
    FetchNormalizedLearningProjectionV2Result,
    { state: "retryable" }
  >["reason"],
  delay = 0,
): FetchNormalizedLearningProjectionV2Result => ({
  state: "retryable",
  status,
  reason,
  retryAfterMs: delay,
});

async function fetchNormalizedLearningProjectionV2Unlocked(
  input: FetchNormalizedLearningProjectionInput,
): Promise<FetchNormalizedLearningProjectionV2Result> {
  if (!isValidLearningResetEpoch(input.expectedResetEpoch)) {
    throw new Error("Expected learning reset epoch is invalid.");
  }
  const now = input.now ?? (() => new Date());
  const requestStartedAt = now().getTime();
  if (Number.isNaN(requestStartedAt)) {
    throw new Error("Learning projection client clock is invalid.");
  }
  // A V1 cursor can describe a different representation at the same global
  // sequence. Only a validated V2 cache may authorize a V2 304 response.
  const cached = await readValidCachedNormalizedLearningProjectionV2(
    input.expectedOwnerGeneration,
    input.expectedResetEpoch,
  );
  const currentOrigin = input.origin
    ?? (typeof location === "undefined" ? null : location.origin);
  if (!currentOrigin) {
    throw new Error("Current origin is required for learning projection fetch.");
  }
  const origin = new URL(currentOrigin).origin;
  const endpoint = new URL(NORMALIZED_LEARNING_PROJECTION_ENDPOINT, origin);
  if (
    endpoint.origin !== origin
    || endpoint.pathname !== NORMALIZED_LEARNING_PROJECTION_ENDPOINT
    || endpoint.username
    || endpoint.password
  ) {
    throw new Error("Learning projection endpoint must remain same-origin.");
  }
  if (cached) endpoint.searchParams.set("afterCursor", String(cached.value.cursor));

  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(
      `${endpoint.pathname}${endpoint.search}`,
      {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: { Accept: LEARNING_PROJECTION_V2_MEDIA_TYPE },
      },
    );
  } catch {
    return retryableV2(null, "network-unavailable");
  }

  if (response.status === 401 || response.status === 409) {
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason: response.status === 401
        ? "authentication-required"
        : "content-unavailable",
    };
  }
  if (response.status === 429) {
    return retryableV2(
      response.status,
      "rate-limited",
      retryAfterMs(response.headers.get("Retry-After"), requestStartedAt),
    );
  }
  if (response.status >= 500 && response.status <= 599) {
    return retryableV2(response.status, "server-unavailable");
  }

  const headers = responseEpochAndCursor(response);
  const responseVersion = safeNonNegativeInteger(
    response.headers.get(LEARNING_PROJECTION_VERSION_HEADER),
  );
  if (response.status === 304) {
    if (headers.resetEpoch !== null && headers.resetEpoch !== input.expectedResetEpoch) {
      return {
        state: "reset-mismatch",
        expectedResetEpoch: input.expectedResetEpoch,
        serverResetEpoch: headers.resetEpoch,
      };
    }
    if (
      !cached
      || responseVersion !== LEARNING_PROJECTION_V2_PROTOCOL_VERSION
      || headers.resetEpoch !== input.expectedResetEpoch
      || headers.cursor !== cached.value.cursor
    ) {
      return retryableV2(response.status, "invalid-response");
    }
    const currentCached = await readValidCachedNormalizedLearningProjectionV2(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    );
    if (!currentCached || currentCached.value.cursor !== headers.cursor) {
      return retryableV2(response.status, "invalid-response");
    }
    return { state: "not-modified", projection: currentCached.value };
  }

  if (response.status !== 200) {
    return response.status >= 400 && response.status <= 499
      ? {
          state: "permanent-unavailable",
          status: response.status,
          reason: "request-rejected",
        }
      : retryableV2(response.status, "invalid-response");
  }

  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    return retryableV2(response.status, "invalid-response");
  }
  const parsed = parseNormalizedLearningProjectionV2(body);
  if (!parsed.ok) return retryableV2(response.status, "invalid-response");
  const projection = parsed.projection;
  if (projection.resetEpoch !== input.expectedResetEpoch) {
    return {
      state: "reset-mismatch",
      expectedResetEpoch: input.expectedResetEpoch,
      serverResetEpoch: projection.resetEpoch,
    };
  }
  if (
    responseVersion !== LEARNING_PROJECTION_V2_PROTOCOL_VERSION
    || projection.contentVersion !== CONTENT_VERSION
    || projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || headers.resetEpoch !== projection.resetEpoch
    || headers.cursor !== projection.cursor
    || (cached !== null && projection.cursor < cached.value.cursor)
  ) {
    return retryableV2(response.status, "invalid-response");
  }

  const updatedAt = new Date(requestStartedAt).toISOString();
  // Keep the strict V1 entry usable by old bundles, but never place a V2 body
  // under the legacy key. The shared lock serializes cross-version tabs.
  const cacheWrite = await writeLearningProjectionBatchWithMonotonicCursor<
    NormalizedLearningProjectionV1 | NormalizedLearningProjectionV2
  >(
    {
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.expectedResetEpoch,
      entries: [{
        entryKey: NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
        value: toNormalizedLearningProjectionV1(projection),
      }, {
        entryKey: NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
        value: projection,
      }],
      updatedAt,
    },
    (entryKey, value) => validCachedProjectionCursor(
      entryKey,
      value,
      input.expectedResetEpoch,
    ),
  );
  if (!cacheWrite.written) {
    const current = await readValidCachedNormalizedLearningProjectionV2(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    );
    return current && current.value.cursor >= projection.cursor
      ? { state: "not-modified", projection: current.value }
      : retryableV2(response.status, "invalid-response");
  }
  return { state: "updated", projection };
}

export async function fetchNormalizedLearningProjectionV2(
  input: FetchNormalizedLearningProjectionInput,
): Promise<FetchNormalizedLearningProjectionV2Result> {
  const lockManager = typeof navigator === "undefined"
    ? null
    : navigator.locks;
  if (!lockManager) return fetchNormalizedLearningProjectionV2Unlocked(input);
  return lockManager.request(
    NORMALIZED_LEARNING_PROJECTION_LOCK_NAME,
    { mode: "exclusive" },
    () => fetchNormalizedLearningProjectionV2Unlocked(input),
  );
}

const retryableV3 = (
  status: number | null,
  reason: Extract<
    FetchNormalizedLearningProjectionV3Result,
    { state: "retryable" }
  >["reason"],
  delay = 0,
): FetchNormalizedLearningProjectionV3Result => ({
  state: "retryable",
  status,
  reason,
  retryAfterMs: delay,
});

async function fetchNormalizedLearningProjectionV3Unlocked(
  input: FetchNormalizedLearningProjectionInput,
): Promise<FetchNormalizedLearningProjectionV3Result> {
  if (!isValidLearningResetEpoch(input.expectedResetEpoch)) {
    throw new Error("Expected learning reset epoch is invalid.");
  }
  const now = input.now ?? (() => new Date());
  const requestStartedAt = now().getTime();
  if (Number.isNaN(requestStartedAt)) {
    throw new Error("Learning projection client clock is invalid.");
  }
  // A V1/V2 cursor may describe a different representation at the same
  // sequence. Only an exact V3 cache may authorize a V3 304 response.
  const cached = await readValidCachedNormalizedLearningProjectionV3(
    input.expectedOwnerGeneration,
    input.expectedResetEpoch,
  );
  const currentOrigin = input.origin
    ?? (typeof location === "undefined" ? null : location.origin);
  if (!currentOrigin) {
    throw new Error("Current origin is required for learning projection fetch.");
  }
  const origin = new URL(currentOrigin).origin;
  const endpoint = new URL(NORMALIZED_LEARNING_PROJECTION_ENDPOINT, origin);
  if (
    endpoint.origin !== origin
    || endpoint.pathname !== NORMALIZED_LEARNING_PROJECTION_ENDPOINT
    || endpoint.username
    || endpoint.password
  ) {
    throw new Error("Learning projection endpoint must remain same-origin.");
  }
  if (cached) endpoint.searchParams.set(
    "afterCursor",
    String(cached.value.cursor),
  );

  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(
      `${endpoint.pathname}${endpoint.search}`,
      {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
        headers: { Accept: LEARNING_PROJECTION_V3_MEDIA_TYPE },
      },
    );
  } catch {
    return retryableV3(null, "network-unavailable");
  }

  if (response.status === 401 || response.status === 409) {
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason: response.status === 401
        ? "authentication-required"
        : "content-unavailable",
    };
  }
  if (response.status === 429) {
    return retryableV3(
      response.status,
      "rate-limited",
      retryAfterMs(response.headers.get("Retry-After"), requestStartedAt),
    );
  }
  if (response.status >= 500 && response.status <= 599) {
    return retryableV3(response.status, "server-unavailable");
  }

  const headers = responseEpochAndCursor(response);
  const responseVersion = safeNonNegativeInteger(
    response.headers.get(LEARNING_PROJECTION_VERSION_HEADER),
  );
  if (response.status === 304) {
    if (
      headers.resetEpoch !== null
      && headers.resetEpoch !== input.expectedResetEpoch
    ) {
      return {
        state: "reset-mismatch",
        expectedResetEpoch: input.expectedResetEpoch,
        serverResetEpoch: headers.resetEpoch,
      };
    }
    if (
      !cached
      || responseVersion !== LEARNING_PROJECTION_V3_PROTOCOL_VERSION
      || headers.resetEpoch !== input.expectedResetEpoch
      || headers.cursor !== cached.value.cursor
    ) {
      return retryableV3(response.status, "invalid-response");
    }
    const currentCached = await readValidCachedNormalizedLearningProjectionV3(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    );
    if (!currentCached || currentCached.value.cursor !== headers.cursor) {
      return retryableV3(response.status, "invalid-response");
    }
    return { state: "not-modified", projection: currentCached.value };
  }

  if (response.status !== 200) {
    return response.status >= 400 && response.status <= 499
      ? {
          state: "permanent-unavailable",
          status: response.status,
          reason: "request-rejected",
        }
      : retryableV3(response.status, "invalid-response");
  }

  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    return retryableV3(response.status, "invalid-response");
  }
  const parsed = parseNormalizedLearningProjectionV3(body);
  if (!parsed.ok) return retryableV3(response.status, "invalid-response");
  const projection = parsed.projection;
  if (projection.resetEpoch !== input.expectedResetEpoch) {
    return {
      state: "reset-mismatch",
      expectedResetEpoch: input.expectedResetEpoch,
      serverResetEpoch: projection.resetEpoch,
    };
  }
  if (
    responseVersion !== LEARNING_PROJECTION_V3_PROTOCOL_VERSION
    || projection.contentVersion !== CONTENT_VERSION
    || projection.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || headers.resetEpoch !== projection.resetEpoch
    || headers.cursor !== projection.cursor
    || (cached !== null && projection.cursor < cached.value.cursor)
  ) {
    return retryableV3(response.status, "invalid-response");
  }

  const v2Projection = toNormalizedLearningProjectionV2(projection);
  const cacheWrite = await writeLearningProjectionBatchWithMonotonicCursor<
    | NormalizedLearningProjectionV1
    | NormalizedLearningProjectionV2
    | NormalizedLearningProjectionV3
  >(
    {
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.expectedResetEpoch,
      entries: [{
        entryKey: NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
        value: toNormalizedLearningProjectionV1(projection),
      }, {
        entryKey: NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
        value: v2Projection,
      }, {
        entryKey: NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
        value: projection,
      }],
      updatedAt: new Date(requestStartedAt).toISOString(),
    },
    (entryKey, value) => validCachedProjectionCursor(
      entryKey,
      value,
      input.expectedResetEpoch,
    ),
  );
  if (!cacheWrite.written) {
    const current = await readValidCachedNormalizedLearningProjectionV3(
      input.expectedOwnerGeneration,
      input.expectedResetEpoch,
    );
    return current && current.value.cursor >= projection.cursor
      ? { state: "not-modified", projection: current.value }
      : retryableV3(response.status, "invalid-response");
  }
  return { state: "updated", projection };
}

export async function fetchNormalizedLearningProjectionV3(
  input: FetchNormalizedLearningProjectionInput,
): Promise<FetchNormalizedLearningProjectionV3Result> {
  const lockManager = typeof navigator === "undefined"
    ? null
    : navigator.locks;
  if (!lockManager) return fetchNormalizedLearningProjectionV3Unlocked(input);
  return lockManager.request(
    NORMALIZED_LEARNING_PROJECTION_LOCK_NAME,
    { mode: "exclusive" },
    () => fetchNormalizedLearningProjectionV3Unlocked(input),
  );
}
