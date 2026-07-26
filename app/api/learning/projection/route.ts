import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import {
  LearningProjectionContentUnavailableError,
  LearningProjectionIntegrityError,
  LearningProjectionRepository,
  LearningProjectionResetRaceError,
} from "../../../../src/server/learningProjectionRepository";
import { SyncRepository } from "../../../../src/server/syncRepository";
import {
  noStoreJsonHeaders,
  type SyncApiError,
} from "../../../../src/sync/protocol";
import {
  LEARNING_PROJECTION_V2_MEDIA_TYPE,
  LEARNING_PROJECTION_V2_PROTOCOL_VERSION,
  LEARNING_PROJECTION_V3_MEDIA_TYPE,
  LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
  LEARNING_PROJECTION_VERSION_HEADER,
} from "../../../../src/learning/projectionProtocol";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { ...noStoreJsonHeaders, ...headers },
  });

const requestIdentifier = (request: Request) => {
  const provided = request.headers.get("x-request-id")?.trim();
  return provided && provided.length <= 120 ? provided : crypto.randomUUID();
};

const errorResponse = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  retryable = false,
) => json({
  error: { code, message, requestId, retryable },
} satisfies SyncApiError, status, { "x-request-id": requestId });

const parseAfterCursor = (url: URL) => {
  if (
    [...url.searchParams.keys()].some((key) => key !== "afterCursor")
    || url.searchParams.getAll("afterCursor").length > 1
  ) return { ok: false as const };
  const raw = url.searchParams.get("afterCursor");
  if (raw === null) return { ok: true as const, afterCursor: null };
  if (!/^(0|[1-9]\d*)$/u.test(raw)) return { ok: false as const };
  const afterCursor = Number(raw);
  return Number.isSafeInteger(afterCursor) && afterCursor >= 0
    ? { ok: true as const, afterCursor }
    : { ok: false as const };
};

const projectionHeaders = (
  protocolVersion: 1 | 2 | 3,
  resetEpoch: number,
  cursor: number,
  requestId: string,
) => ({
  ...noStoreJsonHeaders,
  etag: `"hanzi-learning-v${protocolVersion}-${resetEpoch}-${cursor}"`,
  vary: "Accept",
  [LEARNING_PROJECTION_VERSION_HEADER]: String(protocolVersion),
  "x-learning-projection-cursor": String(cursor),
  "x-learning-reset-epoch": String(resetEpoch),
  "x-request-id": requestId,
});

const requestedProjectionVersion = (request: Request): 1 | 2 | 3 => {
  const mediaTypes = (request.headers.get("accept") ?? "")
    .split(",")
    .map((value) => value.trim().split(";", 1)[0]?.toLowerCase());
  if (mediaTypes.includes(LEARNING_PROJECTION_V3_MEDIA_TYPE)) {
    return LEARNING_PROJECTION_V3_PROTOCOL_VERSION;
  }
  return mediaTypes.includes(LEARNING_PROJECTION_V2_MEDIA_TYPE)
    ? LEARNING_PROJECTION_V2_PROTOCOL_VERSION
    : 1;
};

export async function GET(request: Request) {
  const requestId = requestIdentifier(request);
  const protocolVersion = requestedProjectionVersion(request);
  const parsedCursor = parseAfterCursor(new URL(request.url));
  if (!parsedCursor.ok) {
    return errorResponse(
      400,
      "INVALID_PROJECTION_CURSOR",
      "Projection cursor must be one non-negative safe integer.",
      requestId,
    );
  }

  try {
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Đăng nhập ChatGPT để tải tiến độ học có thẩm quyền.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const repository = new LearningProjectionRepository(database);
    const projection = protocolVersion === LEARNING_PROJECTION_V3_PROTOCOL_VERSION
      ? await repository.readV3(userId)
      : protocolVersion === LEARNING_PROJECTION_V2_PROTOCOL_VERSION
        ? await repository.readV2(userId)
        : await repository.read(userId);
    const headers = projectionHeaders(
      protocolVersion,
      projection.resetEpoch,
      projection.cursor,
      requestId,
    );
    // A missing/paused release binding must replace any cached projection even
    // when no normalized command advanced the cursor.
    if (
      projection.enrollment !== null
      && parsedCursor.afterCursor === projection.cursor
    ) {
      return new Response(null, { status: 304, headers });
    }
    return json(projection, 200, headers);
  } catch (error) {
    if (error instanceof LearningProjectionContentUnavailableError) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    if (error instanceof LearningProjectionResetRaceError) {
      return errorResponse(503, error.code, error.message, requestId, true);
    }
    if (error instanceof LearningProjectionIntegrityError) {
      console.error(JSON.stringify({
        level: "error",
        event: "learning_projection_integrity_failed",
        requestId,
        errorName: error.name,
      }));
      return errorResponse(
        503,
        error.code,
        "Không thể dựng projection học tập an toàn từ dữ liệu hiện tại.",
        requestId,
        true,
      );
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "learning_projection_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "LEARNING_PROJECTION_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Không thể tải projection học tập lúc này.",
      requestId,
      true,
    );
  }
}
