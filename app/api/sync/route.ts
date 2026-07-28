import { getChatGPTUser } from "../../chatgpt-auth";
import { CONTENT_VERSION } from "../../../src/data/curriculum";
import { isStartingLevel } from "../../../src/learning/startingLevels";
import { deriveAccountKey } from "../../../src/lib/accountKey";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { getD1Database, SyncBackendUnavailableError } from "../../../src/server/d1";
import {
  deriveTrustedLearningExposure,
  enforceAuthoritativeLearningDocument,
} from "../../../src/server/learningIntegrity";
import {
  consumeMutationRateLimit,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
  SYNC_PUSH_MUTATION_POLICY,
} from "../../../src/server/mutationRateLimit";
import { SyncRepository } from "../../../src/server/syncRepository";
import { mergeSyncDocuments } from "../../../src/sync/document";
import {
  hasValidSyncOperationHash,
  noStoreJsonHeaders,
  parseSyncPushOperation,
  SYNC_PROTOCOL_VERSION,
  type SyncApiError,
  type SyncPushOperationV1,
  type SyncPushResponseV1,
} from "../../../src/sync/protocol";
import type { CloudSyncDocumentV1, SyncConflict } from "../../../src/sync/types";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 1_500_000;
const MAX_CAS_ATTEMPTS = 8;
const MAX_CLOCK_COUNTER = Number.MAX_SAFE_INTEGER;
const MAX_RESET_EPOCH = 2_147_483_647;
const MAX_AGGREGATE_VALUE = 1_000_000_000;
const MAX_SAVED_WORDS = 10_000;
const MAX_COMPLETED_LESSONS = 5_000;
const MAX_FSRS_CARDS = 20_000;
const MAX_KNOWLEDGE_ITEMS = 20_000;
const MAX_MISTAKES = 5_000;

type AuthorizedContext = {
  database: Awaited<ReturnType<typeof getD1Database>>;
  repository: SyncRepository;
  userId: string;
  accountKey: string;
};

const json = (body: unknown, status = 200, extraHeaders?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { ...noStoreJsonHeaders, ...extraHeaders },
  });

const errorResponse = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  retryable = false,
  extraHeaders?: HeadersInit,
) => json({
  error: { code, message, requestId, retryable },
} satisfies SyncApiError, status, {
  "x-request-id": requestId,
  ...extraHeaders,
});

const requestIdentifier = (request: Request) => {
  const forwarded = request.headers.get("x-request-id")?.trim();
  return forwarded && forwarded.length <= 120
    ? forwarded
    : crypto.randomUUID();
};

async function authorize(): Promise<AuthorizedContext | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const database = await getD1Database();
  const repository = new SyncRepository(database);
  const userId = await repository.resolveUser(identity);
  return {
    database,
    repository,
    userId,
    accountKey: await deriveAccountKey(identity.email),
  };
}

const sameOriginMutation = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasAtMostKeys = (value: unknown, maximum: number) =>
  isRecord(value) && Object.keys(value).length <= maximum;

const isBoundedCounter = (value: unknown, maximum = MAX_CLOCK_COUNTER) =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;

const isSyncClock = (value: unknown) => isRecord(value)
  && isBoundedCounter(value.counter)
  && typeof value.operationId === "string"
  && value.operationId.length > 0
  && value.operationId.length <= 160
  && typeof value.observedAt === "string"
  && value.observedAt.length <= 40
  && Number.isFinite(Date.parse(value.observedAt));

