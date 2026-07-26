import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import {
  ReviewQueueIntegrityError,
  ReviewQueueRepository,
  ReviewQueueResetRaceError,
  ReviewQueueUnavailableError,
} from "../../../../src/server/reviewQueueRepository";
import { SyncRepository } from "../../../../src/server/syncRepository";
import {
  noStoreJsonHeaders,
  type SyncApiError,
} from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { ...noStoreJsonHeaders, ...headers },
  });

const requestIdentifier = (request: Request) => {
  const provided = request.headers.get("x-request-id")?.trim();
  return provided && provided.length <= 120
    ? provided
    : crypto.randomUUID();
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

export async function GET(request: Request) {
  const requestId = requestIdentifier(request);
  try {
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Sign in before reading the server review queue.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const queue = await new ReviewQueueRepository(database).read(userId);
    return json(queue, 200, { "x-request-id": requestId });
  } catch (error) {
    if (error instanceof ReviewQueueUnavailableError) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    if (error instanceof ReviewQueueResetRaceError) {
      return errorResponse(409, error.code, error.message, requestId, true);
    }
    if (error instanceof ReviewQueueIntegrityError) {
      return errorResponse(
        500,
        error.code,
        "Stored review state failed integrity validation.",
        requestId,
        true,
      );
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "review_queue_read_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "REVIEW_QUEUE_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Unable to read the server review queue.",
      requestId,
      true,
    );
  }
}

export async function HEAD(request: Request) {
  const response = await GET(request);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