const validateDocumentBounds = (document: CloudSyncDocumentV1) => {
  if (
    !isSyncClock(document.clock)
    || !isRecord(document.reset)
    || !isBoundedCounter(document.reset.epoch, MAX_RESET_EPOCH)
    || !isSyncClock(document.reset.clock)
    || !isRecord(document.profile)
    || !isSyncClock(document.profile.clock)
    || !isRecord(document.profile.value)
    || !isRecord(document.diagnostic)
    || !isSyncClock(document.diagnostic.clock)
    || !isRecord(document.diagnostic.value)
    || !isRecord(document.legacyXpBaseline)
    || !isSyncClock(document.legacyXpBaseline.clock)
    || !isBoundedCounter(document.legacyXpBaseline.value, MAX_AGGREGATE_VALUE)
  ) {
    return "Cloud document clocks or reset marker are invalid.";
  }

  const profile = document.profile.value;
  if (
    typeof profile.name !== "string"
    || profile.name.length > 120
    || !(["conversation", "hsk", "career", "travel"] as const).includes(
      profile.goal as "conversation",
    )
    || !([10, 20, 30] as const).includes(profile.dailyMinutes as 10)
    || !(["simplified", "traditional"] as const).includes(
      profile.script as "simplified",
    )
    || !isStartingLevel(profile.startingLevel)
    || typeof profile.onboarded !== "boolean"
  ) {
    return "Profile projection is invalid.";
  }

  if (!hasAtMostKeys(document.savedWords, MAX_SAVED_WORDS)) {
    return "Saved-word tombstones exceed the sync limit.";
  }
  for (const [wordId, entry] of Object.entries(document.savedWords)) {
    if (
      wordId.length === 0
      || wordId.length > 160
      || !isRecord(entry)
      || typeof entry.present !== "boolean"
      || !isSyncClock(entry.clock)
    ) {
      return "Saved-word tombstones are invalid.";
    }
  }

  const state = document.state;
  if (
    !hasAtMostKeys(state.completedLessons, MAX_COMPLETED_LESSONS)
    || !hasAtMostKeys(state.fsrsCards, MAX_FSRS_CARDS)
    || !hasAtMostKeys(state.knowledge, MAX_KNOWLEDGE_ITEMS)
    || !hasAtMostKeys(state.skillMastery, 7)
    || Object.values(state.skillMastery).some((score) =>
      typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100
    )
    || !Array.isArray(state.mistakes)
    || state.mistakes.length > MAX_MISTAKES
    || !Array.isArray(state.savedWords)
    || state.savedWords.length > MAX_SAVED_WORDS
    || !isBoundedCounter(state.xp, MAX_AGGREGATE_VALUE)
    || !isBoundedCounter(state.dailyXp, MAX_AGGREGATE_VALUE)
    || !isBoundedCounter(state.streak, MAX_AGGREGATE_VALUE)
    || !isBoundedCounter(state.reviewCount, MAX_AGGREGATE_VALUE)
  ) {
    return "Learning projection contains invalid or excessive collections.";
  }
  return null;
};

const isEmptyResetProjection = (document: CloudSyncDocumentV1) => {
  const state = document.state;
  return Object.keys(document.savedWords).length === 0
    && document.legacyXpBaseline.value === 0
    && state.xp === 0
    && state.dailyXp === 0
    && state.streak === 0
    && state.reviewCount === 0
    && Object.keys(state.completedLessons).length === 0
    && state.savedWords.length === 0
    && Object.keys(state.fsrsCards).length === 0
    && Object.keys(state.knowledge).length === 0
    && state.mistakes.length === 0
    && state.activityLog.length === 0
    && state.evidence.length === 0
    && Object.values(state.skillMastery).every((score) => score === 0);
};

const validateResetTransition = (
  stored: CloudSyncDocumentV1 | null,
  operation: SyncPushOperationV1,
) => {
  const serverEpoch = stored?.reset.epoch ?? 0;
  const incomingEpoch = operation.document.reset.epoch;
  if (operation.kind === "reset") {
    if (incomingEpoch !== serverEpoch + 1) {
      return "Reset epoch must advance the current server epoch exactly once.";
    }
    if (!isEmptyResetProjection(operation.document)) {
      return "Reset operations must contain an empty learning projection.";
    }
    return null;
  }
  if (incomingEpoch > serverEpoch) {
    return "Only an explicit reset operation may advance the reset epoch.";
  }
  return null;
};

const removeStoredImmutableCollisions = (
  stored: CloudSyncDocumentV1,
  incoming: CloudSyncDocumentV1,
): CloudSyncDocumentV1 => {
  if (stored.reset.epoch !== incoming.reset.epoch) return incoming;
  const storedEvidenceKeys = new Set(
    stored.state.evidence.map((item) => item.idempotencyKey),
  );
  const storedActivityIds = new Set(
    stored.state.activityLog.map((item) => item.id),
  );
  return {
    ...incoming,
    state: {
      ...incoming.state,
      evidence: incoming.state.evidence.filter(
        (item) => !storedEvidenceKeys.has(item.idempotencyKey),
      ),
      activityLog: incoming.state.activityLog.filter(
        (item) => !storedActivityIds.has(item.id),
      ),
    },
  };
};

const enforceStoredDocument = (stored: CloudSyncDocumentV1) => {
  const trustedExposure = deriveTrustedLearningExposure(stored);
  return {
    document: enforceAuthoritativeLearningDocument(stored, {
      trustedExposure,
    }).document,
    trustedExposure,
  };
};

export async function GET(request: Request) {
  const requestId = requestIdentifier(request);
  try {
    const context = await authorize();
    if (!context) {
      return errorResponse(401, "AUTH_REQUIRED", "Đăng nhập ChatGPT để đồng bộ tiến độ.", requestId);
    }
    const [stored, cursor] = await Promise.all([
      context.repository.getLearningDocument(context.userId),
      context.repository.getLatestCursor(context.userId),
    ]);
    const document = stored
      ? enforceStoredDocument(stored.document).document
      : null;
    return json({
      protocolVersion: SYNC_PROTOCOL_VERSION,
      revision: stored?.revision ?? 0,
      cursor,
      document,
    }, 200, { "x-request-id": requestId });
  } catch (error) {
    return handleUnexpectedError(error, requestId, "pull");
  }
}

export async function POST(request: Request) {
  const requestId = requestIdentifier(request);
  try {
    if (!sameOriginMutation(request)) {
      return errorResponse(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu đồng bộ khác nguồn đã bị chặn.", requestId);
    }
    const context = await authorize();
    if (!context) {
      return errorResponse(401, "AUTH_REQUIRED", "Đăng nhập ChatGPT để đồng bộ tiến độ.", requestId);
    }
    const rateLimit = await consumeMutationRateLimit(
      context.database,
      context.userId,
      SYNC_PUSH_MUTATION_POLICY,
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "MUTATION_RATE_LIMITED",
        "Quá nhiều yêu cầu đẩy đồng bộ; dữ liệu vẫn còn trong hàng đợi trên thiết bị.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(415, "JSON_REQUIRED", "Cloud sync chỉ nhận application/json.", requestId);
    }
    const body = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return errorResponse(413, "SYNC_PAYLOAD_TOO_LARGE", "Gói tiến độ vượt giới hạn đồng bộ.", requestId);
    }
    const raw = body.text;

    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return errorResponse(400, "INVALID_JSON", "Không thể đọc gói đồng bộ JSON.", requestId);
    }
    const parsed = parseSyncPushOperation(input);
    if (!parsed.ok) {
      return errorResponse(422, "INVALID_SYNC_OPERATION", parsed.reason, requestId);
    }
    const operation = parsed.operation;
    if (
      !Number.isSafeInteger(operation.deviceSequence)
      || !Number.isSafeInteger(operation.baseRevision)
    ) {
      return errorResponse(422, "INVALID_SYNC_OPERATION", "Device sequence or base revision exceeds the safe range.", requestId);
    }
    if (
      operation.contentVersion !== CONTENT_VERSION
      || operation.document.state.contentVersion !== CONTENT_VERSION
      || operation.contentVersion !== operation.document.state.contentVersion
      || operation.document.state.evidence.some((evidence) =>
        evidence.contentVersion !== CONTENT_VERSION
      )
    ) {
      return errorResponse(409, "CONTENT_VERSION_UNSUPPORTED", "Phiên bản nội dung của gói đồng bộ không được máy chủ hỗ trợ.", requestId);
    }
    const boundsError = validateDocumentBounds(operation.document);
    if (boundsError) {
      return errorResponse(422, "SYNC_DOCUMENT_OUT_OF_BOUNDS", boundsError, requestId);
    }
    if (!await hasValidSyncOperationHash(operation)) {
      return errorResponse(422, "REQUEST_HASH_MISMATCH", "Dấu kiểm toàn vẹn của gói đồng bộ không khớp.", requestId);
    }

    if (operation.ownerKey !== context.accountKey) {
      return errorResponse(403, "OWNER_MISMATCH", "Gói tiến độ không thuộc tài khoản đang đăng nhập.", requestId);
    }
    const deviceRecordId = await context.repository.upsertDevice(
      context.userId,
      operation,
      0,
    );
    const claim = await context.repository.claimIdempotency(
      context.userId,
      operation,
      deviceRecordId,
    );
    if (claim.kind === "hash-conflict") {
      return errorResponse(409, "IDEMPOTENCY_CONFLICT", "Khóa thao tác đã được dùng với dữ liệu khác.", requestId);
    }
    if (claim.kind === "sequence-conflict") {
      return errorResponse(409, "DEVICE_SEQUENCE_CONFLICT", "Thiết bị đã dùng số thứ tự này cho thao tác khác.", requestId);
    }
    if (claim.kind === "in-flight") {
      return errorResponse(
        409,
        "SYNC_OPERATION_IN_FLIGHT",
        `Thao tác đang được xử lý; hãy thử lại sau ${Math.ceil(claim.retryAfterMs / 1_000)} giây.`,
        requestId,
        true,
      );
    }
    if (claim.kind === "duplicate") {
      const prior = JSON.parse(claim.responseJson) as SyncPushResponseV1;
      const [stored, latestCursor] = await Promise.all([
        context.repository.getLearningDocument(context.userId),
        context.repository.getLatestCursor(context.userId),
      ]);
      if (!stored) throw new Error("Completed sync operation has no canonical document.");
      const currentDocument = enforceStoredDocument(stored.document).document;
      const currentResponse: SyncPushResponseV1 = {
        ...prior,
        protocolVersion: SYNC_PROTOCOL_VERSION,
        acceptedOperationId: operation.operationId,
        duplicate: true,
        revision: stored.revision,
        cursor: latestCursor,
        document: currentDocument,
      };
      return json(currentResponse, 200, {
        "x-request-id": requestId,
        ...mutationRateLimitHeaders(rateLimit),
      });
    }

    const alreadyApplied = await context.repository.getAppliedOperation(
      context.userId,
      operation.operationId,
    );
    if (alreadyApplied) {
      const [stored, latestCursor] = await Promise.all([
        context.repository.getLearningDocument(context.userId),
        context.repository.getLatestCursor(context.userId),
      ]);
      if (!stored) throw new Error("Applied sync operation has no canonical document.");
      const recoveredDocument = enforceStoredDocument(stored.document).document;
      await Promise.all([
        context.repository.updateProfileProjection(
          context.userId,
          recoveredDocument,
          stored.revision,
        ),
        context.repository.upsertDevice(context.userId, operation, latestCursor),
        context.repository.recordLocalImport(
          context.userId,
          claim.recordId,
          operation,
        ),
      ]);
      const recoveredResponse: SyncPushResponseV1 = {
        protocolVersion: SYNC_PROTOCOL_VERSION,
        acceptedOperationId: operation.operationId,
        duplicate: true,
        revision: stored.revision,
        cursor: latestCursor,
        document: recoveredDocument,
        conflicts: [],
      };
      await context.repository.completeIdempotency(
        claim.recordId,
        claim.leaseToken,
        JSON.stringify(recoveredResponse),
      );
      return json(recoveredResponse, 200, {
        "x-request-id": requestId,
        ...mutationRateLimitHeaders(rateLimit),
      });
    }

    let canonical: CloudSyncDocumentV1 | null = null;
    let revision = 0;
    let cursor = 0;
    let conflicts: SyncConflict[] = [];
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
      const stored = await context.repository.getLearningDocument(context.userId);
      const resetError = validateResetTransition(stored?.document ?? null, operation);
      if (resetError) {
        await context.repository.failIdempotency(claim.recordId, claim.leaseToken);
        return errorResponse(409, "RESET_EPOCH_CONFLICT", resetError, requestId);
      }
      const storedIntegrity = stored
        ? enforceStoredDocument(stored.document)
        : null;
      const authoritativeStored = storedIntegrity?.document ?? null;
      const trustedExposure = storedIntegrity
        && operation.document.reset.epoch <= storedIntegrity.document.reset.epoch
        ? storedIntegrity.trustedExposure
        : undefined;
      const authoritativeIncoming = enforceAuthoritativeLearningDocument(
        operation.document,
        { trustedExposure },
      ).document;
      const mergeIncoming = authoritativeStored
        ? removeStoredImmutableCollisions(authoritativeStored, authoritativeIncoming)
        : authoritativeIncoming;
      const merged = authoritativeStored
        ? mergeSyncDocuments(authoritativeStored, mergeIncoming)
        : { document: authoritativeIncoming, conflicts: [] };
      const authoritativeMerged = enforceAuthoritativeLearningDocument(
        merged.document,
        { trustedExposure },
      ).document;
      const committed = await context.repository.compareAndSwapDocumentAndAppendChange(
        context.userId,
        stored?.revision ?? 0,
        authoritativeMerged,
        operation,
      );
      if (committed !== null) {
        canonical = authoritativeMerged;
        conflicts = merged.conflicts;
        revision = committed.revision;
        cursor = committed.cursor;
        break;
      }
    }
    if (!canonical) {
      await context.repository.failIdempotency(claim.recordId, claim.leaseToken);
      return errorResponse(409, "SYNC_CONTENTION", "Tiến độ vừa thay đổi ở thiết bị khác; hãy thử đồng bộ lại.", requestId, true);
    }

    await context.repository.updateProfileProjection(
      context.userId,
      canonical,
      revision,
    );
    await Promise.all([
      context.repository.upsertDevice(context.userId, operation, cursor),
      context.repository.recordLocalImport(
        context.userId,
        claim.recordId,
        operation,
      ),
    ]);
    const response: SyncPushResponseV1 = {
      protocolVersion: SYNC_PROTOCOL_VERSION,
      acceptedOperationId: operation.operationId,
      duplicate: false,
      revision,
      cursor,
      document: canonical,
      conflicts: conflicts.slice(0, 50).map(({ collection, key, reason }) => ({
        collection,
        key,
        reason,
      })),
    };
    await context.repository.completeIdempotency(
      claim.recordId,
      claim.leaseToken,
      JSON.stringify(response),
    );
    return json(response, 200, {
      "x-request-id": requestId,
      ...mutationRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    return handleUnexpectedError(error, requestId, "push");
  }
}

function handleUnexpectedError(error: unknown, requestId: string, operation: string) {
  if (error instanceof MutationRateLimitBackendError) {
    return errorResponse(
      503,
      error.code,
      "Không thể xác minh giới hạn đẩy đồng bộ an toàn lúc này.",
      requestId,
      true,
    );
  }
  const unavailable = error instanceof SyncBackendUnavailableError;
  console.error(JSON.stringify({
    level: "error",
    event: "learning_sync_failed",
    operation,
    requestId,
    errorName: error instanceof Error ? error.name : "UnknownError",
  }));
  return errorResponse(
    unavailable ? 503 : 500,
    unavailable ? error.code : "SYNC_INTERNAL_ERROR",
    unavailable
      ? error.message
      : "Cloud sync gặp lỗi tạm thời; dữ liệu vẫn còn trong hàng đợi trên thiết bị.",
    requestId,
    true,
  );
}
